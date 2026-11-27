-- Fix: "new row violates row-level security policy for table profiles" when the admin
-- (recognised by email in is_admin()) saves their profile. The old check required the stored
-- is_admin column (false) to equal is_admin() (true), so every admin profile save failed.
-- The protect_profile_fields trigger already keeps is_admin unchanged for non-admins,
-- so the policy only needs to check the row is the person's own.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
