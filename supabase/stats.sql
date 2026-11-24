-- Statistics for the site admin ("סטטיסטיקות" in ניהול האתר). Runs after schema.sql and accounts.sql. Safe to re-run.
--
-- 1. search_log: one row per search on the tutor or group search page.
--    Some visitors are minors, so the row holds only what was searched, never who searched:
--    no user id, no email, no IP, no exact location ("המיקום שלי" is stored as the words "מיקום נוכחי").
--    Anyone may add a row; only the admin can read them (row level security + column grants).
create table if not exists public.search_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null default 'tutors' check (kind in ('tutors', 'groups')),
  subject text check (char_length(subject) <= 60),
  topic text check (char_length(topic) <= 80),
  q text check (char_length(q) <= 60),
  place text check (char_length(place) <= 60),
  mode text check (mode in ('any', 'online', 'frontal')),
  max_price integer check (max_price between 0 and 1000),
  results integer not null default 0 check (results >= 0),
  real_results integer not null default 0 check (real_results >= 0), -- results without the example tutors
  signed_in boolean not null default false
);
create index if not exists search_log_created_idx on public.search_log (created_at desc);

alter table public.search_log enable row level security;
drop policy if exists "anyone logs a search" on public.search_log;
create policy "anyone logs a search" on public.search_log for insert to anon, authenticated with check (true);
drop policy if exists "admin reads searches" on public.search_log;
create policy "admin reads searches" on public.search_log for select using ((select public.is_admin()));
drop policy if exists "admin deletes searches" on public.search_log;
create policy "admin deletes searches" on public.search_log for delete using ((select public.is_admin()));

-- Visitors can only fill these columns (the time and id are set by the database).
revoke all on public.search_log from anon, authenticated;
grant insert (kind, subject, topic, q, place, mode, max_price, results, real_results, signed_in) on public.search_log to anon, authenticated;
grant select, delete on public.search_log to authenticated;

-- Flood guard: beyond 300 searches a minute across the whole site, extra rows are dropped quietly.
create or replace function public.search_log_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.search_log where created_at > now() - interval '1 minute') >= 300 then return null; end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists search_log_guard on public.search_log;
create trigger search_log_guard before insert on public.search_log for each row execute function public.search_log_guard();

-- 2. admin_stats(days): everything the statistics panel shows, in one call. Admin only.
--    days = 0 means all time (for the search lists); the monthly table always covers the last 12 months.
--    The 42 example tutors (is_example) are left out of every tutor count.
create or replace function public.admin_stats(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := case when coalesce(p_days, 0) > 0 then now() - make_interval(days => p_days) else '-infinity'::timestamptz end;
  tz constant text := 'Asia/Jerusalem';
  result jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;

  with real_tutors as (
    select t.id, t.owner_id, t.approval, t.created_at, c.birth_date
    from public.tutors t left join public.tutor_contacts c on c.tutor_id = t.id
    where not coalesce(t.is_example, false)
  ),
  people as (
    select p.id, p.created_at, p.birth_date, p.area,
           exists (select 1 from real_tutors r where r.owner_id = p.id) as is_tutor
    from public.profiles p
    where not coalesce(p.is_admin, false)
  ),
  ages as (
    select is_tutor,
           case when birth_date is null then null else extract(year from age(current_date, birth_date))::int end as age
    from people
  ),
  s as (select * from public.search_log where created_at >= since),
  months as (
    select to_char(date_trunc('month', (now() at time zone tz)) - make_interval(months => g), 'YYYY-MM') as m
    from generate_series(0, 11) g
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'days', coalesce(p_days, 0),
    'totals', jsonb_build_object(
      'users', (select count(*) from people),
      'students', (select count(*) from people where not is_tutor),
      'tutors', (select count(*) from real_tutors where approval = 'approved'),
      'tutorsPending', (select count(*) from real_tutors where approval = 'pending'),
      'exampleTutors', (select count(*) from public.tutors where coalesce(is_example, false)),
      'newUsers', (select count(*) from people where created_at >= since),
      'searches', (select count(*) from s),
      'zeroSearches', (select count(*) from s where real_results = 0),
      'inquiries', (select count(*) from public.inquiries where created_at >= since)
                 + (select count(*) from public.guest_requests where created_at >= since),
      'inquiriesToExamples', (select count(*) from public.inquiries i join public.tutors t on t.id = i.tutor_id
                              where coalesce(t.is_example, false) and i.created_at >= since),
      'groupSignups', (select count(*) from public.group_seats where created_at >= since)
    ),
    'ages', (
      select coalesce(jsonb_agg(jsonb_build_object('bucket', b.label, 'students', b.st, 'tutors', b.tu) order by b.ord), '[]'::jsonb)
      from (
        select v.ord, v.label,
               (select count(*) from ages a where not a.is_tutor
                  and case when v.ord = 9 then a.age is null else a.age between v.lo and v.hi end) as st,
               (select count(*) from real_tutors r
                 where case when v.ord = 9 then r.birth_date is null
                            else extract(year from age(current_date, r.birth_date))::int between v.lo and v.hi end) as tu
        from (values (1, 'עד 12', 0, 12), (2, '13–15', 13, 15), (3, '16–18', 16, 18), (4, '19–24', 19, 24),
                     (5, '25–34', 25, 34), (6, '35–49', 35, 49), (7, '50+', 50, 200), (9, 'לא ידוע', -1, -1)) v(ord, label, lo, hi)
      ) b
    ),
    'areas', (
      select coalesce(jsonb_agg(jsonb_build_object('label', area, 'count', n) order by n desc), '[]'::jsonb)
      from (select area, count(*) n from people where coalesce(btrim(area), '') <> '' group by area order by n desc limit 12) x
    ),
    'subjects', (
      select coalesce(jsonb_agg(jsonb_build_object('label', subject, 'count', n, 'zero', z) order by n desc), '[]'::jsonb)
      from (select subject, count(*) n, count(*) filter (where real_results = 0) z from s
            where coalesce(subject, '') <> '' group by subject order by n desc limit 15) x
    ),
    'topics', (
      select coalesce(jsonb_agg(jsonb_build_object('label', topic, 'subject', subject, 'count', n, 'zero', z) order by n desc), '[]'::jsonb)
      from (select topic, max(subject) subject, count(*) n, count(*) filter (where real_results = 0) z from s
            where coalesce(topic, '') <> '' group by topic order by n desc limit 15) x
    ),
    'places', (
      select coalesce(jsonb_agg(jsonb_build_object('label', place, 'count', n, 'zero', z) order by n desc), '[]'::jsonb)
      from (select place, count(*) n, count(*) filter (where real_results = 0) z from s
            where coalesce(place, '') <> '' group by place order by n desc limit 15) x
    ),
    'words', (
      select coalesce(jsonb_agg(jsonb_build_object('label', w, 'count', n, 'zero', z) order by n desc), '[]'::jsonb)
      from (select lower(btrim(q)) w, count(*) n, count(*) filter (where real_results = 0) z from s
            where coalesce(btrim(q), '') <> '' group by 1 order by n desc limit 15) x
    ),
    'modes', (
      select coalesce(jsonb_object_agg(coalesce(mode, 'any'), n), '{}'::jsonb)
      from (select mode, count(*) n from s group by mode) x
    ),
    'zero', (
      select coalesce(jsonb_agg(z order by (z->>'count')::int desc, z->>'last' desc), '[]'::jsonb)
      from (
        select jsonb_build_object('kind', kind, 'subject', subject, 'topic', topic, 'q', q, 'place', place, 'mode', mode,
                                  'maxPrice', max_price, 'count', count(*), 'last', max(created_at),
                                  'examplesOnly', max(results) > 0) z
        from s where real_results = 0
        group by kind, subject, topic, q, place, mode, max_price
        order by count(*) desc, max(created_at) desc
        limit 100
      ) x
    ),
    'monthly', (
      select jsonb_agg(jsonb_build_object(
        'month', m.m,
        'signups', (select count(*) from people p where to_char(p.created_at at time zone tz, 'YYYY-MM') = m.m),
        'tutors', (select count(*) from real_tutors r where to_char(r.created_at at time zone tz, 'YYYY-MM') = m.m),
        'searches', (select count(*) from public.search_log l where to_char(l.created_at at time zone tz, 'YYYY-MM') = m.m),
        'zeroSearches', (select count(*) from public.search_log l where l.real_results = 0 and to_char(l.created_at at time zone tz, 'YYYY-MM') = m.m),
        'inquiries', (select count(*) from public.inquiries i where to_char(i.created_at at time zone tz, 'YYYY-MM') = m.m)
                   + (select count(*) from public.guest_requests g where to_char(g.created_at at time zone tz, 'YYYY-MM') = m.m),
        'groupSignups', (select count(*) from public.group_seats g where to_char(g.created_at at time zone tz, 'YYYY-MM') = m.m)
      ) order by m.m desc)
      from months m
    )
  ) into result;
  return result;
end $$;

revoke all on function public.admin_stats(integer) from public, anon;
grant execute on function public.admin_stats(integer) to authenticated;
