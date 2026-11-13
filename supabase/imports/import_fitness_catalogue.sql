-- KLOZEVA Real Branded Fitness Catalogue Idempotent Importer (10 reference products)
-- Source: KLOZEVA_Fitness_Catalogue.zip
-- Prerequisite: Run migration supabase/migrations/20260301000010_global_catalogue_all_industries.sql first.
-- Safety guarantees:
--   1. Scoped prune + idempotent ON CONFLICT (sku) DO UPDATE keeps strictly these 10 fitness reference records.
--   2. Preserves stock_quantity = 0, is_demo_data = false, studio reference image_url, and exact nullable manufacturer_sku.
--   3. Never deletes retailer-owned public.products, prices, variants, or inventory.
--   4. Stores supplied URLs verbatim; non-HTTPS URLs are flagged with url_status = 'needs_review'.

delete from public.global_catalogue_products
where industry = 'fitness'::industry
  and sku not in (
    'KLOZEVA-FITN-001',
    'KLOZEVA-FITN-002',
    'KLOZEVA-FITN-003',
    'KLOZEVA-FITN-004',
    'KLOZEVA-FITN-005',
    'KLOZEVA-FITN-006',
    'KLOZEVA-FITN-007',
    'KLOZEVA-FITN-008',
    'KLOZEVA-FITN-009',
    'KLOZEVA-FITN-010'
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
  ('KLOZEVA-FITN-001', null::text, 'dumbbell-set', 'Weights', 'Weights', 'Dumbbell set', 'Weight Training 20 kg Partly Recycled Cast Iron Dumbbells Set', 'DOMYOS', 'Weight Training 20 kg Partly Recycled Cast Iron Dumbbells Set. Specifications transcribed conservatively from Decathlon''s product/category listing.', 5999.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '20 kg set; partly recycled cast iron', 'pending_verification', '/assets/fitness/fitn-001-domyos-dumbbell-set.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8018574/weight-training-20-kg-partly-recycled-cast-iron-dumbbells-set', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FITN-002', null::text, 'resistance-bands', 'Resistance training', 'Resistance training', 'Resistance bands', 'Elastic Training High Resistance Bands, Set of 3 -15, 25 and 35kg', 'CORENGTH', 'Elastic Training High Resistance Bands, Set of 3 -15, 25 and 35kg. Specifications transcribed conservatively from Decathlon''s product/category listing.', 1699.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Set of 3; resistance levels 15, 25 and 35 kg', 'pending_verification', '/assets/fitness/fitn-002-corength-resistance-bands.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8785433/elastic-training-high-resistance-bands-set-of-3-15-25-and-35kg', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FITN-003', null::text, 'pull-up-bar', 'Strength training', 'Strength training', 'Pull-up bar', 'Pull Up Bar 70cm Door Lockable, Supports upto 120kg - Black/Blue', 'CORENGTH', 'Pull Up Bar 70cm Door Lockable, Supports upto 120kg - Black/Blue. Specifications transcribed conservatively from Decathlon''s product/category listing.', 2599.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '70 cm; stated support up to 120 kg', 'pending_verification', '/assets/fitness/fitn-003-corength-pullup-bar.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8588490/pull-up-bar-70cm-door-lockable-supports-upto-120kg-black-blue', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FITN-004', null::text, 'yoga-mat', 'Yoga', 'Yoga', 'Yoga mat', 'Yoga Mat 8mm Thick, Anti-Slip Foam, 173 x 61 cm with Carry Strap - Jungle Blue', 'KIMJALY', 'Yoga Mat 8mm Thick, Anti-Slip Foam, 173 x 61 cm with Carry Strap - Jungle Blue. Specifications transcribed conservatively from Decathlon''s product/category listing.', 1999.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '8 mm thick; 173 x 61 cm; carry strap', 'pending_verification', '/assets/fitness/fitn-004-kimjaly-yoga-mat.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8380428/yoga-mat-8mm-thick-anti-slip-foam-173-x-61-cm-with-carry-strap-jungle-blue', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FITN-005', null::text, 'exercise-bench', 'Strength training', 'Strength training', 'Exercise bench', 'Gym Weight Bench, Foldable, 4 Incline levels, Supports upto 220kg, 500 - Black', 'DOMYOS', 'Gym Weight Bench, Foldable, 4 Incline levels, Supports upto 220kg, 500 - Black. Specifications transcribed conservatively from Decathlon''s product/category listing.', 7999.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Foldable; 4 incline levels; stated support up to 220 kg', 'pending_verification', '/assets/fitness/fitn-005-domyos-weight-bench.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8616804/gym-weight-bench-foldable-4-incline-levels-supports-upto-220kg-500-black', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FITN-006', null::text, 'kettlebell', 'Weights', 'Weights', 'Kettlebell', 'Soft kettlebell with wide handle 8 kg', 'DOMYOS', 'Soft kettlebell with wide handle 8 kg. Specifications transcribed conservatively from Decathlon''s product/category listing.', 2399.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '8 kg; wide handle', 'pending_verification', '/assets/fitness/fitn-006-domyos-kettlebell-8kg.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8946045/soft-kettlebell-with-wide-handle-8-kg', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FITN-007', null::text, 'skipping-rope', 'Cardio', 'Cardio', 'Skipping rope', 'Skipping Rope 500', 'DOMYOS', 'Skipping Rope 500. Specifications transcribed conservatively from Decathlon''s product/category listing.', 359.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '3 colours listed; 2-year warranty shown on page', 'pending_verification', '/assets/fitness/fitn-007-domyos-skipping-rope-500.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8819586/skipping-rope-500', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FITN-008', null::text, 'gym-gloves', 'Gym accessories', 'Gym accessories', 'Gym gloves', 'Weight Training Gloves Wrist Support and Grip - Black', 'DOMYOS', 'Weight Training Gloves Wrist Support and Grip - Black. Specifications transcribed conservatively from Decathlon''s product/category listing.', 799.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Palm grip and adjustable wrist tightening band; sizes S–2XL shown', 'pending_verification', '/assets/fitness/fitn-008-domyos-gym-gloves.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8882103/weight-training-gloves-wrist-support-and-grip-black', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FITN-009', null::text, 'foam-roller', 'Recovery', 'Recovery', 'Foam roller', 'Foam Massage Roller MR500, For Deep Tissue & Muscle Relief, 38 cm - Black', 'DECATHLON', 'Foam Massage Roller MR500, For Deep Tissue & Muscle Relief, 38 cm - Black. Specifications transcribed conservatively from Decathlon''s product/category listing.', 1599.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '38 cm; product listing on Decathlon category page', 'pending_verification', '/assets/fitness/fitn-009-decathlon-foam-roller.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8647291/hand-foam-massage-roller-deep-tissue-and-muscle-relief-38cm-black', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FITN-010', null::text, 'weighted-vest', 'Strength training', 'Strength training', 'Weighted vest', 'Adjustable Weighted Vest 6Kg with 4 Plates of 1Kg each, Expandable upto 14kg', 'DOMYOS', 'Adjustable Weighted Vest 6Kg with 4 Plates of 1Kg each, Expandable upto 14kg. Specifications transcribed conservatively from Decathlon''s product/category listing.', 4599.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '6 kg initial configuration; 4 x 1 kg plates; expandable up to 14 kg', 'pending_verification', '/assets/fitness/fitn-010-domyos-weighted-vest.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.decathlon.in/p/8786091/adjustable-weighted-vest-6kg-with-4-plates-of-1kg-each-expandable-upto-14kg', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.')
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
  'fitness'::industry,
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
  on pc.industry = 'fitness'::industry
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
