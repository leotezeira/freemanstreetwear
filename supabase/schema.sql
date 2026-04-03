create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists is_active boolean not null default true;

alter table public.products add column if not exists compare_at_price numeric(12,2) check (compare_at_price >= 0);
alter table public.products add column if not exists category text;
alter table public.products add column if not exists tags text[] not null default '{}';
alter table public.products add column if not exists weight_grams integer check (weight_grams >= 0);
alter table public.products add column if not exists height integer check (height >= 0);
alter table public.products add column if not exists width integer check (width >= 0);
alter table public.products add column if not exists length integer check (length >= 0);
alter table public.products add column if not exists slug text;
alter table public.products add column if not exists meta_title text;
alter table public.products add column if not exists meta_description text;
alter table public.products add column if not exists is_featured boolean not null default false;

create unique index if not exists idx_products_slug_unique on public.products (slug);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text not null,
  sku text,
  stock integer not null default 0 check (stock >= 0),
  price numeric(12,2) check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_product_variants_sku on public.product_variants(sku);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_path text,
  image_data bytea,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (image_path is not null and image_data is null)
    or
    (image_path is null and image_data is not null)
  )
);

create index if not exists idx_product_images_product_id on public.product_images(product_id);
create index if not exists idx_product_images_primary on public.product_images(product_id, is_primary);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  postal_code text not null,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  shipping_amount numeric(12,2) not null default 0 check (shipping_amount >= 0),
  shipping_type text check (shipping_type in ('D','S')),
  shipping_price numeric(12,2) not null default 0 check (shipping_price >= 0),
  shipping_agency_code text,
  shipping_id text,
  tracking_number text,
  shipping_status text,
  tracking_events jsonb,
  last_tracking_sync_at timestamptz,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'approved', 'rejected')),
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_orders_shipping_id_unique
on public.orders (shipping_id)
where shipping_id is not null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  price_at_purchase numeric(12,2) not null check (price_at_purchase >= 0)
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.shipping_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weight_grams integer not null check (weight_grams > 0),
  height integer check (height >= 0),
  width integer check (width >= 0),
  length integer check (length >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_name on public.products using gin (to_tsvector('simple', name));
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admins enable row level security;
alter table public.site_content enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.shipping_presets enable row level security;

drop policy if exists "Public can read available products" on public.products;
create policy "Public can read available products"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read product variants" on public.product_variants;
create policy "Public can read product variants"
on public.product_variants
for select
to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.is_active = true));

drop policy if exists "Public can read product images" on public.product_images;
create policy "Public can read product images"
on public.product_images
for select
to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.is_active = true));

drop policy if exists "Admins full access products" on public.products;
create policy "Admins full access products"
on public.products
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
);

drop policy if exists "Admins full access product variants" on public.product_variants;
create policy "Admins full access product variants"
on public.product_variants
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
);

drop policy if exists "Admins full access product images" on public.product_images;
create policy "Admins full access product images"
on public.product_images
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
);

drop policy if exists "Admins full access orders" on public.orders;
create policy "Admins full access orders"
on public.orders
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
);

drop policy if exists "Admins full access order items" on public.order_items;
create policy "Admins full access order items"
on public.order_items
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
);

drop policy if exists "Users manage own cart" on public.carts;
create policy "Users manage own cart"
on public.carts
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Admins full access shipping presets" on public.shipping_presets;
create policy "Admins full access shipping presets"
on public.shipping_presets
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
);

drop policy if exists "Admins read admins" on public.admins;
create policy "Admins read admins"
on public.admins
for select
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
);

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content
for select
to anon, authenticated
using (true);

drop policy if exists "Admins full access site content" on public.site_content;
create policy "Admins full access site content"
on public.site_content
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  )
);

insert into public.site_content (key, value)
values
  ('accent_color', '"#111827"'::jsonb),
  ('logo_text', '"Freeman Store"'::jsonb),
  ('logo_url', 'null'::jsonb),
  (
    'nav_links',
    '[{"label":"Home","href":"/"},{"label":"Shop","href":"/shop"},{"label":"Sobre nosotros","href":"/sobre-nosotros"},{"label":"Contacto","href":"/contacto"}]'::jsonb
  ),
  (
    'footer',
    '{"email":"hola@freemanstore.com","copyrightText":"© Freeman Store. Todos los derechos reservados.","socialLinks":[{"label":"Instagram","href":"https://instagram.com"},{"label":"TikTok","href":"https://tiktok.com"}]}'::jsonb
  ),
  (
    'home_content',
    '{"heroTitle":"Streetwear premium para todos los días","heroSubtitle":"Colecciones minimalistas con identidad urbana y entrega rápida.","heroCtaLabel":"Comprar ahora","heroCtaHref":"/shop","heroImageUrl":"https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80","promoTitle":"Envío fijo a todo el país","promoSubtitle":"Checkout simple y pago seguro con MercadoPago.","newsletterTitle":"Recibí novedades","newsletterSubtitle":"Suscribite para enterarte de lanzamientos y reposiciones."}'::jsonb
  )
on conflict (key) do nothing;

-- Hero banners style fields (opcional, no interfiere si no existe la tabla)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hero_banners') THEN
    ALTER TABLE public.hero_banners
      ADD COLUMN IF NOT EXISTS title_font text,
      ADD COLUMN IF NOT EXISTS subtitle_font text,
      ADD COLUMN IF NOT EXISTS text_color text,
      ADD COLUMN IF NOT EXISTS cta_text_color text,
      ADD COLUMN IF NOT EXISTS cta_bg_color text;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Tabla no existe o ya tiene las columnas.
  NULL;
END$$;

