-- =====================================================
-- UMCD Church Store — Supabase Schema
-- Run this in the Supabase SQL Editor for project zdpstnmfcfbcmhtfayls
-- =====================================================

-- ---------- PRODUCTS ----------
-- A product is a sellable item type: "T-Shirt", "Hoodie", "Jacket", etc.
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,                      -- e.g. "Christian Ed T-Shirt"
  product_type text not null,              -- e.g. "tshirt" | "hoodie" | "jacket" (extensible, free text)
  description text,
  base_price numeric(10,2) not null default 0,
  sizes text[] not null default array['S','M','L','XL','2XL'],  -- ordered list of available sizes
  size_price_overrides jsonb not null default '{}'::jsonb,      -- e.g. {"2XL": 22.00, "3XL": 24.00}
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- COLORS (global pool) ----------
create table if not exists colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               -- e.g. "Burgundy", "Heather Grey"
  hex_value text,                          -- for swatch display, e.g. "#3D0026"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- PRODUCT_COLORS (join: which colors a product offers) ----------
create table if not exists product_colors (
  product_id uuid not null references products(id) on delete cascade,
  color_id uuid not null references colors(id) on delete cascade,
  primary key (product_id, color_id)
);

-- ---------- DESIGNS (global pool) ----------
create table if not exists designs (
  id uuid primary key default gen_random_uuid(),
  name text not null,                      -- e.g. "UMCD Cross Logo"
  image_path text not null,                -- path in Supabase storage bucket
  category text,                           -- optional grouping, e.g. "Christian Ed", "General"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- DESIGN_PRODUCTS (join: which products a design is allowed on) ----------
create table if not exists design_products (
  design_id uuid not null references designs(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (design_id, product_id)
);

-- ---------- PLACEMENTS ----------
-- Kept as a simple lookup table (not global pool/join) since placement options
-- are pretty universal (front/back/left chest) — admin can edit the list directly.
create table if not exists placements (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               -- e.g. "Front", "Back", "Left Chest"
  active boolean not null default true,
  sort_order int not null default 0
);

insert into placements (name, sort_order) values
  ('Front', 1), ('Back', 2), ('Left Chest', 3)
on conflict (name) do nothing;

-- ---------- ORDERS ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,       -- human-friendly, e.g. "ORD-2026-0001"
  customer_name text not null,
  customer_email text,
  customer_phone text,
  notes text,
  status text not null default 'new',      -- new | invoiced | paid | picked_up | cancelled
  total_estimated numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ORDER_ITEMS ----------
-- Snapshots product/design names + price at time of order so later edits to
-- products/designs/prices don't retroactively change historical orders.
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  design_id uuid references designs(id) on delete set null,
  product_name_snapshot text not null,
  design_name_snapshot text,
  placement text,
  size text not null,
  color text not null,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- Public can read active catalog data + insert orders.
-- Admin (authenticated) can do everything — mirrors your other UMCD apps'
-- pattern of Supabase Auth + role check. Adjust the admin check below to
-- match however you're gating admin access in Church App / One Board
-- (e.g. a profiles table with role = 'admin', or a fixed email allowlist).
-- =====================================================

alter table products enable row level security;
alter table colors enable row level security;
alter table product_colors enable row level security;
alter table designs enable row level security;
alter table design_products enable row level security;
alter table placements enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Public read of active catalog data
create policy "public read active products" on products
  for select using (active = true);
create policy "public read colors" on colors
  for select using (active = true);
create policy "public read product_colors" on product_colors
  for select using (true);
create policy "public read active designs" on designs
  for select using (active = true);
create policy "public read design_products" on design_products
  for select using (true);
create policy "public read placements" on placements
  for select using (active = true);

-- Public can insert orders + order_items (no auth required to submit an order)
create policy "public insert orders" on orders
  for insert with check (true);
create policy "public insert order_items" on order_items
  for insert with check (true);

-- Admin full access — checks against the existing shared `profiles` table
-- (role = 'admin'), same pattern as your other UMCD apps. This assumes
-- `profiles` already exists in the shared Supabase project with at least
-- columns (id uuid references auth.users, role text). If your actual
-- profiles table/column names differ, adjust the subquery below to match.
create policy "admin full access products" on products
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
create policy "admin full access colors" on colors
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
create policy "admin full access product_colors" on product_colors
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
create policy "admin full access designs" on designs
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
create policy "admin full access design_products" on design_products
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
create policy "admin full access placements" on placements
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
create policy "admin full access orders" on orders
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
create policy "admin full access order_items" on order_items
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- =====================================================
-- STORAGE
-- Run separately or via Supabase dashboard Storage UI:
-- Create a public bucket named 'store-designs' for design/graphic images.
-- =====================================================
-- insert into storage.buckets (id, name, public) values ('store-designs', 'store-designs', true)
-- on conflict (id) do nothing;
