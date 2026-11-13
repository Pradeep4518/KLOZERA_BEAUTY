-- KLOZEVA Real Branded Salon Catalogue Idempotent Importer (10 reference products)
-- Source: KLOZEVA_Salon_Catalogue.zip
-- Prerequisite: Run migration supabase/migrations/20260301000010_global_catalogue_all_industries.sql first.
-- Safety guarantees:
--   1. Scoped prune + idempotent ON CONFLICT (sku) DO UPDATE keeps strictly these 10 salon reference records.
--   2. Preserves stock_quantity = 0, is_demo_data = false, studio reference image_url, and exact nullable manufacturer_sku.
--   3. Never deletes retailer-owned public.products, prices, variants, or inventory.
--   4. Stores supplied URLs verbatim; non-HTTPS URLs are flagged with url_status = 'needs_review'.

delete from public.global_catalogue_products
where industry = 'salon'::industry
  and sku not in (
    'KLOZEVA-SALO-001',
    'KLOZEVA-SALO-002',
    'KLOZEVA-SALO-003',
    'KLOZEVA-SALO-004',
    'KLOZEVA-SALO-005',
    'KLOZEVA-SALO-006',
    'KLOZEVA-SALO-007',
    'KLOZEVA-SALO-008',
    'KLOZEVA-SALO-009',
    'KLOZEVA-SALO-010'
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
  ('KLOZEVA-SALO-001', null::text, 'hair-mask', 'Hair care', 'Hair care', 'Hair mask', 'L''Oréal Professionnel Absolut Repair Mask For Dry and Damaged Hair With Protein & Omega-9', 'L''Oréal Professionnel', 'Professional hair mask listed for dry and damaged hair; product name references Protein & Omega-9.', 899.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Hair-care formulation; full ingredient list on product page', 'pending_verification', '/assets/salon/salo-001-loreal-absolut-repair-mask.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/l-oreal-professional-absolut-repair-lipidium-masque/p/18400', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-SALO-002', null::text, 'shampoo', 'Hair care', 'Hair care', 'Shampoo', 'L''Oréal Professionnel Absolut Repair Shampoo For Dry and Damaged Hair With Protein & Omega-9', 'L''Oréal Professionnel', 'Professional shampoo listed for dry and damaged hair; product name references Protein & Omega-9.', 716.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Hair-care formulation; full ingredient list on product page', 'pending_verification', '/assets/salon/salo-002-loreal-absolut-repair-shampoo.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/l-oreal-professional-absolut-repair-lipidium-shampoo/p/18402', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-SALO-003', null::text, 'hair-mask', 'Hair care', 'Hair care', 'Hair mask', 'Wella Professionals Elements Renewing Sulphate Free Hair Mask', 'Wella Professionals', 'Sulphate-free renewing hair mask from the Wella Professionals Elements range.', 1240.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Sulphate-free; full ingredient list on product page', 'pending_verification', '/assets/salon/salo-003-wella-elements-renewing-mask.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/wella-professionals-elements-renewing-mask-150-ml/p/70560', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-SALO-004', null::text, 'shampoo', 'Hair care', 'Hair care', 'Shampoo', 'L''Oreal Professionnel Xtenso Care Sulfate-Free Shampoo, Frizz-Free & Shiny Hair With Pro-Keratin', 'L''Oréal Professionnel', 'Sulfate-free shampoo in the Xtenso Care range; listing describes frizz-free and shiny hair with Pro-Keratin.', 1120.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Sulfate-free; Pro-Keratin referenced in product name', 'pending_verification', '/assets/salon/salo-004-loreal-xtenso-care-shampoo.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/l-oreal-professionnel-x-tenso-care-shampoo-sulfate-free-250ml/p/874067', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-SALO-005', null::text, 'hair-mask', 'Hair care', 'Hair care', 'Hair mask', 'L''Oreal Professionnel Xtenso Care Sulfate-Free Masque, Frizz-Free & Shiny Hair With Pro-Keratin', 'L''Oréal Professionnel', 'Sulfate-free masque in the Xtenso Care range; listing describes frizz-free and shiny hair with Pro-Keratin.', 1350.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Sulfate-free; Pro-Keratin referenced in product name', 'pending_verification', '/assets/salon/salo-005-loreal-xtenso-care-masque.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/l-oreal-professionnel-x-tenso-care-masque-sulfate-free-200ml/p/874066', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-SALO-006', null::text, 'hair-care-combo', 'Hair care', 'Hair care', 'Hair-care combo', 'Matrix Professional InstaCure Shampoo, Conditioner, Porosity Spray Combo', 'Matrix', 'InstaCure shampoo, conditioner and porosity spray combo listed by Nykaa.', 1332.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Combo contents stated in product title; individual volumes require checking', 'pending_verification', '/assets/salon/salo-006-matrix-instacure-combo.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/matrix-opti-repair-shampoo-conditioner-spray-with-liquid-protein-for-damaged-hair/p/10396847', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-SALO-007', null::text, 'shampoo', 'Hair care', 'Hair care', 'Shampoo', 'L’Oréal Professionnel Vitamino Color Shampoo for Color Protection & Shine With Resveratrol', 'L''Oréal Professionnel', 'Vitamino Color shampoo listed for colour protection and shine; product name references Resveratrol.', 795.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Resveratrol referenced in product name', 'pending_verification', '/assets/salon/salo-007-loreal-vitamino-color-shampoo.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/l-oreal-professional-series-expert-a-ox-vitamino-color-shampoo/p/10506', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-SALO-008', null::text, 'hair-serum', 'Hair care', 'Hair care', 'Hair serum', 'Biolage Smoothproof Professional 6-in-1 Deep Smoothening Hair Serum', 'Biolage', 'Smoothproof 6-in-1 deep-smoothing serum listed for dry and frizzy hair.', 347.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Avocado referenced in product listing; full ingredient list on product page', 'pending_verification', '/assets/salon/salo-008-biolage-smoothproof-serum.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/matrix-biolage-smooth-proof-avocado-deep-smoothing-hair-serum/p/196207', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-SALO-009', null::text, 'conditioner', 'Hair care', 'Hair care', 'Conditioner', 'Wella Professionals Invigo Nutri-Enrich Conditioner For Dry, Frizzy & Damaged Hair With Goji Berry', 'Wella Professionals', 'Invigo Nutri-Enrich conditioner listed for dry, frizzy and damaged hair; product name references Goji Berry.', 786.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Goji Berry referenced in product name', 'pending_verification', '/assets/salon/salo-009-wella-invigo-conditioner.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/wella-professionals-invigo-nutri-enrich-deep-nourishing-conditioner/p/415930', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-SALO-010', null::text, 'heat-protection', 'Hair care', 'Hair care', 'Heat-protection styling product', 'BBLUNT Hot Shot Heat Protection Hair Mist with Grape Seed Oil & Provitamin-B5', 'BBLUNT', 'Hot Shot heat-protection hair mist; product title references Grape Seed Oil and Provitamin-B5.', 399.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], 'Grape Seed Oil and Provitamin-B5 referenced in product name', 'pending_verification', '/assets/salon/salo-010-bblunt-hotshot-mist.jpg', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.nykaa.com/bblunt-hot-shot-heat-protection-hair-mist/p/565841', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.')
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
  'salon'::industry,
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
  on pc.industry = 'salon'::industry
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
