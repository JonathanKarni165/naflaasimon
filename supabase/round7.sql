-- QA round 7: sign-up and account rules (approved 2026-11-20). Safe to run again.

-- 1. Profile fields are checked on the server too, and the name cannot be unlocked by flipping profile_done back.
alter table public.profiles drop constraint if exists profiles_name_len;
alter table public.profiles add constraint profiles_name_len check (char_length(btrim(name)) between 2 and 60);
alter table public.profiles drop constraint if exists profiles_phone_chars;
alter table public.profiles add constraint profiles_phone_chars check (phone is null or phone ~ '^[0-9+ ()-]{7,20}$');
alter table public.profiles drop constraint if exists profiles_area_len;
alter table public.profiles add constraint profiles_area_len check (area is null or char_length(area) <= 80);

create or replace function public.protect_profile_fields()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null or public.is_admin() or current_setting('app.bypass', true) = 'on' then return new; end if;
  new.id := old.id; new.email := old.email; new.is_admin := old.is_admin;
  if old.birth_date is not null then new.birth_date := old.birth_date; end if;
  if new.birth_date is not null and (new.birth_date < date '1900-01-01' or new.birth_date > current_date - interval '5 years') then
    raise exception 'profile: birth_date' using errcode = '23514';
  end if;
  -- Setting up the account is one-way: profile_done can only go from false to true.
  if old.profile_done then new.profile_done := true; new.name := old.name; end if;
  -- Only Google photos or the site's own storage.
  if new.avatar is distinct from old.avatar and new.avatar is not null
     and new.avatar !~ '^https://([a-z0-9-]+\.)*googleusercontent\.com/'
     and new.avatar !~ '^https://chdzyvyvdypmjgupyrvg\.supabase\.co/storage/v1/object/public/' then
    new.avatar := old.avatar;
  end if;
  return new;
end $function$;

-- New accounts: keep the default name inside the limits (e.g. "a@x.com" or a very long Google name).
create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); bd date; ph text; nm text;
begin
  begin bd := nullif(m->>'birth_date', '')::date; exception when others then bd := null; end;
  if bd is not null and (bd < date '1900-01-01' or bd > current_date) then bd := null; end if;
  ph := nullif(regexp_replace(coalesce(m->>'phone', ''), '[\s-]', '', 'g'), '');
  if ph is not null and (length(ph) not between 7 and 20 or ph !~ '^[0-9+()]+$') then ph := null; end if;
  nm := left(coalesce(nullif(btrim(m->>'full_name'), ''), nullif(btrim(m->>'name'), ''), split_part(new.email, '@', 1)), 60);
  if char_length(btrim(nm)) < 2 then nm := 'משתמש חדש'; end if;
  insert into public.profiles (id, name, email, avatar, phone, birth_date, area, profile_done)
  values (new.id, nm, new.email, m->>'avatar_url', ph, bd, nullif(left(btrim(coalesce(m->>'area', '')), 80), ''),
          coalesce(m->>'signup_form', '') = 'true')
  on conflict (id) do nothing;
  return new;
end $function$;

-- Offensive names are blocked like everywhere else (phone numbers allowed: private field).
drop trigger if exists moderate on public.profiles;
create trigger moderate before insert or update on public.profiles
  for each row execute function public.moderate_content('name:private', 'area:private');

-- 2. One review per person: Gmail aliases (name+1@, n.a.m.e@) count as the same address.
create or replace function public.norm_email(e text) returns text
language sql immutable set search_path = '' as $$
  select case when split_part(lower(btrim(e)), '@', 2) in ('gmail.com', 'googlemail.com')
    then replace(split_part(split_part(lower(btrim(e)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else lower(btrim(e)) end
$$;

create or replace function public.can_review(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (exists (select 1 from public.inquiries q where q.tutor_id = t and q.user_id = auth.uid() and q.status <> 'declined')
       or exists (select 1 from public.group_seats s join public.groups g on g.id = s.group_id
                  where g.tutor_id = t and s.user_id = auth.uid() and coalesce(s.status, '') <> 'declined'))
     and not exists (select 1 from public.reviews r join public.profiles p on p.id = r.user_id
                     where r.tutor_id = t and r.user_id <> auth.uid()
                       and public.norm_email(p.email) = public.norm_email((select email from public.profiles where id = auth.uid())));
$$;

-- 3. Self-service account deletion (privacy page promised it by email; now also a button).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'login required'; end if;
  delete from public.tutors where owner_id = u;   -- a tutor profile would otherwise stay public without an owner
  delete from auth.users where id = u;            -- profile, inquiries, reviews, seats and chats go with it (on delete cascade)
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
