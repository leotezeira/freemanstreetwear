-- Migration: Sistema de Bundles
-- Ejecutar en Supabase SQL Editor

-- Tabla bundles
create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  slug text unique,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price >= 0),
  is_active boolean not null default true,
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bundles_slug on public.bundles(slug);
create index if not exists idx_bundles_is_active on public.bundles(is_active);

-- Tabla bundle_items
create table if not exists public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_bundle_items_bundle_id on public.bundle_items(bundle_id);
create index if not exists idx_bundle_items_product_id on public.bundle_items(product_id);

-- RLS para bundles
alter table public.bundles enable row level security;

drop policy if exists "Public can read active bundles" on public.bundles;
create policy "Public can read active bundles"
on public.bundles
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins full access bundles" on public.bundles;
create policy "Admins full access bundles"
on public.bundles
for all
to authenticated
using (true)
with check (true);

-- RLS para bundle_items
alter table public.bundle_items enable row level security;

drop policy if exists "Public can read bundle items" on public.bundle_items;
create policy "Public can read bundle items"
on public.bundle_items
for select
to anon, authenticated
using (exists (
  select 1 from public.bundles b 
  where b.id = bundle_id and b.is_active = true
));

drop policy if exists "Admins full access bundle items" on public.bundle_items;
create policy "Admins full access bundle items"
on public.bundle_items
for all
to authenticated
using (true)
with check (true);
