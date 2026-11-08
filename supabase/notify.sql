-- נפל האסימון: email the tutor about each new inquiry (calls the notify-inquiry Edge Function).
-- Run AFTER contact.sql. Safe to run more than once. Mail settings live in the function's secrets.
create extension if not exists pg_net with schema extensions;
alter table public.inquiries add column if not exists notified_at timestamptz;

create or replace function public.notify_new_inquiry() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://chdzyvyvdypmjgupyrvg.supabase.co/functions/v1/notify-inquiry',
    body := jsonb_build_object('inquiry_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  return new;  -- a mail problem never blocks the inquiry itself
end $$;
revoke execute on function public.notify_new_inquiry() from anon, authenticated, public;

create or replace trigger inquiry_notify after insert on public.inquiries
  for each row execute function public.notify_new_inquiry();
