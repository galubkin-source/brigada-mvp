-- 1) Supabase Dashboard > Authentication > Users sukurk 3–4 testinius naudotojus.
-- 2) Tada pakeisk el. paštus žemiau ir paleisk šį SQL.
insert into public.project_members(project_id,user_id,role)
select p.id,u.id,'member'
from public.projects p
cross join auth.users u
where p.name='Plungė'
  and u.email in ('darbuotojas1@example.com','darbuotojas2@example.com','darbuotojas3@example.com')
on conflict (project_id,user_id) do nothing;
