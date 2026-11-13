-- KLOZEVA Real Branded Beauty Catalogue Idempotent Importer (Curated 10 Virtual Try-On SKUs)
-- Source: KLOZEVA_Real_Branded_Beauty_Catalogue_(1).zip (10 unique Virtual Try-On enabled products across 6 makeup brands & 10 subcategories)
-- Prerequisite: Run migration supabase/migrations/20260301000008_beauty_catalogue.sql first.
-- Safety guarantees:
--   1. Scoped prune + idempotent ON CONFLICT (sku) DO UPDATE keeps strictly these 10 unique VTON SKUs with 0 duplicates.
--   2. Never sets stock_quantity > 0 (enforced = 0) or is_demo_data = true (enforced = false).
--   3. Never deletes retailer-owned public.products, prices, variants, or inventory.
--   4. Stores official verified source URLs verbatim.

delete from public.global_catalogue_products
where industry = 'beauty'::industry
  and sku not in (
    'KZ-BEA-0004',
    'KZ-BEA-0009',
    'KZ-BEA-0012',
    'KZ-BEA-0013',
    'KZ-BEA-0019',
    'KZ-BEA-0024',
    'KZ-BEA-0031',
    'KZ-BEA-0036',
    'KZ-BEA-0038',
    'KZ-BEA-0041'
  );

with source_rows (
  sku,
  category_slug,
  category_group,
  subcategory_group,
  subcategory,
  product_name,
  brand,
  description,
  reference_price,
  currency,
  price_status,
  variants_or_shades,
  image_url,
  image_source,
  image_verification_status,
  product_url,
  url_status,
  is_virtual_tryon_eligible,
  catalogue_note
) as (
  values
  ('KZ-BEA-0004', 'concealer', 'Makeup', 'Face Makeup', 'Concealer', 'Instant Age Rewind Eraser Concealer', 'Maybelline New York', 'Maybelline New York Instant Age Rewind Eraser Concealer. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', 599.00, 'INR', 'reference_price_verify_before_use', '9 shades listed; price reference from Nykaa', '/assets/beauty/concealer-sponge-wand.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://www.nykaa.com/brands/maybelline-new-york/c/596?id=596', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KZ-BEA-0009', 'lip-gloss', 'Makeup', 'Lip Makeup', 'Lip gloss', 'Lifter Gel Lip Gloss', 'Maybelline New York', 'Maybelline New York Lifter Gel Lip Gloss. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', null::numeric(10,2), 'INR', 'not_supplied', '8 shades listed', '/assets/beauty/lip-gloss-tube.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://www.maybelline.co.in/all-products', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KZ-BEA-0012', 'eyeliner', 'Makeup', 'Eye Makeup', 'Eyeliner', 'Tattoo Studio Smokey Gel Pencil Eyeliner', 'Maybelline New York', 'Maybelline New York Tattoo Studio Smokey Gel Pencil Eyeliner. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', null::numeric(10,2), 'INR', 'not_supplied', 'Black; verify current listing', '/assets/beauty/eyeliner-gel-pencil.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://www.maybelline.co.in/all-products', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KZ-BEA-0013', 'kajal', 'Makeup', 'Eye Makeup', 'Kajal', 'The Colossal Kajal', 'Maybelline New York', 'Maybelline New York The Colossal Kajal. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', 173.00, 'INR', 'reference_price_verify_before_use', 'Deep Black; price observed on Zepto listing', '/assets/beauty/kajal-stick.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://www.maybelline.co.in/all-products', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KZ-BEA-0019', 'liquid-lipstick', 'Makeup', 'Lip Makeup', 'Liquid lipstick', 'Forever Matte Liquid Lip', 'Lakmé', 'Lakmé Forever Matte Liquid Lip. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', 239.00, 'INR', 'reference_price_verify_before_use', 'Multiple shades; price reference from Purplle', '/assets/beauty/lipstick-liquid-matte.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://www.lakmeindia.com/', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KZ-BEA-0024', 'mascara', 'Makeup', 'Eye Makeup', 'Mascara', 'Voluminous Lash Paradise Mascara', 'L''Oréal Paris', 'L''Oréal Paris Voluminous Lash Paradise Mascara. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', 899.00, 'INR', 'reference_price_verify_before_use', 'Shade 204 Blackest Black; price reference from Nykaa', '/assets/beauty/mascara-lash-wand.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://www.lorealparis.co.in/', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KZ-BEA-0031', 'lipstick', 'Makeup', 'Lip Makeup', 'Bullet lipstick', 'Lustreglass Lipstick', 'M·A·C', 'M·A·C Lustreglass Lipstick. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', 2550.00, 'INR', 'reference_price_verify_before_use', 'Multiple shades; price reference from Tira', '/assets/beauty/lipstick-bullet-gloss.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://www.maccosmetics.in/', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KZ-BEA-0036', 'foundation', 'Makeup', 'Face Makeup', 'Foundation', 'All Day Matte & Poreless Foundation', 'Nykaa Cosmetics', 'Nykaa Cosmetics All Day Matte & Poreless Foundation. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', 487.00, 'INR', 'reference_price_verify_before_use', 'Multiple shades; price reference from Nykaa', '/assets/beauty/foundation-matte-bottle.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://www.nykaa.com/nykaa-cosmetics/c/102', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KZ-BEA-0038', 'blush', 'Makeup', 'Face Makeup', 'Blush', 'Cheek It Up Blush', 'Swiss Beauty', 'Swiss Beauty Cheek It Up Blush. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', 279.00, 'INR', 'reference_price_verify_before_use', 'Multiple shades; price reference from Amazon India', '/assets/beauty/blush-compact.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://swissbeauty.in/', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KZ-BEA-0041', 'eyeshadow', 'Makeup', 'Eye Makeup', 'Eyeshadow', 'Select Cushion Mousse Eyeshadow', 'Swiss Beauty', 'Swiss Beauty Select Cushion Mousse Eyeshadow. Verify product details, ingredients, pack size and claims with the brand before listing for sale.', 480.00, 'INR', 'reference_price_verify_before_use', 'Multiple shades; price reference from Swiss Beauty', '/assets/beauty/eyeshadow-single-mousse.jpg', 'klozeva_studio_reference', 'pending_verification', 'https://swissbeauty.in/', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.')
)
insert into public.global_catalogue_products (
  sku,
  industry,
  category_id,
  category_group,
  subcategory_group,
  subcategory,
  product_name,
  brand,
  description,
  reference_price,
  currency,
  price_status,
  variants_or_shades,
  stock_quantity,
  image_url,
  image_source,
  image_verification_status,
  product_url,
  url_status,
  is_virtual_tryon_eligible,
  is_demo_data,
  verification_status,
  catalogue_note,
  last_verified_at
)
select
  sr.sku,
  'beauty'::industry,
  pc.id,
  sr.category_group,
  sr.subcategory_group,
  sr.subcategory,
  sr.product_name,
  sr.brand,
  sr.description,
  sr.reference_price,
  sr.currency,
  sr.price_status,
  sr.variants_or_shades,
  0,
  sr.image_url,
  sr.image_source,
  sr.image_verification_status,
  sr.product_url,
  sr.url_status,
  sr.is_virtual_tryon_eligible,
  false,
  'pending_retailer_verification',
  sr.catalogue_note,
  now()
from source_rows sr
join public.product_categories pc
  on pc.industry = 'beauty'::industry
 and pc.slug = sr.category_slug
on conflict (sku) do update set
  category_id = excluded.category_id,
  category_group = excluded.category_group,
  subcategory_group = excluded.subcategory_group,
  subcategory = excluded.subcategory,
  product_name = excluded.product_name,
  brand = excluded.brand,
  description = excluded.description,
  reference_price = excluded.reference_price,
  currency = excluded.currency,
  price_status = excluded.price_status,
  variants_or_shades = excluded.variants_or_shades,
  stock_quantity = 0,
  image_url = excluded.image_url,
  image_source = excluded.image_source,
  image_verification_status = excluded.image_verification_status,
  product_url = excluded.product_url,
  url_status = excluded.url_status,
  is_virtual_tryon_eligible = excluded.is_virtual_tryon_eligible,
  is_demo_data = false,
  catalogue_note = excluded.catalogue_note,
  last_verified_at = now();
