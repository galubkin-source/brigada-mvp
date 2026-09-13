-- BRIGADOS MVP: paleisti Supabase SQL Editor vienu kartu.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now(),
  primary key (project_id,user_id)
);

create table if not exists public.work_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.work_points (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  work_type_id uuid references public.work_types(id),
  work_type_text text,
  status text not null default 'naujas' check (status in ('naujas','vykdoma','baigta','problema')),
  notes text,
  latitude double precision,
  longitude double precision,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_point_photos (
  id uuid primary key default gen_random_uuid(),
  work_point_id uuid not null references public.work_points(id) on delete cascade,
  storage_path text not null unique,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.work_point_changes (
  id bigint generated always as identity primary key,
  work_point_id uuid not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  changed_by uuid,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1))) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_work_points_updated_at on public.work_points;
create trigger trg_work_points_updated_at before update on public.work_points for each row execute function public.set_updated_at();

create or replace function public.audit_work_point()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.work_point_changes(work_point_id,action,changed_by,new_data) values (new.id,'INSERT',new.created_by,to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.work_point_changes(work_point_id,action,changed_by,old_data,new_data) values (new.id,'UPDATE',new.updated_by,to_jsonb(old),to_jsonb(new));
    return new;
  else
    insert into public.work_point_changes(work_point_id,action,changed_by,old_data) values (old.id,'DELETE',auth.uid(),to_jsonb(old));
    return old;
  end if;
end; $$;
drop trigger if exists trg_work_point_audit on public.work_points;
create trigger trg_work_point_audit after insert or update or delete on public.work_points for each row execute function public.audit_work_point();

create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.project_members pm where pm.project_id=p_project_id and pm.user_id=auth.uid());
$$;

create or replace function public.create_project_for_me(p_name text, p_description text default null)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project public.projects;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Project name is required';
  end if;

  insert into public.projects(name, description)
  values (trim(p_name), nullif(trim(coalesce(p_description,'')), ''))
  returning * into new_project;

  insert into public.project_members(project_id, user_id, role)
  values (new_project.id, auth.uid(), 'admin')
  on conflict do nothing;

  return new_project;
end;
$$;

grant execute on function public.create_project_for_me(text,text) to authenticated;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.work_types enable row level security;
alter table public.work_points enable row level security;
alter table public.work_point_photos enable row level security;
alter table public.work_point_changes enable row level security;

create policy "profiles own read" on public.profiles for select to authenticated using (id=auth.uid());
create policy "members read projects" on public.projects for select to authenticated using (public.is_project_member(id));
create policy "members read memberships" on public.project_members for select to authenticated using (user_id=auth.uid());
create policy "authenticated read work types" on public.work_types for select to authenticated using (active = true);

create policy "members read work points" on public.work_points for select to authenticated using (public.is_project_member(project_id));
create policy "members insert work points" on public.work_points for insert to authenticated with check (public.is_project_member(project_id) and created_by=auth.uid() and updated_by=auth.uid());
create policy "members update work points" on public.work_points for update to authenticated using (public.is_project_member(project_id)) with check (public.is_project_member(project_id) and updated_by=auth.uid());

create policy "members read photos rows" on public.work_point_photos for select to authenticated using (
  exists(select 1 from public.work_points wp where wp.id=work_point_id and public.is_project_member(wp.project_id))
);
create policy "members insert photos rows" on public.work_point_photos for insert to authenticated with check (
  uploaded_by=auth.uid() and exists(select 1 from public.work_points wp where wp.id=work_point_id and public.is_project_member(wp.project_id))
);

create policy "members read history" on public.work_point_changes for select to authenticated using (
  exists(select 1 from public.work_points wp where wp.id=work_point_id and public.is_project_member(wp.project_id))
);

insert into storage.buckets(id,name,public) values ('work-photos','work-photos',false) on conflict (id) do nothing;

create policy "project members upload photos" on storage.objects for insert to authenticated with check (
  bucket_id='work-photos' and public.is_project_member(((storage.foldername(name))[1])::uuid)
);
create policy "project members view photos" on storage.objects for select to authenticated using (
  bucket_id='work-photos' and public.is_project_member(((storage.foldername(name))[1])::uuid)
);
create policy "project members delete photos" on storage.objects for delete to authenticated using (
  bucket_id='work-photos' and public.is_project_member(((storage.foldername(name))[1])::uuid)
);

insert into public.work_types(name) values
  ('Brūsų keitimas'),
  ('Trosų darbai'),
  ('Iešmų šildymas')
on conflict (name) do nothing;

insert into public.projects(name,description) values ('Plungė','Testinis MVP objektas') on conflict (name) do update set description=excluded.description;

-- Realtime darbo taškams. Jei jau įtraukta į publication, šios eilutės nereikia.
do $$ begin
  alter publication supabase_realtime add table public.work_points;
exception when duplicate_object then null;
end $$;
