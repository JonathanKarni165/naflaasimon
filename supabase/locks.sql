-- Locked personal details (2026-11-13): once an account is set up, the person cannot change their name (birth date was already locked). The phone number stays editable. Admins can still fix details.
-- Tutors: name and birth date are locked after approval.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() or current_setting('app.bypass', true) = 'on' then return new; end if;
  new.id := old.id; new.email := old.email; new.is_admin := old.is_admin;
  if old.birth_date is not null then new.birth_date := old.birth_date; end if;
  if old.profile_done then
    new.name := old.name;
  end if;
  return new;
end $$;

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
    new.approval := case when old.approval = 'rejected' then 'pending' else old.approval end;
    if old.approval = 'approved' then new.name := old.name; end if;
    if coalesce(btrim(new.photo), '') = '' then raise exception 'tutor details required: photo'; end if;
  end if;
  return new;
end $$;

create or replace function public.lock_tutor_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or current_setting('app.bypass', true) = 'on' then return new; end if;
  if exists (select 1 from public.tutors t where t.id = old.tutor_id and t.approval = 'approved') then
    new.birth_date := old.birth_date;
  end if;
  return new;
end $$;
drop trigger if exists tutor_contacts_lock on public.tutor_contacts;
create trigger tutor_contacts_lock before update on public.tutor_contacts for each row execute function public.lock_tutor_contact();
