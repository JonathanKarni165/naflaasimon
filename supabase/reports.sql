-- נפל האסימון: users report a tutor who behaved inappropriately; only site admins read the reports.
-- Run AFTER schema.sql. Safe to run more than once (only adds; never deletes data).
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  reason text not null check (reason in ('behavior', 'harassment', 'fake', 'payment', 'other')),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'handled')),
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;

drop policy if exists "report a tutor" on public.reports;
create policy "report a tutor" on public.reports for insert to authenticated
  with check (user_id = auth.uid() and status = 'open');
drop policy if exists "admins read reports" on public.reports;
create policy "admins read reports" on public.reports for select using (public.is_admin());
drop policy if exists "admins update reports" on public.reports;
create policy "admins update reports" on public.reports for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete reports" on public.reports;
create policy "admins delete reports" on public.reports for delete using (public.is_admin());

-- One person can't flood: at most 5 reports a day.
create or replace function public.reports_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'שלחתם כבר כמה דיווחים היום. אפשר לנסות שוב מחר.';
  end if;
  return new;
end $$;
drop trigger if exists reports_rate on public.reports;
create trigger reports_rate before insert on public.reports for each row execute function public.reports_rate_limit();
