-- QA round 8 item 17 (approved 2026-11-25): a tutor can't delete their account while students are signed up
-- to one of their groups that hasn't ended yet. They first cancel the group (or remove the seats) so students are told.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'login required'; end if;
  if exists (
    select 1 from public.group_seats s
      join public.groups g on g.id = s.group_id
      join public.tutors t on t.id = g.tutor_id
    where t.owner_id = u and coalesce(s.status, '') <> 'declined'
      and g.start_date + (greatest(coalesce(g.sessions, 1), 1) - 1) * 7 >= current_date
  ) then
    raise exception 'active group seats' using errcode = 'P0001';
  end if;
  delete from public.tutors where owner_id = u;   -- a tutor profile would otherwise stay public without an owner
  delete from auth.users where id = u;            -- profile, inquiries, reviews, seats and chats go with it (on delete cascade)
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
