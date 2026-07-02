-- Orchestrator UI — esquema inicial
-- Tablero GTM (Ventas/Onboarding/Retention) con login Slack + auditoría.
-- Ejecutar en el SQL editor de Supabase o vía `supabase db push`.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type phase       as enum ('ventas', 'onboarding', 'retention');
create type progress    as enum ('por_empezar', 'en_curso', 'en_revision', 'hecho');
create type priority    as enum ('urgente', 'importante', 'normal');
create type complexity  as enum ('S', 'M', 'L', 'XL');

-- ── profiles (espejo de auth.users con datos de Slack) ───────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  slack_user_id text,
  name          text,
  email         text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- ── tasks ────────────────────────────────────────────────────────────────────
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  note         text,
  phase        phase not null default 'ventas',
  progress     progress not null default 'por_empezar',
  priority     priority not null default 'normal',
  complexity   complexity,                         -- nullable: a rellenar en la UI
  requested_by text,                               -- etiqueta libre (quién la pidió)
  position     double precision not null default 0,-- orden dentro de la fase (índice fraccional)
  archived     boolean not null default false,
  created_by   uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tasks_phase_position_idx on public.tasks (phase, position) where not archived;

-- ── impl_queue (orden de implementación cross-fase; copias de tareas) ─────────
create table public.impl_queue (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  position   double precision not null default 0,
  added_by   uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (task_id)                                 -- dedupe: una tarea, una vez
);
create index impl_queue_position_idx on public.impl_queue (position);

-- ── task_activity (auditoría: constancia de quién cambió qué) ─────────────────
create table public.task_activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid,                                 -- sin FK dura: sobrevive a deletes
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,                        -- create|update|move_phase|reorder|delete|queue_add|queue_remove
  changes    jsonb,                                -- diff old/new por campo
  created_at timestamptz not null default now()
);
create index task_activity_task_idx on public.task_activity (task_id, created_at desc);

-- ── Trigger: updated_at ──────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger tasks_touch_updated
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ── Trigger: espejar auth.users → profiles al crear/actualizar usuario ───────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, avatar_url, slack_user_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             new.email),
    coalesce(new.raw_user_meta_data ->> 'avatar_url',
             new.raw_user_meta_data ->> 'picture'),
    new.raw_user_meta_data ->> 'provider_id'
  )
  on conflict (id) do update set
    email      = excluded.email,
    name       = coalesce(excluded.name, public.profiles.name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    slack_user_id = coalesce(excluded.slack_user_id, public.profiles.slack_user_id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Gate por dominio del email del token (Slack devuelve el email en el JWT).
create or replace function public.is_heydiga()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') like '%@heydiga.com'
$$;

alter table public.profiles      enable row level security;
alter table public.tasks         enable row level security;
alter table public.impl_queue    enable row level security;
alter table public.task_activity enable row level security;

-- profiles: lectura para autenticados; update del propio.
create policy "profiles_read"       on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- tasks / impl_queue: CRUD para @heydiga.com.
create policy "tasks_rw"      on public.tasks      for all using (public.is_heydiga()) with check (public.is_heydiga());
create policy "impl_queue_rw" on public.impl_queue for all using (public.is_heydiga()) with check (public.is_heydiga());

-- task_activity: insert + select para @heydiga.com; inmutable (sin update/delete).
create policy "activity_read"   on public.task_activity for select using (public.is_heydiga());
create policy "activity_insert" on public.task_activity for insert with check (public.is_heydiga());
