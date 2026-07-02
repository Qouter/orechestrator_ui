-- Completar + historial para la cola de implementación.
alter table public.impl_queue add column if not exists completed_at timestamptz;
alter table public.impl_queue add column if not exists archived_at  timestamptz;

-- La unicidad de task_id pasa a aplicar solo a entradas ACTIVAS (no archivadas),
-- para poder re-encolar una tarea que ya pasó por el historial.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'impl_queue_task_id_key') then
    alter table public.impl_queue drop constraint impl_queue_task_id_key;
  end if;
end $$;

create unique index if not exists impl_queue_active_task_idx
  on public.impl_queue (task_id) where archived_at is null;

create index if not exists impl_queue_archived_idx
  on public.impl_queue (archived_at desc) where archived_at is not null;
