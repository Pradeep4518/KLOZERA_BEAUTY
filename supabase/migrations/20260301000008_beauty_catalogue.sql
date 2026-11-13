-- KLOZEVA Real Branded Beauty Catalogue Production Migration (000008)
-- Strictly additive & idempotent extension preserving all existing customers,
-- retailers, orders/appointments, 5-industry products, and RLS guarantees.
-- NOTE: No `SELECT ... INTO` or `RETURNING ... INTO` is used inside $$ functions for
-- Supabase Dashboard SQL Editor compatibility.

-- 1. Extend public.product_categories with taxonomy grouping & full Section 2 Beauty tree
alter table public.product_categories add column if not exists parent_group text;
alter table public.product_categories add column if not exists sub_group text;

-- Update existing Beauty category rows safely without changing their primary key IDs
update public.product_categories set parent_group = 'Makeup',   sub_group = 'Face Makeup'      where industry = 'beauty' and slug in ('foundation', 'concealer', 'blush', 'highlighter');
update public.product_categories set parent_group = 'Makeup',   sub_group = 'Lip Makeup'       where industry = 'beauty' and slug = 'lipstick';
update public.product_categories set parent_group = 'Makeup',   sub_group = 'Eye Makeup'       where industry = 'beauty' and slug in ('eyeshadow', 'eyeliner', 'mascara');
update public.product_categories set parent_group = 'Makeup',   sub_group = 'General Makeup'   where industry = 'beauty' and slug = 'other-makeup';
update public.product_categories set parent_group = 'Skincare', sub_group = 'General Skincare' where industry = 'beauty' and slug = 'skincare';

-- Seed complete Beauty Section 2 taxonomy + uploaded ZIP subcategories (empty categories remain empty with 0 fake products)
insert into public.product_categories (industry, slug, name, sort_order, parent_group, sub_group) values
  -- A. Makeup > Face Makeup
  ('beauty', 'foundation',        'Foundation',        1,  'Makeup', 'Face Makeup'),
  ('beauty', 'concealer',         'Concealer',         2,  'Makeup', 'Face Makeup'),
  ('beauty', 'primer',            'Primer',            11, 'Makeup', 'Face Makeup'),
  ('beauty', 'compact-powder',    'Compact Powder',    12, 'Makeup', 'Face Makeup'),
  ('beauty', 'face-powder',       'Face Powder',       13, 'Makeup', 'Face Makeup'),
  ('beauty', 'loose-powder',      'Loose Powder',      14, 'Makeup', 'Face Makeup'),
  ('beauty', 'powder-foundation', 'Powder Foundation', 15, 'Makeup', 'Face Makeup'),
  ('beauty', 'skin-tint',         'Skin Tint',         16, 'Makeup', 'Face Makeup'),
  ('beauty', 'blush',             'Blush',             4,  'Makeup', 'Face Makeup'),
  ('beauty', 'bronzer',           'Bronzer',           17, 'Makeup', 'Face Makeup'),
  ('beauty', 'highlighter',       'Highlighter',       10, 'Makeup', 'Face Makeup'),
  ('beauty', 'setting-spray',     'Setting Spray',     18, 'Makeup', 'Face Makeup'),

  -- A. Makeup > Lip Makeup
  ('beauty', 'lipstick',          'Lipstick',          3,  'Makeup', 'Lip Makeup'),
  ('beauty', 'liquid-lipstick',   'Liquid Lipstick',   19, 'Makeup', 'Lip Makeup'),
  ('beauty', 'lip-gloss',         'Lip Gloss',         20, 'Makeup', 'Lip Makeup'),
  ('beauty', 'lip-liner',         'Lip Liner',         21, 'Makeup', 'Lip Makeup'),
  ('beauty', 'lip-tint',          'Lip Tint',          22, 'Makeup', 'Lip Makeup'),
  ('beauty', 'lip-balm',          'Lip Balm',          23, 'Makeup', 'Lip Makeup'),
  ('beauty', 'lip-colour',        'Lip Colour',        24, 'Makeup', 'Lip Makeup'),
  ('beauty', 'mini-lipstick',     'Mini Lipstick',     25, 'Makeup', 'Lip Makeup'),

  -- A. Makeup > Eye Makeup
  ('beauty', 'eyeshadow',         'Eyeshadow',         7,  'Makeup', 'Eye Makeup'),
  ('beauty', 'eyeshadow-palette', 'Eyeshadow Palette', 26, 'Makeup', 'Eye Makeup'),
  ('beauty', 'eyeliner',          'Eyeliner',          8,  'Makeup', 'Eye Makeup'),
  ('beauty', 'kajal',             'Kajal',             27, 'Makeup', 'Eye Makeup'),
  ('beauty', 'mascara',           'Mascara',           9,  'Makeup', 'Eye Makeup'),
  ('beauty', 'eyebrow-products',  'Eyebrow Products',  28, 'Makeup', 'Eye Makeup'),
  ('beauty', 'false-eyelashes',   'False Eyelashes',   29, 'Makeup', 'Eye Makeup'),

  -- B. Skincare
  ('beauty', 'face-cleanser',     'Face Cleanser',     30, 'Skincare', 'Skincare'),
  ('beauty', 'face-wash',         'Face Wash',         31, 'Skincare', 'Skincare'),
  ('beauty', 'toner',             'Toner',             32, 'Skincare', 'Skincare'),
  ('beauty', 'face-serum',        'Face Serum',        33, 'Skincare', 'Skincare'),
  ('beauty', 'moisturizer',       'Moisturizer',       34, 'Skincare', 'Skincare'),
  ('beauty', 'sunscreen',         'Sunscreen',         35, 'Skincare', 'Skincare'),
  ('beauty', 'exfoliator',        'Exfoliator',        36, 'Skincare', 'Skincare'),
  ('beauty', 'face-mask',         'Face Mask',         37, 'Skincare', 'Skincare'),
  ('beauty', 'night-cream',       'Night Cream',       38, 'Skincare', 'Skincare'),
  ('beauty', 'eye-cream',         'Eye Cream',         39, 'Skincare', 'Skincare'),

  -- C. Beauty Accessories
  ('beauty', 'makeup-brushes',    'Makeup Brushes',    40, 'Beauty Accessories', 'Beauty Accessories'),
  ('beauty', 'beauty-sponges',    'Beauty Sponges',    41, 'Beauty Accessories', 'Beauty Accessories'),
  ('beauty', 'applicators',       'Applicators',       42, 'Beauty Accessories', 'Beauty Accessories'),
  ('beauty', 'makeup-tools',      'Makeup Tools',      43, 'Beauty Accessories', 'Beauty Accessories'),
  ('beauty', 'makeup-removers',   'Makeup Removers',   44, 'Beauty Accessories', 'Beauty Accessories'),

  -- D. Nail Care
  ('beauty', 'nail-polish',       'Nail Polish',       45, 'Nail Care', 'Nail Care'),
  ('beauty', 'base-coat',         'Base Coat',         46, 'Nail Care', 'Nail Care'),
  ('beauty', 'top-coat',          'Top Coat',          47, 'Nail Care', 'Nail Care'),
  ('beauty', 'nail-remover',      'Nail Remover',      48, 'Nail Care', 'Nail Care'),
  ('beauty', 'nail-care-products','Nail Care Products',49, 'Nail Care', 'Nail Care')
on conflict (industry, slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  parent_group = excluded.parent_group,
  sub_group = excluded.sub_group;

-- 2. Canonical Global Branded Product Reference Table
-- Holds real branded product references pending retailer verification, selection, and confirmed inventory.
-- Distinct from retailer-owned `public.products` and variant stock `public.product_variants`.
create table if not exists public.global_catalogue_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (char_length(sku) between 2 and 40),
  industry industry not null default 'beauty',
  category_id int not null references public.product_categories(id),
  category_group text not null,
  subcategory_group text not null,
  subcategory text not null,
  product_name text not null check (char_length(product_name) between 2 and 120),
  brand text not null check (char_length(brand) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  reference_price numeric(10, 2) null check (reference_price is null or (reference_price >= 0 and reference_price <= 10000000)),
  currency text not null default 'INR',
  price_status text not null default 'not_supplied' check (price_status in ('not_supplied', 'reference_price_verify_before_use')),
  variants_or_shades text not null default '',
  stock_quantity int not null default 0 check (stock_quantity = 0),
  image_url text null,
  image_source text null,
  image_verification_status text not null default 'unavailable' check (
    image_verification_status in ('unavailable', 'pending_verification', 'verified_manufacturer', 'verified_retailer_authorized')
  ),
  product_url text not null,
  url_status text not null default 'verified' check (url_status in ('verified', 'needs_review')),
  is_virtual_tryon_eligible boolean not null default false,
  is_demo_data boolean not null default false check (is_demo_data = false),
  verification_status text not null default 'pending_retailer_verification' check (
    verification_status in ('pending_retailer_verification', 'verified_reference')
  ),
  catalogue_note text not null default '',
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists global_catalogue_industry_cat_idx
  on public.global_catalogue_products (industry, category_id, brand);
create index if not exists global_catalogue_brand_idx
  on public.global_catalogue_products (brand);

drop trigger if exists global_catalogue_touch on public.global_catalogue_products;
create trigger global_catalogue_touch
  before update on public.global_catalogue_products
  for each row execute function public.touch_updated_at();

alter table public.global_catalogue_products enable row level security;

drop policy if exists global_catalogue_select on public.global_catalogue_products;
create policy global_catalogue_select on public.global_catalogue_products
  for select to authenticated using (true);

revoke all on public.global_catalogue_products from anon;
revoke insert, update, delete on public.global_catalogue_products from authenticated;
grant select on public.global_catalogue_products to authenticated;

-- 3. Extend retailer-owned `public.products` and `public.product_images`
alter table public.products add column if not exists global_product_id uuid references public.global_catalogue_products(id) on delete set null;
alter table public.products add column if not exists sku text check (sku is null or char_length(sku) <= 40);
alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists source_url text;
alter table public.products add column if not exists price_status text not null default 'verified_retailer_price';
alter table public.products add column if not exists image_source text;
alter table public.products add column if not exists image_verification_status text not null default 'pending';

alter table public.products drop constraint if exists products_price_status_check;
alter table public.products add constraint products_price_status_check
  check (price_status in ('verified_retailer_price', 'reference_price_verify_before_use', 'not_supplied'));

create unique index if not exists products_business_global_uniq_idx
  on public.products (business_id, global_product_id)
  where global_product_id is not null;
create index if not exists products_global_product_idx
  on public.products (global_product_id)
  where global_product_id is not null;

alter table public.product_images add column if not exists image_source text;
alter table public.product_images add column if not exists verification_status text not null default 'retailer_uploaded';

-- Guard that a retailer cannot link a global catalogue product from another industry
create or replace function public.products_z_global_guard() returns trigger
language plpgsql as $$
begin
  if new.global_product_id is not null then
    if not exists (
      select 1 from public.global_catalogue_products g
      where g.id = new.global_product_id and g.industry = new.industry
    ) then
      raise exception 'category_mismatch';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists products_z_global_guard on public.products;
create trigger products_z_global_guard
  before insert or update on public.products
  for each row execute function public.products_z_global_guard();

-- 4. Customer Wishlist, Analytics & Virtual Try-On Linkage to Global References
alter table public.saved_items add column if not exists global_product_id uuid references public.global_catalogue_products(id) on delete cascade;
alter table public.tryon_results add column if not exists global_product_id uuid references public.global_catalogue_products(id) on delete set null;
alter table public.analytics_events add column if not exists global_product_id uuid references public.global_catalogue_products(id) on delete set null;

alter table public.saved_items drop constraint if exists saved_items_product_or_tryon_check;
alter table public.saved_items add constraint saved_items_product_or_tryon_check
  check (product_id is not null or global_product_id is not null or item_type = 'tryon_result');

drop index if exists saved_items_user_global_fav_idx;
create unique index if not exists saved_items_user_global_fav_idx
  on public.saved_items (user_id, global_product_id)
  where global_product_id is not null and item_type <> 'tryon_result';

drop policy if exists saved_insert on public.saved_items;
create policy saved_insert on public.saved_items for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active()
    and (
      (product_id is not null and exists (select 1 from public.products p where p.id = product_id))
      or (global_product_id is not null and exists (select 1 from public.global_catalogue_products g where g.id = global_product_id))
    )
  );

-- Replace save_tryon_result cleanly without PostgREST overload ambiguity
drop function if exists public.save_tryon_result(uuid, uuid, text, text, industry, jsonb);
create or replace function public.save_tryon_result(
  p_product_id uuid,
  p_variant_id uuid,
  p_engine text,
  p_storage_path text,
  p_industry industry default null,
  p_metadata jsonb default '{}'::jsonb,
  p_global_product_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_consent boolean;
  v_id uuid := gen_random_uuid();
  v_industry industry;
  v_global_eligible boolean;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;

  -- Explicit 'tryon_save' consent required
  v_consent := (
    select cr.granted
    from public.consent_records cr
    where cr.user_id = auth.uid() and cr.purpose = 'tryon_save'
    order by cr.created_at desc
    limit 1
  );

  if coalesce(v_consent, false) = false then
    raise exception 'consent_required';
  end if;

  -- Storage path MUST start with caller auth.uid()
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_storage_path';
  end if;

  if p_product_id is not null then
    v_industry := (
      select p.industry
      from public.products p
      join public.businesses b on b.id = p.business_id
      where p.id = p_product_id and (b.status = 'verified' or public.is_business_member(b.id) or public.is_admin())
      limit 1
    );
    if v_industry is null then
      raise exception 'product_not_found';
    end if;
  elsif p_global_product_id is not null then
    v_global_eligible := (
      select g.is_virtual_tryon_eligible
      from public.global_catalogue_products g
      where g.id = p_global_product_id
      limit 1
    );
    if v_global_eligible is null then
      raise exception 'product_not_found';
    end if;
    if v_global_eligible = false then
      raise exception 'invalid_request';
    end if;
    v_industry := (
      select g.industry from public.global_catalogue_products g where g.id = p_global_product_id limit 1
    );
  else
    v_industry := p_industry;
  end if;

  insert into public.tryon_results (id, user_id, product_id, global_product_id, variant_id, engine, storage_path, industry, metadata)
  values (v_id, auth.uid(), p_product_id, p_global_product_id, p_variant_id, p_engine, p_storage_path, coalesce(p_industry, v_industry), coalesce(p_metadata, '{}'::jsonb));

  insert into public.saved_items (user_id, product_id, global_product_id, item_type, tryon_result_id)
  values (auth.uid(), p_product_id, p_global_product_id, 'tryon_result', v_id);

  return v_id;
end $$;

revoke all on function public.save_tryon_result(uuid, uuid, text, text, industry, jsonb, uuid) from public, anon;
grant execute on function public.save_tryon_result(uuid, uuid, text, text, industry, jsonb, uuid) to authenticated;

-- 5. Stock-Confirmed & Consent-Checked CRM Notification Dispatch (Section 10)
-- Only sends personalized in-app notifications when:
--   1. Business is verified
--   2. Product is active
--   3. At least one active variant has confirmed stock > 0
--   4. Customer is active, opted into 'new_arrivals' + 'in_app', and preferences/shade notes match
create or replace function public.dispatch_stock_confirmed_notifications(p_product_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
  v_biz_status business_status;
  v_biz_name text;
  v_ind industry;
  v_prod_name text;
  v_brand text;
  v_subcat text;
  v_cat_id int;
  v_cat_name text;
  v_is_active boolean;
  v_tryon boolean;
  v_total_stock int := 0;
  v_link text;
begin
  v_biz_id := (select p.business_id from public.products p where p.id = p_product_id);
  if v_biz_id is null then return; end if;

  v_is_active := (select p.is_active from public.products p where p.id = p_product_id);
  if coalesce(v_is_active, false) = false then return; end if;

  v_biz_status := (select b.status from public.businesses b where b.id = v_biz_id);
  if v_biz_status is distinct from 'verified' then return; end if;

  v_total_stock := coalesce((
    select sum(pv.stock)::int
    from public.product_variants pv
    where pv.product_id = p_product_id
      and pv.is_active = true
      and pv.stock > 0
  ), 0);

  if v_total_stock <= 0 then return; end if;

  v_biz_name := (select b.name from public.businesses b where b.id = v_biz_id);
  v_ind := (select p.industry from public.products p where p.id = p_product_id);
  v_prod_name := (select p.name from public.products p where p.id = p_product_id);
  v_brand := (select p.brand from public.products p where p.id = p_product_id);
  v_subcat := (select p.subcategory from public.products p where p.id = p_product_id);
  v_cat_id := (select p.category_id from public.products p where p.id = p_product_id);
  v_tryon := (select p.tryon_supported from public.products p where p.id = p_product_id);
  v_cat_name := (select pc.name from public.product_categories pc where pc.id = v_cat_id);
  v_link := '/customer/product/' || p_product_id::text;

  insert into public.notifications (user_id, category, title, body, product_id, link)
  select
    cp.user_id,
    'new_arrivals',
    case when v_tryon then 'In-stock try-on match: ' || v_prod_name else 'Now in stock: ' || v_prod_name end,
    coalesce(v_biz_name, 'Verified retailer') || ' confirmed stock (' || v_total_stock || ' units) for ' || v_prod_name ||
      case when v_cat_name is not null then ' in ' || v_cat_name else '' end ||
      case when v_tryon then '. Virtual try-on preview is ready.' else '.' end,
    p_product_id,
    v_link
  from public.customer_preferences cp
  join public.profiles pr on pr.id = cp.user_id
  where pr.status = 'active'
    and coalesce((cp.topics ->> 'new_arrivals')::boolean, true) = true
    and coalesce((cp.channels ->> 'in_app')::boolean, true) = true
    and (
      v_ind = any(cp.preferred_industries)
      or (v_brand is not null and exists (
        select 1 from unnest(cp.favourite_brands) fb where lower(trim(fb)) = lower(trim(v_brand))
      ))
      or (v_cat_name is not null and exists (
        select 1 from unnest(cp.categories) ct where lower(trim(ct)) = lower(trim(v_cat_name))
      ))
      or (v_subcat is not null and exists (
        select 1 from unnest(cp.categories) ct where lower(trim(ct)) = lower(trim(v_subcat))
      ))
      or (cp.beauty_notes is not null and trim(cp.beauty_notes) <> '' and exists (
        select 1
        from public.product_variants pv
        where pv.product_id = p_product_id
          and pv.is_active = true
          and pv.stock > 0
          and (
            position(lower(trim(pv.label)) in lower(cp.beauty_notes)) > 0
            or position(lower(v_prod_name) in lower(cp.beauty_notes)) > 0
          )
      ))
    )
    and not exists (
      select 1 from public.notifications n
      where n.user_id = cp.user_id and n.product_id = p_product_id and n.category = 'new_arrivals'
    );
end $$;

revoke all on function public.dispatch_stock_confirmed_notifications(uuid) from public, anon, authenticated;

create or replace function public.notify_matching_customers_on_product() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_active then
    perform public.dispatch_stock_confirmed_notifications(new.id);
  end if;
  return new;
end $$;

drop trigger if exists products_notify_matches on public.products;
create trigger products_notify_matches
  after insert or update of is_active, tryon_supported, category_id, brand on public.products
  for each row execute function public.notify_matching_customers_on_product();

create or replace function public.notify_matching_customers_on_variant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_active = true and new.stock > 0 and (
    tg_op = 'INSERT'
    or coalesce(old.stock, 0) <= 0
    or coalesce(old.is_active, false) = false
  ) then
    perform public.dispatch_stock_confirmed_notifications(new.product_id);
  end if;
  return new;
end $$;

drop trigger if exists variants_notify_matches on public.product_variants;
create trigger variants_notify_matches
  after insert or update of stock, is_active, label on public.product_variants
  for each row execute function public.notify_matching_customers_on_variant();

create or replace function public.notify_matching_customers_on_business_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from 'verified' and new.status = 'verified' then
    perform public.dispatch_stock_confirmed_notifications(p.id)
    from public.products p
    where p.business_id = new.id and p.is_active = true;
  end if;
  return new;
end $$;

drop trigger if exists businesses_verified_notify_matches on public.businesses;
create trigger businesses_verified_notify_matches
  after update of status on public.businesses
  for each row execute function public.notify_matching_customers_on_business_verified();
