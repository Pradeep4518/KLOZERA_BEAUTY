-- KLOZEVA Real Branded Fashion Catalogue Idempotent Importer (10 reference products)
-- Source: KLOZEVA_Fashion_Catalogue.zip
-- Prerequisite: Run migration supabase/migrations/20260301000010_global_catalogue_all_industries.sql first.
-- Safety guarantees:
--   1. Scoped prune + idempotent ON CONFLICT (sku) DO UPDATE keeps strictly these 10 fashion reference records.
--   2. Preserves stock_quantity = 0, is_demo_data = false, studio reference image_url, and exact nullable manufacturer_sku.
--   3. Never deletes retailer-owned public.products, prices, variants, or inventory.
--   4. Stores supplied URLs verbatim; non-HTTPS URLs are flagged with url_status = 'needs_review'.

delete from public.global_catalogue_products
where industry = 'fashion'::industry
  and sku not in (
    'KLOZEVA-FASH-001',
    'KLOZEVA-FASH-002',
    'KLOZEVA-FASH-003',
    'KLOZEVA-FASH-004',
    'KLOZEVA-FASH-005',
    'KLOZEVA-FASH-006',
    'KLOZEVA-FASH-007',
    'KLOZEVA-FASH-008',
    'KLOZEVA-FASH-009',
    'KLOZEVA-FASH-010'
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
  ('KLOZEVA-FASH-001', null::text, 'shirts', 'Clothing', 'Clothing', 'Men''s shirt', 'Men’s Navy blue Regular Fit Corduroy shirt', 'H&M', 'Navy blue regular-fit corduroy shirt listed by H&M India.', 1999.00, 'INR', 'verified', '', '{}'::text[], array['Navy blue']::text[], 'Corduroy; composition not independently captured', 'pending_verification', '/assets/fashion/fash-001-hm-corduroy-shirt.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www2.hm.com/en_in/productpage.1289456021.html', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FASH-002', null::text, 'womens-top', 'Clothing', 'Clothing', 'Women''s top', 'Sophia Top', 'The Open Form', 'Oversized top with a back keyhole opening and hand-embroidered detailing; handspun handwoven cotton-linen listing.', 15300.00, 'INR', 'verified', '', array['S (shown on listing; other sizes require checking)']::text[], array['Indigo']::text[], 'Handspun handwoven cotton-linen', 'pending_verification', '/assets/fashion/fash-002-sophia-indigo-top.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://ekke.co/product/sophia-top', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FASH-003', null::text, 't-shirt', 'Clothing', 'Clothing', 'T-shirt', 'Internet Is Broken 2 T-Shirt', 'Nobero', 'Men''s graphic-print T-shirt listed in olive green by Nobero.', 599.00, 'INR', 'requires verification', '', '{}'::text[], array['Olive green']::text[], '', 'pending_verification', '/assets/fashion/fash-003-nobero-olive-tee.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://nobero.com/products/internet-is-broken-2?variant=43969657012390', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FASH-004', null::text, 'jeans', 'Clothing', 'Clothing', 'Jeans', 'Mast & Harbour Men Light Fade Regular Fit Pocket Detail Jeans', 'Mast & Harbour', 'Men''s light-fade regular-fit jeans with pocket detail; Myntra listing.', 811.00, 'INR', 'requires verification', '', '{}'::text[], '{}'::text[], '', 'pending_verification', '/assets/fashion/fash-004-mast-harbour-jeans.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'http://www.myntra.com/Jeans/Mast+%26+Harbour/Mast--Harbour-Men-Light-Fade-Regular-Fit-Pocket-Detail-Jeans/26697326/buy', 'needs_review', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FASH-005', null::text, 'jackets', 'Clothing', 'Clothing', 'Jacket', 'StyleCast x Revolte Men Hooded Puffer Jacket', 'StyleCast x Revolte', 'Black solid hooded puffer jacket with two pockets, zip closure, long sleeves and woollen lining, as described by Myntra.', 1762.00, 'INR', 'verified', '', '{}'::text[], array['Black']::text[], 'Woollen lining; shell composition not captured', 'pending_verification', '/assets/fashion/fash-005-stylecast-black-puffer.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'http://www.myntra.com/Jackets/StyleCast+x+Revolte/StyleCast-x-Revolte-Men-Hooded-Puffer-Jacket/31011309/buy?storeContext=fwd', 'needs_review', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FASH-006', null::text, 'co-ord-set', 'Clothing', 'Clothing', 'Ethnic wear / co-ord set', 'Women''s Soch Mustard Crepe Bandhani Co-Ord Set', 'Soch', 'Mustard crepe Bandhani co-ord set listed by Soch; retailer description identifies a top and palazzo pants.', 2598.00, 'INR', 'requires verification', '', '{}'::text[], array['Mustard']::text[], 'Crepe (retailer description)', 'pending_verification', '/assets/fashion/fash-006-soch-bandhani-coord.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.amazon.in/Soch-Womens-Mustard-Bandhani-Co-Ord/dp/B0GPD69ZZ2', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FASH-007', null::text, 'dresses', 'Clothing', 'Clothing', 'Dress', 'Allen Solly Woman Print Midi Dress', 'Allen Solly', 'White printed midi dress; Myntra listing description identifies a cotton-spandex blend.', 2564.00, 'INR', 'verified', '', '{}'::text[], array['White']::text[], 'Cotton and spandex blend (retailer description)', 'pending_verification', '/assets/fashion/fash-007-allen-solly-midi-dress.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'http://www.myntra.com/Dresses/Allen+Solly+Woman/Allen-Solly-Woman-Print-Midi-Dress/41536866/buy', 'needs_review', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FASH-008', null::text, 'sandals', 'Footwear', 'Footwear', 'Sandals', 'Lulu Crystal-Buckle Leather Toe-Post Sandals', 'FitFlop', 'Pink leather toe-post sandals with crystal-embellished buckle; product listing hosted by Mochi Shoes.', 6399.00, 'INR', 'verified', '', '{}'::text[], array['Pink']::text[], 'Leather; crystal-embellished buckle (listing title)', 'pending_verification', '/assets/fashion/fash-008-fitflop-crystal-sandals.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://www.mochishoes.com/product/fitflop-228-381-pink-casual-slippers', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FASH-009', null::text, 'handbag', 'Accessories', 'Accessories', 'Handbag', 'Harmony Handbag', 'Miraggio', 'Everyday handbag with turn-lock closure; description from Miraggio''s product listing.', 3249.00, 'INR', 'verified', '', '{}'::text[], '{}'::text[], '', 'pending_verification', '/assets/fashion/fash-009-miraggio-harmony-handbag.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://miraggiolife.com/products/harmony-handbag?variant=43548989423828', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.'),
  ('KLOZEVA-FASH-010', null::text, 'jeans', 'Clothing', 'Clothing', 'Jeans', 'Burnt Dusty Blue Dirty Wash Baggy Jeans for Men & Women', 'WHAT THE FLEX', 'Unisex baggy-fit jeans in a dusty-blue dirty wash, as named on the brand listing.', 2099.00, 'INR', 'verified', '', '{}'::text[], array['Dusty blue']::text[], 'Denim; fibre composition not captured', 'pending_verification', '/assets/fashion/fash-010-wtf-baggy-jeans.png', 'klozeva_studio_reference', 'pending_verification', 'KLOZEVA Studio reference image created for virtual try-on preview; official brand photography not hotlinked or redistributed. Obtain brand/retailer authorization before commercial store listing.', 'https://wtflex.in/products/burnt-blue-baggy-denim-jeans-1?variant=56073814704294', 'verified', true, 'Real branded product reference; not proof of authorization, current stock, or current price.')
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
  'fashion'::industry,
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
  on pc.industry = 'fashion'::industry
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
