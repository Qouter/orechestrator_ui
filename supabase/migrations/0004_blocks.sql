-- Bloques: dimensión ortogonal a la fase, priorizable (position).
create table public.blocks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#5b8cff',
  description text,
  position    double precision not null default 0,
  archived    boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index blocks_position_idx on public.blocks (position) where not archived;

alter table public.tasks
  add column block_id uuid references public.blocks (id) on delete set null;
create index tasks_block_idx on public.tasks (block_id) where not archived;

alter table public.blocks enable row level security;
create policy "blocks_rw" on public.blocks
  for all using (public.is_heydiga()) with check (public.is_heydiga());

create trigger blocks_touch_updated
  before update on public.blocks
  for each row execute function public.touch_updated_at();
