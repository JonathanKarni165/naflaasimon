-- נפל האסימון: saved contact details + chat between student and tutor.
-- Run AFTER schema.sql (and moderation.sql if you use it). Safe to run more than once.

-- 1. Saved details on the account. profiles is readable only by its owner and admins
--    (policy "own profile" in schema.sql), so the phone stays private.
alter table public.profiles add column if not exists phone text;
alter table public.profiles drop constraint if exists profiles_phone_len;
alter table public.profiles add constraint profiles_phone_len check (phone is null or length(phone) between 7 and 20);
-- Fix: the old update policy read profiles inside a profiles policy ("infinite recursion"), so nobody
-- could save their own profile. is_admin() is security definer and reads the row without recursing.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and is_admin = (select public.is_admin()));

-- 2. Inquiries: the student picks how the tutor may reach them (site chat / phone / email).
--    A phone number is no longer required: someone who wants only the site chat gives none.
alter table public.inquiries alter column phone drop not null;
alter table public.inquiries drop constraint if exists inquiries_phone_check;
alter table public.inquiries drop constraint if exists inquiries_phone_len;
alter table public.inquiries add constraint inquiries_phone_len check (phone is null or length(phone) between 7 and 20);
alter table public.inquiries add column if not exists email text;
alter table public.inquiries drop constraint if exists inquiries_email_len;
alter table public.inquiries add constraint inquiries_email_len check (email is null or length(email) between 5 and 200);
alter table public.inquiries add column if not exists contact_via text[] not null default array['site'];
alter table public.inquiries drop constraint if exists inquiries_contact_via;
alter table public.inquiries add constraint inquiries_contact_via
  check (cardinality(contact_via) between 1 and 3 and contact_via <@ array['site', 'phone', 'email']);

-- 3. Chat on an inquiry. Only the student who sent it and the tutor (or an admin) see it.
create table if not exists public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  from_tutor boolean not null default false,
  text text not null check (length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists inquiry_messages_inquiry on public.inquiry_messages(inquiry_id, created_at);
create index if not exists inquiry_messages_sender on public.inquiry_messages(sender_id, created_at desc);

alter table public.inquiry_messages enable row level security;

create or replace function public.inquiry_party(q uuid, as_tutor boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.inquiries i
    where i.id = q and (
      (not as_tutor and i.user_id = (select auth.uid()))
      or (as_tutor and public.owns_tutor(i.tutor_id))
    )
  );
$$;

drop policy if exists "chat read" on public.inquiry_messages;
create policy "chat read" on public.inquiry_messages for select
  using (public.inquiry_party(inquiry_id, false) or public.inquiry_party(inquiry_id, true));
drop policy if exists "chat send" on public.inquiry_messages;
create policy "chat send" on public.inquiry_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.inquiry_party(inquiry_id, from_tutor));
-- No update/delete policies: messages can't be edited or removed by users.

-- First message from the tutor marks the inquiry as answered; also a simple flood limit.
create or replace function public.on_chat_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  new.created_at := now();
  if not public.is_admin() then
    select count(*) into n from public.inquiry_messages where sender_id = new.sender_id and created_at > now() - interval '1 minute';
    if n >= 15 then raise exception 'rate limit: too many messages, slow down'; end if;
  end if;
  if new.from_tutor then
    update public.inquiries set status = 'replied', replied_at = coalesce(replied_at, now())
    where id = new.inquiry_id and status = 'new';
  end if;
  return new;
end $$;
drop trigger if exists chat_insert on public.inquiry_messages;
create trigger chat_insert before insert on public.inquiry_messages
  for each row execute function public.on_chat_insert();
revoke execute on function public.on_chat_insert() from anon, authenticated, public;

-- Same spam/profanity rules as the rest of the site, when moderation.sql is installed.
-- Phone numbers are allowed here: it is a private conversation.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'moderate_content' and pronamespace = 'public'::regnamespace) then
    execute 'drop trigger if exists moderate on public.inquiry_messages';
    execute 'create trigger moderate before insert or update on public.inquiry_messages
             for each row execute function public.moderate_content(''text:private'')';
  end if;
end $$;

-- Live updates for the chat.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inquiry_messages') then
    alter publication supabase_realtime add table public.inquiry_messages;
  end if;
end $$;
