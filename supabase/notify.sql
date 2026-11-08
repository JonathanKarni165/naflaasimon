-- נפל האסימון: email the tutor about each new inquiry (calls the notify-inquiry Edge Function).
-- Run AFTER contact.sql, once the function is deployed. Safe to run more than once.
-- Then put the same random value in private.notify_settings.secret and in the function secret NOTIFY_SECRET.
create extension if not exists pg_net with schema extensions;
create schema if not exists private;
revoke all on schema private from anon, authenticated, public;
create table if not exists private.notify_settings (
  id boolean primary key default true check (id),
  function_url text not null,
  secret text not null
);

create or replace function public.notify_new_inquiry() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare s private.notify_settings;
begin
  select * into s from private.notify_settings where id;
  if found then
    perform net.http_post(
      url := s.function_url,
      body := jsonb_build_object('inquiry_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', s.secret),
      timeout_milliseconds := 5000
    );
  end if;
  return new;  -- a mail problem never blocks the inquiry itself
exception when others then
  return new;
end $$;
revoke execute on function public.notify_new_inquiry() from anon, authenticated, public;

create or replace trigger inquiry_notify after insert on public.inquiries
  for each row execute function public.notify_new_inquiry();
