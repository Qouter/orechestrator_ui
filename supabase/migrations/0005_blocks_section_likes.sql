-- Likes a la sección "Bloques" (singleton, un like por persona).
create table public.blocks_section_likes (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.blocks_section_likes enable row level security;

create policy "blocks_likes_read"   on public.blocks_section_likes for select using (public.is_heydiga());
create policy "blocks_likes_insert" on public.blocks_section_likes for insert with check (public.is_heydiga() and profile_id = auth.uid());
create policy "blocks_likes_delete" on public.blocks_section_likes for delete using (public.is_heydiga() and profile_id = auth.uid());
