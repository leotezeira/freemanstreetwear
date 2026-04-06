-- Carrusel de productos en Home
-- Ejecutar en Supabase SQL Editor

create table if not exists public.product_carousel_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_product_carousel_unique_product on public.product_carousel_items (product_id);
create index if not exists idx_product_carousel_sort on public.product_carousel_items (sort_order);

alter table public.product_carousel_items enable row level security;

drop policy if exists "Public read active carousel" on public.product_carousel_items;
create policy "Public read active carousel"
on public.product_carousel_items
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins full access product carousel" on public.product_carousel_items;
create policy "Admins full access product carousel"
on public.product_carousel_items
for all
to authenticated
using (
  exists (
    select 1 from public.admins a where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
)
with check (
  exists (
    select 1 from public.admins a where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
);
