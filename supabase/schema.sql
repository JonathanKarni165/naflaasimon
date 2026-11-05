-- נפל האסימון: database schema for Supabase (Postgres).
-- Run once in Supabase: SQL Editor → New query → paste this file → Run.

create extension if not exists pgcrypto;

-- Profiles: one row per signed-in Google account.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  avatar text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, avatar)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          new.email,
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Tutors: public profile. The phone number lives in tutor_contacts and is only
-- handed out by reveal_phone() to signed-in users.
create table if not exists public.tutors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  photo text,
  headline text,
  about text,
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  city text,
  area text,
  lat double precision,
  lng double precision,
  teaches_online boolean not null default true,
  teaches_frontal boolean not null default true,
  price_online integer check (price_online is null or price_online between 0 and 2000),
  price_frontal integer check (price_frontal is null or price_frontal between 0 and 2000),
  experience_years integer,
  verified boolean not null default false,
  contact_count integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists tutors_one_per_owner on public.tutors(owner_id) where owner_id is not null;

create table if not exists public.tutor_contacts (
  tutor_id uuid primary key references public.tutors(id) on delete cascade,
  phone text not null
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  rating smallint not null check (rating between 1 and 5),
  text text not null default '' check (length(text) <= 2000),
  created_at timestamptz not null default now(),
  unique (tutor_id, user_id)
);

create or replace view public.tutor_stats as
  select tutor_id, count(*)::int as rating_count, avg(rating)::float as rating_avg
  from public.reviews group by tutor_id;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  title text not null,
  subject text,
  level text,
  description text,
  start_date date not null,
  time text,
  sessions integer not null default 1,
  mode text not null default 'online' check (mode in ('online', 'frontal')),
  city text,
  location text,
  price_per_person integer not null check (price_per_person >= 0),
  max_seats integer not null check (max_seats between 1 and 200),
  created_at timestamptz not null default now()
);

create table if not exists public.group_seats (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create or replace view public.group_seat_counts as
  select group_id, count(*)::int as seats_taken from public.group_seats group by group_id;

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null,
  is_tutor boolean not null default false,
  text text not null check (length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- Helpers -------------------------------------------------------------------
create or replace function public.owns_tutor(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tutors where id = t and owner_id = auth.uid()) or public.is_admin();
$$;

-- Tutors cannot verify themselves or inflate their own inquiry count.
create or replace function public.protect_tutor_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or current_setting('app.bypass', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.verified := false; new.contact_count := 0; new.owner_id := auth.uid();
  else
    new.verified := old.verified; new.contact_count := old.contact_count; new.owner_id := old.owner_id;
  end if;
  return new;
end $$;
drop trigger if exists tutors_protect on public.tutors;
create trigger tutors_protect before insert or update on public.tutors
  for each row execute function public.protect_tutor_fields();

-- Signed-in users get the phone number; each reveal counts as one inquiry ("הכי מבוקש").
create or replace function public.reveal_phone(t uuid) returns text
language plpgsql security definer set search_path = public as $$
declare p text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select phone into p from public.tutor_contacts where tutor_id = t;
  perform set_config('app.bypass', 'on', true);
  update public.tutors set contact_count = contact_count + 1 where id = t;
  perform set_config('app.bypass', 'off', true);
  return p;
end $$;

-- Reserve a seat without overbooking: lock the group row, then count.
create or replace function public.join_group(g uuid, p_name text, p_phone text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare cap int; taken int;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select max_seats into cap from public.groups where id = g for update;
  if cap is null then raise exception 'group not found'; end if;
  select count(*) into taken from public.group_seats where group_id = g;
  if taken >= cap then raise exception 'group full'; end if;
  insert into public.group_seats (group_id, user_id, name, phone, note)
  values (g, auth.uid(), p_name, p_phone, p_note);
end $$;

-- Row level security ----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tutors enable row level security;
alter table public.tutor_contacts enable row level security;
alter table public.reviews enable row level security;
alter table public.groups enable row level security;
alter table public.group_seats enable row level security;
alter table public.group_messages enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

drop policy if exists "tutors readable" on public.tutors;
create policy "tutors readable" on public.tutors for select using (true);
drop policy if exists "tutors insert" on public.tutors;
create policy "tutors insert" on public.tutors for insert
  with check (public.is_admin() or (owner_id = auth.uid() and verified = false and contact_count = 0));
drop policy if exists "tutors update" on public.tutors;
create policy "tutors update" on public.tutors for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (public.is_admin() or owner_id = auth.uid());
drop policy if exists "tutors delete" on public.tutors;
create policy "tutors delete" on public.tutors for delete using (owner_id = auth.uid() or public.is_admin());

-- Only the tutor themself or an admin can read the phone directly (for editing).
drop policy if exists "contacts owner" on public.tutor_contacts;
create policy "contacts owner" on public.tutor_contacts for all
  using (public.owns_tutor(tutor_id)) with check (public.owns_tutor(tutor_id));

drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews for select using (true);
drop policy if exists "reviews insert" on public.reviews;
create policy "reviews insert" on public.reviews for insert with check (
  user_id = auth.uid()
  and not exists (select 1 from public.tutors t where t.id = tutor_id and t.owner_id = auth.uid()));
drop policy if exists "reviews update" on public.reviews;
create policy "reviews update" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "reviews delete" on public.reviews;
create policy "reviews delete" on public.reviews for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "groups readable" on public.groups;
create policy "groups readable" on public.groups for select using (true);
drop policy if exists "groups write" on public.groups;
create policy "groups write" on public.groups for all using (public.owns_tutor(tutor_id)) with check (public.owns_tutor(tutor_id));

-- Seats: you see your own; the group's tutor sees everyone who joined. Joining goes through join_group().
drop policy if exists "seats read" on public.group_seats;
create policy "seats read" on public.group_seats for select using (
  user_id = auth.uid() or exists (select 1 from public.groups g where g.id = group_id and public.owns_tutor(g.tutor_id)));
drop policy if exists "seats leave" on public.group_seats;
create policy "seats leave" on public.group_seats for delete using (
  user_id = auth.uid() or exists (select 1 from public.groups g where g.id = group_id and public.owns_tutor(g.tutor_id)));

drop policy if exists "messages readable" on public.group_messages;
create policy "messages readable" on public.group_messages for select using (true);
drop policy if exists "messages insert" on public.group_messages;
create policy "messages insert" on public.group_messages for insert with check (
  user_id = auth.uid()
  and (is_tutor = false or exists (select 1 from public.groups g where g.id = group_id and public.owns_tutor(g.tutor_id))));
drop policy if exists "messages delete" on public.group_messages;
create policy "messages delete" on public.group_messages for delete using (user_id = auth.uid() or public.is_admin());

-- Views read through the owner, so expose only aggregate columns.
grant select on public.tutor_stats, public.group_seat_counts to anon, authenticated;
grant execute on function public.reveal_phone(uuid), public.join_group(uuid, text, text, text) to authenticated;
revoke execute on function public.reveal_phone(uuid), public.join_group(uuid, text, text, text) from anon, public;

-- Photos bucket (public read; signed-in users upload).
insert into storage.buckets (id, name, public) values ('tutor-photos', 'tutor-photos', true)
  on conflict (id) do nothing;
drop policy if exists "photos upload" on storage.objects;
create policy "photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'tutor-photos');
drop policy if exists "photos read" on storage.objects;
create policy "photos read" on storage.objects for select using (bucket_id = 'tutor-photos');

-- Make yourself admin after your first Google sign-in (replace the email):
-- update public.profiles set is_admin = true where email = 'you@gmail.com';
