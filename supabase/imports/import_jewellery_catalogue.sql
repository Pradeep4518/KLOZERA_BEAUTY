-- KLOZEVA Real Branded Jewellery Catalogue Idempotent Importer (10 reference products)
-- Source: KLOZEVA_Jewellery_Catalogue.zip
-- Prerequisite: Run migration supabase/migrations/20260301000010_global_catalogue_all_industries.sql first.
-- Safety guarantees:
--   1. Scoped prune + idempotent ON CONFLICT (sku) DO UPDATE keeps strictly these 10 jewellery reference records.
--   2. Preserves stock_quantity = 0, is_demo_data = false, studio reference image_url, and exact nullable manufacturer_sku.
--   3. Never deletes retailer-owned public.products, prices, variants, or inventory.
--   4. Stores supplied URLs verbatim; non-HTTPS URLs are flagged with url_status = 'needs_review'.

delete from public.global_catalogue_products
where industry = 'jewellery'::industry
  and sku not in (
    'KLOZEVA-JEWE-001',
    'KLOZEVA-JEWE-002',
    'KLOZEVA-JEWE-003',
    'KLOZEVA-JEWE-004',
    'KLOZEVA-JEWE-005',
    'KLOZEVA-JEWE-006',
    'KLOZEVA-JEWE-007',
    'KLOZEVA-JEWE-008',
    'KLOZEVA-JEWE-009',
    'KLOZEVA-JEWE-010'
  );

with source_rows (
  sku,
  manufacturer_sku,
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
  sizes,
  colours,
  material_or_specifications,
  stock_status,
  image_url,
  image_source,
  image_verification_status,
  image_license_status,
  product_url,
  url_status,
  is_virtual_tryon_eligible,
  catalogue_note
) as (
  values
  ('KLOZEVA-JEWE-001', '50d5h4dglada2a2ja000001', 'earrings', 'Jewellery', 'Jewellery', 'Earrings', 'Flourishing Vine Diamond Drop Earrings', 'Tanishq', 'Flourishing Vine Diamond Drop Earrings, listed on Tanishq''s official India product catalogue.', 66812.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '18K yellow and white gold; 0.151 ct diamond; gross weight 3.157 g', 'pending_verification', '/assets/jewellery/jewe-001-flourishing-vine-earring.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/flourishing-vine-diamond-drop-earrings-50d5h4dglada2a.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-JEWE-002', '50oxfdfbclaap32eb000198', 'rings', 'Jewellery', 'Jewellery', 'Rings', 'Celestial Halo Gold Finger Ring', 'Tanishq', 'Celestial Halo Gold Finger Ring, listed on Tanishq''s official India product catalogue.', 84452.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '18K gold; weight 5.89 g; ring size 16.40 mm', 'pending_verification', '/assets/jewellery/jewe-002-celestial-halo-ring.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/celestial-halo-gold-finger-ring-50oxfdfbcaap3.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-JEWE-003', '50d3ptdlvaba6a2bd000002', 'earrings', 'Jewellery', 'Jewellery', 'Earrings', 'Radiant Pearl Diamond Drop Earrings', 'Tanishq', 'Radiant Pearl Diamond Drop Earrings, listed on Tanishq''s official India product catalogue.', 44739.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '18K gold; 0.08 ct diamond; weight 2.379 g', 'pending_verification', '/assets/jewellery/jewe-003-radiant-pearl-earring.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/radiant-pearl-diamond-drop-earrings-50d3ptdlvaba6a.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-JEWE-004', '50d6c4bwjdlap12ed000003', 'bracelets', 'Jewellery', 'Jewellery', 'Bracelets', 'Soft Orbit Gold Bracelet', 'Tanishq', 'Soft Orbit Gold Bracelet, listed on Tanishq''s official India product catalogue.', 24303.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '18K gold; weight 1.776 g; size 19.00 cm', 'pending_verification', '/assets/jewellery/jewe-004-soft-orbit-bracelet.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/soft-orbit-gold-bracelet-50d6c4bwjlap1.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-JEWE-005', '50d4i2fgjkaa2a3ia000001', 'rings', 'Jewellery', 'Jewellery', 'Rings', 'Twisted Halo Diamond Finger Ring', 'Tanishq', 'Twisted Halo Diamond Finger Ring, listed on Tanishq''s official India product catalogue.', 22185.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '18K gold; 0.056 ct diamond; weight 1.003 g; ring size 16.00 mm', 'pending_verification', '/assets/jewellery/jewe-005-twisted-halo-diamond-ring.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/twisted-halo-diamond-finger-ring-50d4i2fgjaa2a.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-JEWE-006', '51o6fdycqiaap12eb000117', 'mangalsutra', 'Jewellery', 'Jewellery', 'Mangalsutra', 'Sunlit Vows Gold Mangalsutra', 'Tanishq', 'Sunlit Vows Gold Mangalsutra, listed on Tanishq''s official India product catalogue.', 327369.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '22K gold; weight 18.86 g; length 20 inches', 'pending_verification', '/assets/jewellery/jewe-006-sunlit-vows-mangalsutra.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/sunlit-vows-gold-mangalsutra-51o6fdycqaap1.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-JEWE-007', '50d6c4yqxgaa002ed000169', 'mangalsutra', 'Jewellery', 'Jewellery', 'Mangalsutra', 'Swinging Grid Gold Mangalsutra', 'Tanishq', 'Swinging Grid Gold Mangalsutra, listed on Tanishq''s official India product catalogue.', 58033.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '18K gold; weight 4.264 g; length 18 inches', 'pending_verification', '/assets/jewellery/jewe-007-swinging-grid-mangalsutra.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/swinging-grid-gold-mangalsutra-50d6c4yqxaa00.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-JEWE-008', '502999fxslaa2a3ia000118', 'rings', 'Jewellery', 'Jewellery', 'Rings', 'Delicate Modern Diamond Ring', 'Tanishq', 'Delicate Modern Diamond Ring, listed on Tanishq''s official India product catalogue.', 20820.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '18K gold; 0.043 ct diamond; weight 1.048 g; ring size 16.40 mm', 'pending_verification', '/assets/jewellery/jewe-008-delicate-modern-diamond-ring.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/delicate-modern-diamond-ring-502999fxsaa2a.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-JEWE-009', '51d6c4yphgaa002ed000133', 'mangalsutra', 'Jewellery', 'Jewellery', 'Mangalsutra', 'Whispering Leaf Gold Mangalsutra', 'Tanishq', 'Whispering Leaf Gold Mangalsutra, listed on Tanishq''s official India product catalogue.', 64001.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '22K gold; weight 3.895 g; length 18 inches', 'pending_verification', '/assets/jewellery/jewe-009-whispering-leaf-mangalsutra.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/whispering-leaf-gold-mangalsutra-51d6c4yphaa00.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-JEWE-010', '50d4pidjbaga2a2bd000014', 'earrings', 'Jewellery', 'Jewellery', 'Earrings', 'Luminous Sway Diamond Drop Earrings', 'Tanishq', 'Luminous Sway Diamond Drop Earrings, listed on Tanishq''s official India product catalogue.', 60139.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '18K gold; 0.185 ct diamond; weight 2.22 g', 'pending_verification', '/assets/jewellery/jewe-010-luminous-sway-earring.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.tanishq.co.in/product/luminous-sway-diamond-drop-earrings-50d4pidjbaga2a.html?lang=en_IN', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.')
)
insert into public.global_catalogue_products (
  sku,
  manufacturer_sku,
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
  sizes,
  colours,
  material_or_specifications,
  stock_quantity,
  stock_status,
  image_url,
  image_source,
  image_verification_status,
  image_license_status,
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
  sr.manufacturer_sku,
  'jewellery'::industry,
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
  sr.sizes,
  sr.colours,
  sr.material_or_specifications,
  0,
  sr.stock_status,
  sr.image_url,
  sr.image_source,
  sr.image_verification_status,
  sr.image_license_status,
  sr.product_url,
  sr.url_status,
  sr.is_virtual_tryon_eligible,
  false,
  'pending_retailer_verification',
  sr.catalogue_note,
  now()
from source_rows sr
join public.product_categories pc
  on pc.industry = 'jewellery'::industry
 and pc.slug = sr.category_slug
on conflict (sku) do update set
  manufacturer_sku = excluded.manufacturer_sku,
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
  sizes = excluded.sizes,
  colours = excluded.colours,
  material_or_specifications = excluded.material_or_specifications,
  stock_quantity = 0,
  stock_status = excluded.stock_status,
  image_url = excluded.image_url,
  image_source = excluded.image_source,
  image_verification_status = excluded.image_verification_status,
  image_license_status = excluded.image_license_status,
  product_url = excluded.product_url,
  url_status = excluded.url_status,
  is_virtual_tryon_eligible = excluded.is_virtual_tryon_eligible,
  is_demo_data = false,
  catalogue_note = excluded.catalogue_note,
  last_verified_at = now();
