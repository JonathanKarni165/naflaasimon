-- נפל האסימון: verified reviews (approved by the user 2026-11-25). Run AFTER round8.sql. Safe to run again.
--
-- Only a student may review a tutor, and a student is someone the TUTOR confirmed (user decision 2026-11-25):
--   the tutor marked "נקבע שיעור" on their inquiry, or approved them into one of the tutor's groups.
-- Those tutors are the student's "מורה שלי". One review per student and tutor, editable.
-- Contact without confirmation (two-way chat, or the tutor opened an inquiry where the student shared a phone/email)
-- does not allow a review; it makes the site ask the tutor by email whether a lesson happened. Public name: first name + last initial ("דנה ל."), minors "תלמיד/ה".
-- Students per tutor = students the tutor marked "נקבע שיעור" + approved group seats (+ reviewers, who are always one of those).
-- Emails (edge function review-reminders, called hourly by pg_cron, only 09:00-21:00 Israel time):
--   - to the student ~2 days and ~10 days after the tutor marked the lesson: "מה דעתך על ...?" (stops once they reviewed);
--   - once to every approved tutor (and to each newly approved one): mark your active students, it lifts you in search;
--   - to the tutor ~3 days after opening a student's details (or a two-way chat) without marking a lesson: "התקיים שיעור?".

-- 1. When contact happened --------------------------------------------------------------------------
alter table public.inquiries add column if not exists tutor_opened_at timestamptz;  -- the tutor opened the inquiry window
alter table public.inquiries add column if not exists booked_at timestamptz;        -- first time marked "נקבע שיעור"
alter table public.inquiries add column if not exists contact_at timestamptz;       -- first contact: two-way chat, opened details, or booked
alter table public.inquiries add column if not exists review_ask1_at timestamptz;   -- first review email to the student
alter table public.inquiries add column if not exists review_ask2_at timestamptz;   -- second (last) review email
alter table public.inquiries add column if not exists lesson_ask_at timestamptz;    -- "did a lesson happen?" email to the tutor
create index if not exists inquiries_contact on public.inquiries(contact_at) where contact_at is not null;
create index if not exists inquiries_opened on public.inquiries(tutor_opened_at) where tutor_opened_at is not null;

-- Nobody can write these columns from the browser: inquiries has no update policy, and a new inquiry starts clean.
create or replace function public.inquiry_contact_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.tutor_opened_at := null; new.booked_at := null; new.contact_at := null;
    new.review_ask1_at := null; new.review_ask2_at := null; new.lesson_ask_at := null;
  elsif new.status = 'booked' and old.status is distinct from 'booked' then
    new.booked_at := coalesce(old.booked_at, now());
    new.contact_at := coalesce(old.contact_at, now());
  end if;
  return new;
end $$;
revoke execute on function public.inquiry_contact_guard() from anon, authenticated, public;
drop trigger if exists inquiry_contact_guard on public.inquiries;
create trigger inquiry_contact_guard before insert or update of status on public.inquiries
  for each row execute function public.inquiry_contact_guard();

-- Contact (for the tutor's "did a lesson happen?" email): the second side's first chat message.
create or replace function public.on_chat_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.inquiries set contact_at = now()
   where id = new.inquiry_id and contact_at is null
     and exists (select 1 from public.inquiry_messages m where m.inquiry_id = new.inquiry_id and m.from_tutor = not new.from_tutor);
  return null;
end $$;
revoke execute on function public.on_chat_contact() from anon, authenticated, public;
drop trigger if exists chat_contact on public.inquiry_messages;
create trigger chat_contact after insert on public.inquiry_messages
  for each row execute function public.on_chat_contact();

-- Contact: the tutor (the profile's owner, not an admin looking around) opened an inquiry with a shared phone/email.
create or replace function public.mark_inquiry_opened(q uuid) returns void
language sql security definer set search_path = public as $$
  update public.inquiries i
     set tutor_opened_at = coalesce(i.tutor_opened_at, now()),
         contact_at = case when i.contact_at is null and i.status <> 'declined' and i.contact_via && array['phone', 'email']
                           then now() else i.contact_at end
   where i.id = q and (i.tutor_opened_at is null or (i.contact_at is null and i.status <> 'declined' and i.contact_via && array['phone', 'email']))
     and exists (select 1 from public.tutors t where t.id = i.tutor_id and t.owner_id = auth.uid());
$$;
revoke all on function public.mark_inquiry_opened(uuid) from public, anon;
grant execute on function public.mark_inquiry_opened(uuid) to authenticated;

-- Inquiries from before this file: booked ones and two-way chats count from when they happened.
update public.inquiries set booked_at = coalesce(replied_at, created_at) where status = 'booked' and booked_at is null;
update public.inquiries q set contact_at = coalesce(q.booked_at, x.at)
  from (select inquiry_id, max(first_at) as at from (
          select inquiry_id, from_tutor, min(created_at) as first_at from public.inquiry_messages group by 1, 2) s
        group by inquiry_id having count(*) = 2) x
 where x.inquiry_id = q.id and q.contact_at is null;
update public.inquiries set contact_at = booked_at where contact_at is null and booked_at is not null;

-- 2. Who may review whom ----------------------------------------------------------------------------
-- The signed-in student's tutors ("המורים שלי"): since when, and whether they already wrote a review.
create or replace function public.my_tutors() returns table (tutor_id uuid, since timestamptz, reviewed boolean)
language sql stable security definer set search_path = public as $$
  with c as (
    select q.tutor_id, q.booked_at as since from public.inquiries q
     where q.user_id = auth.uid() and q.booked_at is not null
    union all
    select g.tutor_id, s.created_at from public.group_seats s join public.groups g on g.id = s.group_id
     where s.user_id = auth.uid() and s.status = 'approved'
  )
  select c.tutor_id, min(c.since),
         exists (select 1 from public.reviews r where r.tutor_id = c.tutor_id and r.user_id = auth.uid())
    from c join public.tutors t on t.id = c.tutor_id
   where auth.uid() is not null and t.owner_id is distinct from auth.uid()
   group by c.tutor_id;
$$;
revoke all on function public.my_tutors() from public, anon;
grant execute on function public.my_tutors() to authenticated;

create or replace function public.can_review(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.my_tutors() m where m.tutor_id = t)
     and not exists (select 1 from public.reviews r join public.profiles p on p.id = r.user_id
                     where r.tutor_id = t and r.user_id <> auth.uid()
                       and public.norm_email(p.email) = public.norm_email((select email from public.profiles where id = auth.uid())));
$$;
revoke all on function public.can_review(uuid) from public, anon;
grant execute on function public.can_review(uuid) to authenticated;
-- The "reviews insert" policy (round6.sql) already calls can_review(); editing your own review stays allowed.

-- 3. The name shown on a review ---------------------------------------------------------------------
-- Set by the database from the profile, so nobody can post under another name. Under 18: "תלמיד/ה".
create or replace function public.reviewer_name(u uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.birth_date is not null and p.birth_date > (current_date - interval '18 years')::date then 'תלמיד/ה'
    when coalesce(btrim(p.name), '') = '' or p.name like '%@%' then 'תלמיד/ה'
    when btrim(p.name) ~ '\s' then split_part(btrim(p.name), ' ', 1) || ' ' || left(regexp_replace(btrim(p.name), '^.*\s', ''), 1) || '.'
    else btrim(p.name)
  end
  from public.profiles p where p.id = u;
$$;
revoke all on function public.reviewer_name(uuid) from public, anon, authenticated;

create or replace function public.review_fill() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_name := coalesce(public.reviewer_name(new.user_id), 'תלמיד/ה');
  if tg_op = 'UPDATE' then new.created_at := old.created_at; new.updated_at := now(); else new.created_at := now(); end if;
  return new;
end $$;
alter table public.reviews add column if not exists updated_at timestamptz;
revoke execute on function public.review_fill() from anon, authenticated, public;
drop trigger if exists review_fill on public.reviews;
create trigger review_fill before insert or update on public.reviews
  for each row execute function public.review_fill();
-- Real (non-example) reviews written before this file get the short name too.
update public.reviews r set user_name = coalesce(public.reviewer_name(r.user_id), 'תלמיד/ה')
  from public.tutors t where t.id = r.tutor_id and not coalesce(t.is_example, false);

-- 4. Students per tutor (public numbers only, no names) ---------------------------------------------
create or replace function public.tutor_student_counts() returns table (tutor_id uuid, students int)
language sql stable security definer set search_path = public as $$
  select x.tutor_id, count(distinct x.user_id)::int from (
    select r.tutor_id, r.user_id from public.reviews r
    union select q.tutor_id, q.user_id from public.inquiries q where q.booked_at is not null and q.user_id is not null
    union select g.tutor_id, s.user_id from public.group_seats s join public.groups g on g.id = s.group_id where s.status = 'approved'
  ) x group by x.tutor_id;
$$;
grant execute on function public.tutor_student_counts() to anon, authenticated;

-- When the one-time "mark your active students" email went to the tutor.
alter table public.tutors add column if not exists students_tip_at timestamptz;

-- 5. Which emails are due (the edge function calls this with the service key, then sends) -----------
-- Each email is claimed once: the row is stamped in the same statement, so two runs can't both send it.
create or replace function public.claim_review_reminders() returns table (kind text, inquiry_id uuid, user_id uuid, tutor_id uuid, booked boolean)
language plpgsql security definer set search_path = public as $$
declare h int := extract(hour from now() at time zone 'Asia/Jerusalem');
begin
  if h < 9 or h >= 21 then return; end if;  -- no emails at night

  -- First review request, ~2 days after the tutor marked the lesson (one per student and tutor, never after a review).
  return query
  with due as (
    select distinct on (q.user_id, q.tutor_id) q.id, q.user_id, q.tutor_id, true as booked
      from public.inquiries q join public.tutors t on t.id = q.tutor_id
     where q.user_id is not null and q.booked_at is not null
       and q.booked_at <= now() - interval '2 days' and q.booked_at > now() - interval '30 days'
       and t.owner_id is distinct from q.user_id
       and not exists (select 1 from public.inquiries o where o.user_id = q.user_id and o.tutor_id = q.tutor_id and o.review_ask1_at is not null)
       and not exists (select 1 from public.reviews r where r.user_id = q.user_id and r.tutor_id = q.tutor_id)
     order by q.user_id, q.tutor_id, q.booked_at desc
     limit 40
  ), stamp as (
    update public.inquiries q set review_ask1_at = now() from due
     where q.user_id = due.user_id and q.tutor_id = due.tutor_id returning q.id
  )
  select 'review1'::text, due.id, due.user_id, due.tutor_id, due.booked from due;

  -- Second and last request, ~10 days after the lesson was marked and at least 5 days after the first.
  return query
  with due as (
    select distinct on (q.user_id, q.tutor_id) q.id, q.user_id, q.tutor_id, true as booked
      from public.inquiries q join public.tutors t on t.id = q.tutor_id
     where q.user_id is not null and q.booked_at is not null
       and q.booked_at <= now() - interval '10 days' and q.booked_at > now() - interval '40 days'
       and t.owner_id is distinct from q.user_id
       and exists (select 1 from public.inquiries o where o.user_id = q.user_id and o.tutor_id = q.tutor_id and o.review_ask1_at <= now() - interval '5 days')
       and not exists (select 1 from public.inquiries o where o.user_id = q.user_id and o.tutor_id = q.tutor_id and o.review_ask2_at is not null)
       and not exists (select 1 from public.reviews r where r.user_id = q.user_id and r.tutor_id = q.tutor_id)
     order by q.user_id, q.tutor_id, q.booked_at desc
     limit 40
  ), stamp as (
    update public.inquiries q set review_ask2_at = now() from due
     where q.user_id = due.user_id and q.tutor_id = due.tutor_id returning q.id
  )
  select 'review2'::text, due.id, due.user_id, due.tutor_id, due.booked from due;

  -- To the tutor, ~3 days after opening the student's details or a two-way chat, when no lesson was marked.
  return query
  with due as (
    select q.id, q.user_id, q.tutor_id
      from public.inquiries q join public.tutors t on t.id = q.tutor_id
     where t.owner_id is not null and coalesce(q.contact_at, q.tutor_opened_at) is not null and q.lesson_ask_at is null
       and q.status in ('new', 'replied') and q.booked_at is null
       and least(q.contact_at, q.tutor_opened_at) <= now() - interval '3 days'
       and least(q.contact_at, q.tutor_opened_at) > now() - interval '30 days'
     order by least(q.contact_at, q.tutor_opened_at)
     limit 40
  ), stamp as (
    update public.inquiries q set lesson_ask_at = now() from due where q.id = due.id returning q.id
  )
  select 'lesson'::text, due.id, due.user_id, due.tutor_id, false from due;

  -- Once per tutor with an account and an approved profile: "mark your active students". 40 per hour, so it spreads out.
  return query
  with due as (
    select t.id from public.tutors t
     where t.owner_id is not null and coalesce(t.approval, 'approved') = 'approved'
       and not coalesce(t.is_example, false) and t.students_tip_at is null
     order by t.created_at
     limit 40
  ), stamp as (
    update public.tutors t set students_tip_at = now() from due where t.id = due.id returning t.id
  )
  select 'tip'::text, null::uuid, null::uuid, due.id, false from due;
end $$;
revoke all on function public.claim_review_reminders() from public, anon, authenticated;
grant execute on function public.claim_review_reminders() to service_role;
grant execute on function public.reviewer_name(uuid) to service_role;

-- 6. Hourly run ------------------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('review-reminders', '7 * * * *', $cron$
  select net.http_post(
    url := 'https://chdzyvyvdypmjgupyrvg.supabase.co/functions/v1/review-reminders',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );
$cron$);
