-- נפל האסימון: removes every example tutor, review, group and placeholder account added by supabase/seed.sql.
-- Run before the real launch. Real tutors and users are not touched.
begin;
delete from public.tutors where is_example;
delete from auth.users where email like '%@seed.naflaasimon.invalid';
commit;
