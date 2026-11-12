-- נפל האסימון: accounts, profile details, tutor approval and admin.
-- Run AFTER schema.sql, moderation.sql and contact.sql. Safe to run more than once.

-- 1. Profile details: birth date and area are optional. Email can't be changed from the app and
--    a birth date, once set, is locked (admins can still fix it).
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists area text;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'profile_done') then
    alter table public.profiles add column profile_done boolean not null default false;
    update public.profiles set profile_done = true; -- people who already signed up are not asked again
  end if;
end $$;
alter table public.profiles drop constraint if exists profiles_birth_ok;
alter table public.profiles add constraint profiles_birth_ok check (birth_date is null or birth_date between date '1900-01-01' and date '2100-01-01');

-- Admin = a profile flagged is_admin, or the confirmed site mailbox.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
      or exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null
                 and lower(u.email) = 'nafalaasimon@gmail.com');
$$;

create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() or current_setting('app.bypass', true) = 'on' then return new; end if;
  new.id := old.id; new.email := old.email; new.is_admin := old.is_admin;
  if old.birth_date is not null then new.birth_date := old.birth_date; end if;
  return new;
end $$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_fields();

-- 2. A tutor can't join their own group.
create or replace function public.join_group(g uuid, p_name text, p_phone text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare cap int; jm text; taken int; st text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select max_seats, join_mode into cap, jm from public.groups where id = g for update;
  if cap is null then raise exception 'group not found'; end if;
  if exists (select 1 from public.groups gr join public.tutors t on t.id = gr.tutor_id where gr.id = g and t.owner_id = auth.uid()) then
    raise exception 'cannot join your own group';
  end if;
  if exists (select 1 from public.group_seats where group_id = g and user_id = auth.uid() and status <> 'declined') then
    raise exception 'duplicate';
  end if;
  select count(*) into taken from public.group_seats where group_id = g and status = 'approved';
  if taken >= cap then raise exception 'group full'; end if;
  st := case when jm = 'approval' then 'pending' else 'approved' end;
  delete from public.group_seats where group_id = g and user_id = auth.uid();
  insert into public.group_seats (group_id, user_id, name, phone, note, status)
  values (g, auth.uid(), p_name, p_phone, p_note, st);
  return st;
end $$;

-- 3. Tutor approval: a new tutor profile is hidden from the public until an admin approves it.
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tutors' and column_name = 'approval') then
    alter table public.tutors add column approval text not null default 'pending' check (approval in ('pending', 'approved', 'rejected'));
    update public.tutors set approval = 'approved'; -- everyone already on the site stays visible
  end if;
end $$;
alter table public.tutors add column if not exists reject_reason text;
alter table public.tutor_contacts add column if not exists birth_date date;
alter table public.tutor_contacts add column if not exists address text;

create or replace function public.tutor_is_public(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tutors where id = t and approval = 'approved');
$$;

create or replace function public.protect_tutor_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or current_setting('app.bypass', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.verified := false; new.contact_count := 0; new.owner_id := auth.uid(); new.approval := 'pending'; new.reject_reason := null;
    if coalesce(btrim(new.photo), '') = '' then raise exception 'tutor details required: photo'; end if;
  else
    new.verified := old.verified; new.contact_count := old.contact_count; new.owner_id := old.owner_id;
    new.reject_reason := old.reject_reason;
    -- A rejected tutor who edits the profile goes back to the queue; an approved one stays approved.
    new.approval := case when old.approval = 'rejected' then 'pending' else old.approval end;
    if coalesce(btrim(new.photo), '') = '' then raise exception 'tutor details required: photo'; end if;
  end if;
  return new;
end $$;

-- Private details are mandatory for every tutor who registers (admins adding example profiles are exempt).
create or replace function public.require_tutor_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or current_setting('app.bypass', true) = 'on' then return new; end if;
  if coalesce(btrim(new.phone), '') = '' or coalesce(btrim(new.address), '') = '' or new.birth_date is null then
    raise exception 'tutor details required: phone, address, birth date';
  end if;
  if new.birth_date > (current_date - interval '16 years') then raise exception 'tutor details required: age'; end if;
  return new;
end $$;
drop trigger if exists tutor_contacts_required on public.tutor_contacts;
create trigger tutor_contacts_required before insert or update on public.tutor_contacts for each row execute function public.require_tutor_contact();

drop policy if exists "tutors readable" on public.tutors;
create policy "tutors readable" on public.tutors for select
  using (approval = 'approved' or owner_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "groups readable" on public.groups;
create policy "groups readable" on public.groups for select using (public.tutor_is_public(tutor_id) or public.owns_tutor(tutor_id));

-- Admin decides: approve, or reject with a reason that the tutor sees.
create or replace function public.review_tutor(t uuid, p_approve boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.tutors set approval = case when p_approve then 'approved' else 'rejected' end,
    reject_reason = case when p_approve then null else nullif(btrim(p_reason), '') end where id = t;
end $$;
revoke execute on function public.review_tutor(uuid, boolean, text) from anon, public;
grant execute on function public.review_tutor(uuid, boolean, text) to authenticated;

-- 4. Sign-up form (email accounts): phone, birth date and area travel in the sign-up metadata and land in the profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); bd date; ph text;
begin
  begin bd := nullif(m->>'birth_date', '')::date; exception when others then bd := null; end;
  if bd is not null and (bd < date '1900-01-01' or bd > current_date) then bd := null; end if;
  ph := nullif(regexp_replace(coalesce(m->>'phone', ''), '[\s-]', '', 'g'), '');
  if ph is not null and length(ph) not between 7 and 20 then ph := null; end if;
  insert into public.profiles (id, name, email, avatar, phone, birth_date, area, profile_done)
  values (new.id,
          coalesce(nullif(btrim(m->>'full_name'), ''), nullif(btrim(m->>'name'), ''), split_part(new.email, '@', 1)),
          new.email, m->>'avatar_url', ph, bd, nullif(left(btrim(coalesce(m->>'area', '')), 80), ''),
          coalesce(m->>'signup_form', '') = 'true')
  on conflict (id) do nothing;
  return new;
end $$;
