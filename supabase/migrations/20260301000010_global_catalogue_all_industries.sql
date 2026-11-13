-- KLOZEVA All-Industry Global Branded Reference Catalogue Migration (000010)
-- Strictly additive & idempotent extension after 000009.
-- Adds schema support for verified/unverified external prices, nullable manufacturer_sku,
-- structured sizes/colours/materials metadata, image license audit status, and category rows
-- across Fashion, Fitness, Jewellery, and Salon while preserving all Beauty & Stage 1-9 data.
--
-- IMPORTANT (Supabase Dashboard SQL Editor compatibility):
-- ZERO `SELECT ... INTO` or `RETURNING ... INTO` statements inside $$ blocks.

-- 1. Extend public.global_catalogue_products for multi-industry branded reference fields
alter table public.global_catalogue_products add column if not exists manufacturer_sku text;
alter table public.global_catalogue_products add column if not exists material_or_specifications text not null default '';
alter table public.global_catalogue_products add column if not exists sizes text[] not null default '{}';
alter table public.global_catalogue_products add column if not exists colours text[] not null default '{}';
alter table public.global_catalogue_products add column if not exists image_license_status text;
alter table public.global_catalogue_products add column if not exists stock_status text not null default 'pending_verification';

alter table public.global_catalogue_products drop constraint if exists global_catalogue_products_manufacturer_sku_check;
alter table public.global_catalogue_products add constraint global_catalogue_products_manufacturer_sku_check
  check (manufacturer_sku is null or char_length(manufacturer_sku) between 1 and 80);

alter table public.global_catalogue_products drop constraint if exists global_catalogue_products_stock_status_check;
alter table public.global_catalogue_products add constraint global_catalogue_products_stock_status_check
  check (stock_status in ('pending_verification', 'pending_retailer_verification', 'verified'));

do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'global_catalogue_products'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%price_status%'
  loop
    execute format('alter table public.global_catalogue_products drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.global_catalogue_products add constraint global_catalogue_products_price_status_check
  check (price_status in ('not_supplied', 'reference_price_verify_before_use', 'verified', 'requires verification'));

create index if not exists global_catalogue_manufacturer_sku_idx
  on public.global_catalogue_products (manufacturer_sku)
  where manufacturer_sku is not null;

-- 2. Extend public.product_categories with taxonomy metadata & new industry subcategories
alter table public.product_categories add column if not exists parent_group text;
alter table public.product_categories add column if not exists sub_group text;

-- Update existing category rows safely without changing their primary key IDs
update public.product_categories
  set parent_group = 'Clothing', sub_group = 'Clothing'
  where industry = 'fashion' and slug in ('dresses', 'shirts', 'trousers', 'jackets', 'traditional');
update public.product_categories
  set parent_group = 'Accessories', sub_group = 'Accessories'
  where industry = 'fashion' and slug = 'accessories';

update public.product_categories
  set parent_group = 'Programmes & Plans', sub_group = 'Programmes & Memberships'
  where industry = 'fitness' and slug in ('programmes', 'memberships');
update public.product_categories
  set parent_group = 'Apparel & Wearables', sub_group = 'Apparel'
  where industry = 'fitness' and slug = 'apparel';
update public.product_categories
  set parent_group = 'Equipment & Gear', sub_group = 'General Equipment'
  where industry = 'fitness' and slug in ('equipment', 'wearables');

update public.product_categories
  set parent_group = 'Jewellery', sub_group = 'Jewellery'
  where industry = 'jewellery' and slug in ('rings', 'necklaces', 'pendants', 'earrings', 'bracelets', 'bridal');

update public.product_categories
  set parent_group = 'Salon services', sub_group = 'Salon services'
  where industry = 'salon' and slug in ('haircuts', 'hairstyles', 'hair-colour', 'treatments');
update public.product_categories
  set parent_group = 'Hair care', sub_group = 'Hair care'
  where industry = 'salon' and slug = 'haircare';

-- Seed additional industry categories for the 40 real branded reference products
insert into public.product_categories (industry, slug, name, sort_order, parent_group, sub_group) values
  -- Fashion
  ('fashion', 'womens-top',  'Women''s tops',         7,  'Clothing',    'Clothing'),
  ('fashion', 't-shirt',     'T-shirts',              8,  'Clothing',    'Clothing'),
  ('fashion', 'jeans',       'Jeans',                 9,  'Clothing',    'Clothing'),
  ('fashion', 'co-ord-set',  'Ethnic / co-ord sets',  10, 'Clothing',    'Clothing'),
  ('fashion', 'sandals',     'Sandals',               11, 'Footwear',    'Footwear'),
  ('fashion', 'handbag',     'Handbags',              12, 'Accessories', 'Accessories'),

  -- Fitness
  ('fitness', 'dumbbell-set',     'Dumbbell sets',     6,  'Weights',             'Weights'),
  ('fitness', 'kettlebell',       'Kettlebells',       7,  'Weights',             'Weights'),
  ('fitness', 'resistance-bands', 'Resistance bands',  8,  'Resistance training', 'Resistance training'),
  ('fitness', 'pull-up-bar',      'Pull-up bars',      9,  'Strength training',   'Strength training'),
  ('fitness', 'exercise-bench',   'Exercise benches',  10, 'Strength training',   'Strength training'),
  ('fitness', 'weighted-vest',    'Weighted vests',    11, 'Strength training',   'Strength training'),
  ('fitness', 'yoga-mat',         'Yoga mats',         12, 'Yoga',                'Yoga'),
  ('fitness', 'skipping-rope',    'Skipping ropes',    13, 'Cardio',              'Cardio'),
  ('fitness', 'gym-gloves',       'Gym gloves',        14, 'Gym accessories',     'Gym accessories'),
  ('fitness', 'foam-roller',      'Foam rollers',      15, 'Recovery',            'Recovery'),

  -- Jewellery
  ('jewellery', 'mangalsutra', 'Mangalsutra', 7, 'Jewellery', 'Jewellery'),

  -- Salon (Hair care)
  ('salon', 'hair-mask',       'Hair masks',                       6,  'Hair care', 'Hair care'),
  ('salon', 'shampoo',         'Shampoos',                         7,  'Hair care', 'Hair care'),
  ('salon', 'hair-care-combo', 'Hair-care combos',                 8,  'Hair care', 'Hair care'),
  ('salon', 'hair-serum',      'Hair serums',                      9,  'Hair care', 'Hair care'),
  ('salon', 'conditioner',     'Conditioners',                     10, 'Hair care', 'Hair care'),
  ('salon', 'heat-protection', 'Heat-protection styling products', 11, 'Hair care', 'Hair care')
on conflict (industry, slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  parent_group = excluded.parent_group,
  sub_group = excluded.sub_group;

