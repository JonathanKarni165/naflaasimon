-- נפל האסימון: tags on the tutor card. Run AFTER schema.sql and moderation.sql. Safe to run more than once.
-- education: where they studied (graduation-cap tag). workplace: a company they worked at (worker tag).
-- lesson_place: where frontal lessons happen: at the tutor's, at the student's, or either.
alter table public.tutors add column if not exists education text check (char_length(education) <= 100);
alter table public.tutors add column if not exists workplace text check (char_length(workplace) <= 60);
alter table public.tutors add column if not exists lesson_place text check (lesson_place in ('tutor', 'student', 'both'));

-- The content filter also checks the new public text fields.
drop trigger if exists moderate on public.tutors;
create trigger moderate before insert or update on public.tutors
  for each row execute function public.moderate_content('name:private', 'headline', 'about', 'education', 'workplace', 'city:private', 'area:private');
