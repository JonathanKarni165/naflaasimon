-- "לא מתאים" notice: remember on the server that the student has seen it, so it doesn't come back on another device.
alter table public.inquiries add column if not exists decline_seen_at timestamptz;

-- The student marks their own declined inquiry as seen (they can't update inquiries directly).
create or replace function public.mark_decline_seen(q uuid)
returns void language sql security definer set search_path = public as $$
  update public.inquiries set decline_seen_at = now()
  where id = q and user_id = auth.uid() and status = 'declined' and decline_seen_at is null;
$$;
revoke all on function public.mark_decline_seen(uuid) from public, anon;
grant execute on function public.mark_decline_seen(uuid) to authenticated;

-- A new "לא מתאים" (for example after the tutor reopened it) shows the notice again.
create or replace function public.reset_decline_seen() returns trigger language plpgsql as $$
begin
  if new.status = 'declined' and old.status is distinct from 'declined' then new.decline_seen_at := null; end if;
  return new;
end $$;
drop trigger if exists inquiries_decline_seen on public.inquiries;
create trigger inquiries_decline_seen before update of status on public.inquiries
  for each row execute function public.reset_decline_seen();
