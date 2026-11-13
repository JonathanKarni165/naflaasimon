-- נפל האסימון: tutors can add where they studied (shown on their card and profile).
-- Run AFTER schema.sql and moderation.sql. Safe to run more than once (only adds).
alter table public.tutors add column if not exists education text check (char_length(education) <= 100);

-- The content filter also checks the new public field.
drop trigger if exists moderate on public.tutors;
create trigger moderate before insert or update on public.tutors
  for each row execute function public.moderate_content('name:private', 'headline', 'about', 'education', 'city:private', 'area:private');
