-- נפל האסימון: give the example tutors a lesson place (where frontal lessons happen), spread over the 3 options.
-- Real tutors are left empty: they are asked to pick one the next time they save their profile.
update public.tutors t set lesson_place = (array['both','student','tutor'])[1 + (x.rn % 3)]
from (select id, row_number() over (order by created_at, id) as rn from public.tutors where is_example and teaches_frontal and lesson_place is null) x
where t.id = x.id;
