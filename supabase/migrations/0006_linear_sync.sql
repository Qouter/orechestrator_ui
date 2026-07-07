-- Enlace y sync de tareas con Linear (la app manda; mirror de estado una vía).
alter table public.tasks add column if not exists source            text not null default 'manual';
alter table public.tasks add column if not exists linear_id         text;
alter table public.tasks add column if not exists linear_uuid       text;
alter table public.tasks add column if not exists linear_url        text;
alter table public.tasks add column if not exists linear_state      text;
alter table public.tasks add column if not exists linear_state_type text;
alter table public.tasks add column if not exists linear_priority   integer;
alter table public.tasks add column if not exists git_branch        text;
alter table public.tasks add column if not exists linear_synced_at  timestamptz;

create unique index if not exists tasks_linear_id_idx
  on public.tasks (linear_id) where linear_id is not null;
