-- Likes a la sección "Orden de implementación" (singleton).
-- Un like por persona; toggle = insert/delete.

create table public.impl_order_likes (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.impl_order_likes enable row level security;

create policy "impl_likes_read"   on public.impl_order_likes for select using (public.is_heydiga());
create policy "impl_likes_insert" on public.impl_order_likes for insert with check (public.is_heydiga() and profile_id = auth.uid());
create policy "impl_likes_delete" on public.impl_order_likes for delete using (public.is_heydiga() and profile_id = auth.uid());
