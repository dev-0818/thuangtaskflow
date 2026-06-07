-- TaskFlow database schema and RLS policies.
-- Run this in Supabase SQL editor, then create the first manager profile manually.

create table if not exists public.master_job_titles (
  id serial primary key,
  name varchar(100) unique not null,
  description text null,
  created_at timestamptz default now() not null
);

create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text unique null,
  name varchar(255) not null,
  system_role varchar(50) check (system_role in ('manager', 'member')) not null,
  can_add_subtasks boolean default true not null,
  is_active boolean default true not null,
  deleted_at timestamptz null,
  deleted_by uuid references public.users(id) null,
  job_title_id integer references public.master_job_titles(id) null,
  manager_id uuid references public.users(id) null,
  created_at timestamptz default now() not null
);

alter table public.users
add column if not exists can_add_subtasks boolean default true not null;

alter table public.users
add column if not exists is_active boolean default true not null;

alter table public.users
add column if not exists deleted_at timestamptz null;

alter table public.users
add column if not exists deleted_by uuid references public.users(id) null;

create table if not exists public.tasks (
  id bigserial primary key,
  title varchar(255) not null,
  description text null,
  status varchar(50) check (status in ('active', 'completed', 'archived')) default 'active' not null,
  priority varchar(50) check (priority in ('low', 'normal', 'high')) default 'normal' not null,
  created_by uuid references public.users(id) not null,
  created_at timestamptz default now() not null
);

alter table public.tasks
add column if not exists priority varchar(50) default 'normal' not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_priority_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
    add constraint tasks_priority_check
    check (priority in ('low', 'normal', 'high'));
  end if;
end $$;

create table if not exists public.subtasks (
  id bigserial primary key,
  task_id bigint references public.tasks(id) on delete cascade not null,
  title varchar(255) not null,
  assigned_to uuid references public.users(id) not null,
  assigned_by uuid references public.users(id) null,
  deadline_date date not null,
  deadline_time time not null,
  is_completed boolean default false not null,
  completed_at timestamptz null,
  completion_notes text null,
  created_at timestamptz default now() not null
);

alter table public.subtasks
add column if not exists completed_at timestamptz null;

alter table public.subtasks
add column if not exists completion_notes text null;

alter table public.subtasks
add column if not exists assigned_by uuid references public.users(id) null;

update public.subtasks st
set assigned_by = tasks.created_by
from public.tasks
where st.task_id = tasks.id
  and st.assigned_by is null;

create index if not exists idx_users_manager_id on public.users(manager_id);
create index if not exists idx_users_job_title_id on public.users(job_title_id);
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_subtasks_task_id on public.subtasks(task_id);
create index if not exists idx_subtasks_assigned_to on public.subtasks(assigned_to);
create index if not exists idx_subtasks_assigned_by on public.subtasks(assigned_by);
create index if not exists idx_subtasks_deadline on public.subtasks(deadline_date, deadline_time);
create index if not exists idx_subtasks_completed_at on public.subtasks(completed_at);

alter table public.master_job_titles enable row level security;
alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select system_role from public.users where id = auth.uid() and is_active = true
$$;

create or replace function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'manager', false)
$$;

create or replace function public.refresh_task_completion_status(target_task_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tasks
  set status = case
    when exists (
      select 1
      from public.subtasks
      where task_id = target_task_id
    )
    and not exists (
      select 1
      from public.subtasks
      where task_id = target_task_id
        and is_completed = false
    )
      then 'completed'
    else 'active'
  end
  where id = target_task_id
    and status <> 'archived';
end;
$$;

create or replace function public.sync_task_status_from_subtasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_task_completion_status(old.task_id);
    return old;
  end if;

  perform public.refresh_task_completion_status(new.task_id);

  if tg_op = 'UPDATE' and old.task_id is distinct from new.task_id then
    perform public.refresh_task_completion_status(old.task_id);
  end if;

  return new;
end;
$$;

drop trigger if exists subtasks_sync_task_status on public.subtasks;
create trigger subtasks_sync_task_status
after insert or update of is_completed, task_id or delete
on public.subtasks
for each row
execute function public.sync_task_status_from_subtasks();

drop policy if exists "job titles readable by authenticated users" on public.master_job_titles;
create policy "job titles readable by authenticated users"
on public.master_job_titles for select
to authenticated
using (true);

drop policy if exists "job titles managed by managers" on public.master_job_titles;
create policy "job titles managed by managers"
on public.master_job_titles for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "users readable by authenticated users" on public.users;
create policy "users readable by authenticated users"
on public.users for select
to authenticated
using (true);

drop policy if exists "users managed by managers" on public.users;
create policy "users managed by managers"
on public.users for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "tasks readable by managers and assigned members" on public.tasks;
create policy "tasks readable by managers and assigned members"
on public.tasks for select
to authenticated
using (
  public.is_manager()
  or exists (
    select 1 from public.subtasks
    where subtasks.task_id = tasks.id
      and subtasks.assigned_to = auth.uid()
  )
);

drop policy if exists "tasks managed by managers" on public.tasks;
create policy "tasks managed by managers"
on public.tasks for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "subtasks readable by managers and assignees" on public.subtasks;
create policy "subtasks readable by managers and assignees"
on public.subtasks for select
to authenticated
using (
  public.is_manager()
  or assigned_to = auth.uid()
);

drop policy if exists "subtasks managed by managers" on public.subtasks;
create policy "subtasks managed by managers"
on public.subtasks for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "members add subtasks to assigned tasks" on public.subtasks;
create policy "members add subtasks to assigned tasks"
on public.subtasks for insert
to authenticated
with check (
  assigned_to = auth.uid()
  and assigned_by = auth.uid()
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
      and users.can_add_subtasks = true
      and users.is_active = true
  )
  and exists (
    select 1 from public.subtasks existing
    where existing.task_id = subtasks.task_id
      and existing.assigned_to = auth.uid()
  )
);

drop policy if exists "members complete their assigned subtasks" on public.subtasks;
create policy "members complete their assigned subtasks"
on public.subtasks for update
to authenticated
using (
  assigned_to = auth.uid()
  and is_completed = false
)
with check (
  assigned_to = auth.uid()
  and is_completed = true
  and completed_at is not null
);

revoke all on public.master_job_titles from anon, authenticated;
revoke all on public.users from anon, authenticated;
revoke all on public.tasks from anon, authenticated;
revoke all on public.subtasks from anon, authenticated;

grant select on public.master_job_titles to authenticated;
grant select on public.users to authenticated;
grant select on public.tasks to authenticated;
grant select, insert on public.subtasks to authenticated;
grant update (is_completed, completed_at, completion_notes) on public.subtasks to authenticated;

grant usage, select on sequence public.master_job_titles_id_seq to authenticated;
grant usage, select on sequence public.tasks_id_seq to authenticated;
grant usage, select on sequence public.subtasks_id_seq to authenticated;
