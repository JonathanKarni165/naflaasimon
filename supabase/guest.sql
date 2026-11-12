-- נפל האסימון: requests from people who don't have an account (they leave a phone number).
-- Run AFTER groupchat.sql. Rows are written only by the guest-request Edge Function (service role),
-- which checks for spam. Tutors read the requests addressed to them; nobody else can.
create table if not exists public.guest_requests (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  name text not null check (length(name) between 2 and 80),
  phone text not null check (length(phone) between 7 and 20),
  email text check (email is null or length(email) <= 120),
  message text not null check (length(message) between 1 and 1000),
  status text not null default 'new' check (status in ('new', 'done')),
  ip_hash text,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists guest_requests_tutor on public.guest_requests(tutor_id, created_at desc);
create index if not exists guest_requests_phone on public.guest_requests(phone, created_at desc);
create index if not exists guest_requests_ip on public.guest_requests(ip_hash, created_at desc);
alter table public.guest_requests enable row level security;
drop policy if exists "guest read" on public.guest_requests;
create policy "guest read" on public.guest_requests for select using (public.owns_tutor(tutor_id));
drop policy if exists "guest update" on public.guest_requests;
create policy "guest update" on public.guest_requests for update using (public.owns_tutor(tutor_id)) with check (public.owns_tutor(tutor_id));
drop policy if exists "guest delete" on public.guest_requests;
create policy "guest delete" on public.guest_requests for delete using (public.owns_tutor(tutor_id));
-- Tutors may change only the status.
create or replace function public.guest_protect() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    new.id := old.id; new.tutor_id := old.tutor_id; new.group_id := old.group_id; new.name := old.name; new.phone := old.phone;
    new.email := old.email; new.message := old.message; new.ip_hash := old.ip_hash; new.created_at := old.created_at; new.notified_at := old.notified_at;
  end if;
  return new;
end $$;
drop trigger if exists guest_protect on public.guest_requests;
create trigger guest_protect before update on public.guest_requests for each row execute function public.guest_protect();
