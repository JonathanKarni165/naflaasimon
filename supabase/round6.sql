-- QA round 6 (approved 2026-11-20). Safe to run again.
-- 1. Years of experience 0..60.
-- 2. A review needs a real contact with the tutor: an inquiry the tutor did not decline, or a seat in one of their groups.
-- 3. An approved tutor's new photo, headline or "about" text waits for the admin; the old one stays public meanwhile.

-- 1 ------------------------------------------------------------------------------------------------
update public.tutors set experience_years = least(greatest(experience_years, 0), 60)
  where experience_years < 0 or experience_years > 60;
alter table public.tutors drop constraint if exists tutors_experience_range;
alter table public.tutors add constraint tutors_experience_range check (experience_years is null or experience_years between 0 and 60);

-- 2 ------------------------------------------------------------------------------------------------
create or replace function public.can_review(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.inquiries q where q.tutor_id = t and q.user_id = auth.uid() and q.status <> 'declined')
      or exists (select 1 from public.group_seats s join public.groups g on g.id = s.group_id
                 where g.tutor_id = t and s.user_id = auth.uid() and coalesce(s.status, '') <> 'declined');
$$;
revoke all on function public.can_review(uuid) from public, anon;
grant execute on function public.can_review(uuid) to authenticated;

drop policy if exists "reviews insert" on public.reviews;
create policy "reviews insert" on public.reviews for insert with check (
  user_id = (select auth.uid())
  and not exists (select 1 from public.tutors t where t.id = reviews.tutor_id and t.owner_id = (select auth.uid()))
  and public.can_review(tutor_id)
);

-- 3 ------------------------------------------------------------------------------------------------
alter table public.tutors add column if not exists pending jsonb;

create or replace function public.protect_tutor_fields()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  ch jsonb := '{}'::jsonb;
begin
  if public.is_admin() or current_setting('app.bypass', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.verified := false; new.contact_count := 0; new.owner_id := auth.uid(); new.approval := 'pending'; new.reject_reason := null;
    new.pending := null;
    if coalesce(btrim(new.photo), '') = '' then raise exception 'tutor details required: photo'; end if;
  else
    new.verified := old.verified; new.contact_count := old.contact_count; new.owner_id := old.owner_id;
    new.reject_reason := old.reject_reason;
    new.approval := case when old.approval = 'rejected' then 'pending' else old.approval end;
    if coalesce(btrim(new.photo), '') = '' then raise exception 'tutor details required: photo'; end if;
    if old.approval = 'approved' then
      new.name := old.name;
      -- Changed public texts and photo wait for review; the approved version stays on the site.
      if new.photo is distinct from old.photo then ch := ch || jsonb_build_object('photo', new.photo); new.photo := old.photo; end if;
      if new.headline is distinct from old.headline then ch := ch || jsonb_build_object('headline', new.headline); new.headline := old.headline; end if;
      if new.about is distinct from old.about then ch := ch || jsonb_build_object('about', new.about); new.about := old.about; end if;
      new.pending := case when ch = '{}'::jsonb then old.pending else coalesce(old.pending, '{}'::jsonb) || ch end;
      -- A change back to the approved value is no longer pending.
      if new.pending is not null then
        if new.pending ? 'photo' and new.pending->>'photo' is not distinct from old.photo then new.pending := new.pending - 'photo'; end if;
        if new.pending ? 'headline' and new.pending->>'headline' is not distinct from old.headline then new.pending := new.pending - 'headline'; end if;
        if new.pending ? 'about' and new.pending->>'about' is not distinct from old.about then new.pending := new.pending - 'about'; end if;
        if new.pending = '{}'::jsonb then new.pending := null; end if;
      end if;
    else
      new.pending := null;
    end if;
  end if;
  return new;
end $function$;

-- Admin: publish or drop an approved tutor's waiting changes.
create or replace function public.review_tutor_changes(t uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_approve then
    update public.tutors set
      photo = coalesce(pending->>'photo', photo),
      headline = coalesce(pending->>'headline', headline),
      about = coalesce(pending->>'about', about),
      pending = null
    where id = t and pending is not null;
  else
    update public.tutors set pending = null where id = t;
  end if;
end $$;
revoke all on function public.review_tutor_changes(uuid, boolean) from public, anon;
grant execute on function public.review_tutor_changes(uuid, boolean) to authenticated;

-- Approving a whole profile also publishes anything waiting.
create or replace function public.review_tutor(t uuid, p_approve boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $function$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.tutors set approval = case when p_approve then 'approved' else 'rejected' end,
    reject_reason = case when p_approve then null else nullif(btrim(p_reason), '') end,
    photo = case when p_approve then coalesce(pending->>'photo', photo) else photo end,
    headline = case when p_approve then coalesce(pending->>'headline', headline) else headline end,
    about = case when p_approve then coalesce(pending->>'about', about) else about end,
    pending = null
  where id = t;
end $function$;

-- 4. Meeting links (Zoom, Google Meet, Teams) are allowed in text; every other link stays blocked.
-- Same rule as hasLink() in src/lib/moderation.js.
create or replace function public.mod_strip_meetings(t text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(coalesce(t, ''), '(https?://)?([a-z0-9-]+\.)*(zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com)(?=[/?#\s]|$)\S*', ' ', 'gi')
$$;
