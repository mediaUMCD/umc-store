-- =====================================================
-- UMCD Church Store — Sample Seed Data
-- Run AFTER schema.sql, in the Supabase SQL Editor.
-- This gives you a few colors + products to test the public
-- order form against before you load real Christian Ed merch data.
-- Designs are NOT seeded here since they require actual image
-- uploads — add a couple through the Admin > Designs page once
-- this seed data is in, then assign them to these products.
-- =====================================================

-- ---------- Sample colors ----------
insert into colors (name, hex_value) values
  ('Burgundy', '#3D0026'),
  ('Heather Grey', '#9B9B9B'),
  ('Black', '#1A1A1A'),
  ('White', '#FFFFFF'),
  ('Navy', '#1B2A4A')
on conflict (name) do nothing;

-- ---------- Sample products ----------
insert into products (name, product_type, description, base_price, sizes, size_price_overrides, sort_order)
values
  (
    'Christian Ed Fundraiser T-Shirt',
    'tshirt',
    'Soft cotton tee supporting Christian Ed fundraising.',
    18.00,
    array['YS','YM','YL','S','M','L','XL','2XL'],
    '{"2XL": 20.00}'::jsonb,
    1
  ),
  (
    'Christian Ed Fundraiser Hoodie',
    'hoodie',
    'Cozy fleece hoodie supporting Christian Ed fundraising.',
    32.00,
    array['S','M','L','XL','2XL','3XL'],
    '{"2XL": 35.00, "3XL": 37.00}'::jsonb,
    2
  ),
  (
    'UMCD Lightweight Jacket',
    'jacket',
    'Lightweight zip jacket with embroidered or printed logo option.',
    45.00,
    array['S','M','L','XL','2XL'],
    '{"2XL": 48.00}'::jsonb,
    3
  )
on conflict do nothing;

-- ---------- Link sample products to sample colors ----------
-- (T-shirt: all 5 colors / Hoodie: Burgundy, Grey, Black, Navy / Jacket: Black, Navy)
insert into product_colors (product_id, color_id)
select p.id, c.id
from products p, colors c
where p.name = 'Christian Ed Fundraiser T-Shirt'
  and c.name in ('Burgundy', 'Heather Grey', 'Black', 'White', 'Navy')
on conflict do nothing;

insert into product_colors (product_id, color_id)
select p.id, c.id
from products p, colors c
where p.name = 'Christian Ed Fundraiser Hoodie'
  and c.name in ('Burgundy', 'Heather Grey', 'Black', 'Navy')
on conflict do nothing;

insert into product_colors (product_id, color_id)
select p.id, c.id
from products p, colors c
where p.name = 'UMCD Lightweight Jacket'
  and c.name in ('Black', 'Navy')
on conflict do nothing;

-- =====================================================
-- After running this:
-- 1. Go to Admin > Designs and upload 1-2 test graphics
-- 2. When uploading, check the boxes to assign them to one or
--    more of these 3 sample products
-- 3. Then visit the public store home to test the full order flow
-- =====================================================
