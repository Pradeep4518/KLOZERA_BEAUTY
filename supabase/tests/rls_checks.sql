-- KLOZEVA security + business-rule checks. Run on a LOCAL or TEST database only: creates test rows, then ROLLS BACK.
--   psql "$TEST_DATABASE_URL" -f supabase/tests/rls_checks.sql   (or paste into the SQL editor of a TEST project)
-- Any failure raises an exception. "ALL KLOZEVA CHECKS PASSED" prints only if everything passed.
begin;

-- In case previous aborted runs left test fixtures behind, clean them up first
delete from auth.users where id in (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000b2',
  '00000000-0000-0000-0000-0000000000c3',
  '00000000-0000-0000-0000-0000000000d4',
  '00000000-0000-0000-0000-0000000000e5',
  '00000000-0000-0000-0000-0000000000f6',
  '00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-0000000000a8'
);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c3', 'r@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d4', 'admin@test.local', 'authenticated', 'authenticated');

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000a1'; b uuid := '00000000-0000-0000-0000-0000000000b2';
  r uuid := '00000000-0000-0000-0000-0000000000c3'; adm uuid := '00000000-0000-0000-0000-0000000000d4';
  bid uuid; pid uuid; vid uuid; pid2 uuid; vid2 uuid; pid_tmp uuid; cat_beauty int; cat_skincare int; cat_fashion int;
  gid_eligible uuid; gid_ineligible uuid; v_n int; v_ind industry; v_stock int; v_json jsonb;
  c_no_optin uuid := '00000000-0000-0000-0000-0000000000e5';
  u_viewer uuid := '00000000-0000-0000-0000-0000000000f6';
  u_editor uuid := '00000000-0000-0000-0000-0000000000a7';
  c_extra  uuid := '00000000-0000-0000-0000-0000000000a8';
  v_tok_viewer text; v_tok_editor text; v_doc_id uuid; v_offer_id uuid; v_txt text;
begin
  perform promote_admin('admin@test.local');
  perform set_config('klozeva.bypass', '0', true);
  select id into cat_beauty from product_categories where industry = 'beauty' and slug = 'foundation';
  select id into cat_fashion from product_categories where industry = 'fashion' and slug = 'dresses';

  select count(*) into v_n from profiles where id in (a, b, r, adm);
  if v_n <> 4 then
    raise exception 'FAIL: signup trigger created % profiles for test users (expected 4). Please verify that 20260301000002_functions.sql is applied and on_auth_user_created trigger exists on auth.users.', v_n;
  end if;

  select count(*) into v_n from customer_preferences where user_id in (a, b, r, adm);
  if v_n <> 4 then
    raise exception 'FAIL: signup trigger created % preferences for test users (expected 4)', v_n;
  end if;

  if (select last_industry from profiles where id = a) <> 'beauty' then raise exception 'FAIL: default industry is not beauty'; end if;

  -- anonymous role has no access
  execute 'set local role anon';
  begin perform count(*) from products; raise exception 'FAIL: anon can read products'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  execute 'reset role';

  -- retailer R registers a business and creates a product
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  bid := register_business('beauty', 'Test Beauty Co', 'desc', 'Hyderabad', 'r@test.local', '');
  perform set_config('klozeva.bypass', '0', true);
  begin update profiles set role = 'admin' where id = r; raise exception 'FAIL: privilege escalation'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin update businesses set status = 'verified' where id = bid; raise exception 'FAIL: retailer self-verified'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin insert into products (business_id, industry, category_id, name, price) values (bid, 'beauty', cat_fashion, 'Wrong category', 10); raise exception 'FAIL: category from another industry accepted';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  insert into products (business_id, industry, category_id, name, description, price, tryon_supported)
  values (bid, 'fashion', cat_beauty, 'Silk Foundation', 'Long-wear breathable foundation tested for humid weather and smooth satin coverage.', 999, true) returning id into pid;
  select industry into v_ind from products where id = pid; if v_ind <> 'beauty' then raise exception 'FAIL: product industry not derived from business (%)', v_ind; end if;
  if (select review_status from products where id = pid) <> 'draft' then raise exception 'FAIL: new product did not start in draft'; end if;
  insert into product_images (product_id, storage_path, sort_order, width_px, height_px, sha256) values
    (pid, bid::text || '/silk1.jpg', 0, 900, 900, 'hash-silk-1'),
    (pid, bid::text || '/silk2.jpg', 1, 900, 900, 'hash-silk-2');
  begin
    perform submit_product_for_review(pid, '{"genuine_item":true,"right_to_sell":true,"accurate_details":true}'::jsonb, '{"score":90,"errorCount":0,"warningCount":0}'::jsonb);
    raise exception 'FAIL: unverified business submitted product for review';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin insert into product_variants (product_id, label, stock) values (pid, 'Bad', 5); raise exception 'FAIL: variant created with non-zero stock'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  insert into product_variants (product_id, label, color_hex) values (pid, 'Warm Beige', '#C68642') returning id into vid;
  begin update product_variants set stock = 999 where id = vid; raise exception 'FAIL: stock edited directly'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  v_stock := adjust_stock(vid, 10, 'Initial'); if v_stock <> 10 then raise exception 'FAIL: stock adjust wrong'; end if;
  begin perform adjust_stock(vid, -50, 'oversell'); raise exception 'FAIL: stock went negative'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  select count(*) into v_n from inventory_movements where variant_id = vid; if v_n <> 1 then raise exception 'FAIL: inventory history not recorded (%)', v_n; end if;
  execute 'reset role';

  -- pending business is invisible to customers
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from products where id = pid; if v_n <> 0 then raise exception 'FAIL: customer sees product of unverified business'; end if;
  select count(*) into v_n from businesses where id = bid; if v_n <> 0 then raise exception 'FAIL: customer sees unverified business'; end if;
  begin perform admin_set_business_status(bid, 'verified', ''); raise exception 'FAIL: customer verified a business'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  execute 'reset role';

  -- admin verifies business, but draft product stays hidden until submitted & approved
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform admin_set_business_status(bid, 'verified', '');
  if (select (admin_stats() ->> 'verified_retailers')::int) < 1 then raise exception 'FAIL: admin_stats wrong'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from products where id = pid; if v_n <> 0 then raise exception 'FAIL: customer sees draft product before admin approval'; end if;
  execute 'reset role';

  -- retailer submits for review (still hidden from customer), then admin approves
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform submit_product_for_review(pid, '{"genuine_item":true,"right_to_sell":true,"accurate_details":true}'::jsonb, '{"score":90,"errorCount":0,"warningCount":0}'::jsonb);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from products where id = pid; if v_n <> 0 then raise exception 'FAIL: customer sees pending_review product'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform admin_review_product(pid, 'approved', 'Approved in rls_checks');
  execute 'reset role';

  -- verified catalogue is visible to customers, with tenant isolation for writes
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from products where id = pid; if v_n <> 1 then raise exception 'FAIL: customer cannot see verified product'; end if;
  select count(*) into v_n from product_variants where product_id = pid; if v_n <> 1 then raise exception 'FAIL: customer cannot see variants'; end if;
  update products set price = 1 where id = pid; get diagnostics v_n = row_count; if v_n <> 0 then raise exception 'FAIL: customer edited a retailer product'; end if;
  begin perform adjust_stock(vid, 5, 'hack'); raise exception 'FAIL: customer adjusted retailer stock'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin insert into product_variants (product_id, label) values (pid, 'Hack'); raise exception 'FAIL: customer added variant'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  select count(*) into v_n from inventory_movements; if v_n <> 0 then raise exception 'FAIL: customer reads inventory history'; end if;
  begin insert into businesses (industry, name, created_by) values ('beauty', 'Fake', a); raise exception 'FAIL: direct business insert'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  insert into saved_items (user_id, product_id) values (a, pid);
  update customer_preferences set favourite_brands = array['Lakme'], image_consent = true where user_id = a;
  insert into support_tickets (user_id, subject, message) values (a, 'Hello', 'Test ticket message');
  begin insert into saved_items (user_id, product_id) values (b, pid); raise exception 'FAIL: saved item for another user'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform admin_stats(); raise exception 'FAIL: customer called admin_stats'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform _audit('x', 'y', null, '{}'); raise exception 'FAIL: _audit callable'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  execute 'reset role';

  -- B cannot see A's private data; export contains only the caller's rows
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from saved_items where user_id = a; if v_n <> 0 then raise exception 'FAIL: B sees A saved items'; end if;
  select count(*) into v_n from customer_preferences where user_id = a; if v_n <> 0 then raise exception 'FAIL: B sees A preferences'; end if;
  select count(*) into v_n from support_tickets where user_id = a; if v_n <> 0 then raise exception 'FAIL: B sees A tickets'; end if;
  select count(*) into v_n from notifications where user_id = a; if v_n <> 0 then raise exception 'FAIL: B sees A notifications'; end if;
  select count(*) into v_n from profiles where id = a; if v_n <> 0 then raise exception 'FAIL: B sees A profile'; end if;
  v_json := export_my_data();
  if jsonb_array_length(v_json -> 'saved_items') <> 0 or (v_json -> 'profile' ->> 'id')::uuid <> b then raise exception 'FAIL: export leaks or is wrong'; end if;
  perform delete_my_account();
  execute 'reset role';
  select count(*) into v_n from profiles where id = b; if v_n <> 0 then raise exception 'FAIL: account deletion did not remove the profile'; end if;
  select count(*) into v_n from saved_items where user_id = a; if v_n <> 1 then raise exception 'FAIL: deleting B affected A data'; end if;

  -- Stage 2 checks: consent enforcement, analysis results isolation, deletion, and export
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform set_photo_consent(false);
  begin
    perform save_analysis('beauty', 'face_shape', '{"shape":"oval"}'::jsonb, 'photo');
    raise exception 'FAIL: saving photo analysis without consent was accepted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  -- manual analysis without photo consent is allowed
  perform save_analysis('fitness', 'fitness_manual', '{"activity":"intermediate"}'::jsonb, 'manual');
  -- grant photo consent and save photo analysis
  perform set_photo_consent(true);
  perform save_analysis('beauty', 'face_shape', '{"shape":"oval"}'::jsonb, 'photo');
  select count(*) into v_n from analysis_results where user_id = a; if v_n <> 2 then raise exception 'FAIL: analysis_results count wrong (%)', v_n; end if;
  select count(*) into v_n from industry_profiles where user_id = a; if v_n <> 2 then raise exception 'FAIL: industry_profiles count wrong (%)', v_n; end if;
  execute 'reset role';

  -- Retailer R (another authenticated user) cannot see A analysis results or industry profiles
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from analysis_results where user_id = a; if v_n <> 0 then raise exception 'FAIL: R reads A analysis results'; end if;
  select count(*) into v_n from industry_profiles where user_id = a; if v_n <> 0 then raise exception 'FAIL: R reads A industry profile'; end if;
  select count(*) into v_n from consent_records where user_id = a; if v_n <> 0 then raise exception 'FAIL: R reads A consent records'; end if;
  execute 'reset role';

  -- Admin cannot read customer analysis results
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from analysis_results where user_id = a; if v_n <> 0 then raise exception 'FAIL: admin reads customer analysis results'; end if;
  execute 'reset role';

  -- A export contains industry_profiles, analysis_results and consent_records
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  v_json := export_my_data();
  if jsonb_array_length(v_json -> 'analysis_results') <> 2 or jsonb_array_length(v_json -> 'consent_records') < 2 then
    raise exception 'FAIL: export missing stage 2 analysis or consent records';
  end if;
  -- delete_my_analysis removes records
  perform delete_my_analysis('beauty');
  select count(*) into v_n from analysis_results where user_id = a and industry = 'beauty'; if v_n <> 0 then raise exception 'FAIL: delete_my_analysis did not remove beauty results'; end if;
  perform delete_my_analysis();
  select count(*) into v_n from analysis_results where user_id = a; if v_n <> 0 then raise exception 'FAIL: delete_my_analysis did not clear all results'; end if;
  execute 'reset role';

  -- Stage 3 checks: Try-on assets RLS, try-on results isolation, consent enforcement, path validation
  -- Retailer R can add try-on asset to their own product pid
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  insert into product_tryon_assets (product_id, kind, storage_path, anchor)
  values (pid, 'earring', 'test_earring.png', '{"scale": 1.0, "offset_x": 0, "offset_y": 0, "rotation": 0, "pair_mode": "pair"}'::jsonb);
  execute 'reset role';

  -- Customer A cannot insert try-on assets directly
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  begin
    insert into product_tryon_assets (product_id, kind, storage_path) values (pid, 'earring', 'hack.png');
    raise exception 'FAIL: customer added try-on asset directly';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Customer A saving try-on result without 'tryon_save' consent is rejected
  begin
    perform save_tryon_result(pid, vid, 'foundation', a::text || '/result.png');
    raise exception 'FAIL: saved try-on result without tryon_save consent';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Grant tryon_save consent
  perform set_tryon_consent(true);

  -- Storage path outside caller's folder is rejected
  begin
    perform save_tryon_result(pid, vid, 'foundation', 'other_user/result.png');
    raise exception 'FAIL: saved try-on result with invalid storage path';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Valid save succeeds and creates saved_items entry
  perform save_tryon_result(pid, vid, 'foundation', a::text || '/result.png');
  select count(*) into v_n from tryon_results where user_id = a; if v_n <> 1 then raise exception 'FAIL: tryon_results count wrong (%)', v_n; end if;
  select count(*) into v_n from saved_items where user_id = a and item_type = 'tryon_result'; if v_n <> 1 then raise exception 'FAIL: tryon saved_items count wrong (%)', v_n; end if;
  execute 'reset role';

  -- Retailer R and Admin cannot read Customer A's try-on results
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from tryon_results where user_id = a; if v_n <> 0 then raise exception 'FAIL: retailer reads customer try-on results'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from tryon_results where user_id = a; if v_n <> 0 then raise exception 'FAIL: admin reads customer try-on results'; end if;
  execute 'reset role';

  -- Export includes try-on results
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  v_json := export_my_data();
  if jsonb_array_length(v_json -> 'tryon_results') <> 1 then
    raise exception 'FAIL: export missing tryon_results';
  end if;

  -- delete_my_tryon_results removes results and saved items
  perform delete_my_tryon_results();
  select count(*) into v_n from tryon_results where user_id = a; if v_n <> 0 then raise exception 'FAIL: delete_my_tryon_results did not clear results'; end if;
  select count(*) into v_n from saved_items where user_id = a and item_type = 'tryon_result'; if v_n <> 0 then raise exception 'FAIL: delete_my_tryon_results did not clear saved_items'; end if;

  -- Master Stage: fitness_measurements isolation & retailer_audience_insights authorization
  insert into fitness_measurements (user_id, age, height_cm, weight_kg, goal, activity_level, bmi)
  values (a, 28, 170.0, 65.0, 'general fitness', 'intermediate', 22.5);
  begin
    perform retailer_audience_insights(bid);
    raise exception 'FAIL: customer called retailer_audience_insights';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  -- Retailer R cannot read Customer A's fitness measurements, can read own anonymized insights
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into v_n from fitness_measurements where user_id = a; if v_n <> 0 then raise exception 'FAIL: retailer reads customer fitness measurements'; end if;
  v_json := retailer_audience_insights(bid);
  if (v_json ->> 'business_id')::uuid <> bid then raise exception 'FAIL: retailer_audience_insights wrong business_id'; end if;
  execute 'reset role';

  -- Beauty Catalogue Integration checks (000008): global reference RLS, retailer adoption isolation, VTON gate & stock-confirmed CRM
  cat_skincare := (select id from product_categories where industry = 'beauty' and slug = 'face-serum');
  insert into global_catalogue_products (
    sku, industry, category_id, category_group, subcategory_group, subcategory,
    product_name, brand, description, reference_price, currency, price_status,
    variants_or_shades, stock_quantity, product_url, url_status, is_virtual_tryon_eligible, is_demo_data
  ) values
    ('KZ-TEST-ELIG', 'beauty', cat_beauty, 'Makeup', 'Face Makeup', 'Foundation',
     'Test Reference Foundation', 'Maybelline New York', 'Test ref description', null, 'INR', 'not_supplied',
     '128 Warm Nude', 0, 'https://www.maybelline.co.in/', 'verified', true, false),
    ('KZ-TEST-INELIG', 'beauty', cat_skincare, 'Skincare', 'Skincare', 'Face serum',
     'Test Reference Serum', 'Minimalist', 'Test skincare description', 224, 'INR', 'reference_price_verify_before_use',
     'Standard bottle', 0, 'https://beminimalist.co/', 'verified', false, false)
  on conflict (sku) do update set product_name = excluded.product_name;

  gid_eligible := (select id from global_catalogue_products where sku = 'KZ-TEST-ELIG');
  gid_ineligible := (select id from global_catalogue_products where sku = 'KZ-TEST-INELIG');

  -- Anon cannot read global_catalogue_products
  execute 'set local role anon';
  begin perform count(*) from global_catalogue_products; raise exception 'FAIL: anon can read global_catalogue_products'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  execute 'reset role';

  -- Authenticated customer can read global references, cannot modify them
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  v_n := (select count(*) from global_catalogue_products where id in (gid_eligible, gid_ineligible));
  if v_n <> 2 then raise exception 'FAIL: authenticated user cannot read global_catalogue_products (%)', v_n; end if;
  begin
    update global_catalogue_products set product_name = 'Hacked' where id = gid_eligible;
    raise exception 'FAIL: customer modified global_catalogue_products';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Global wishlist save & VTON eligibility gate
  insert into saved_items (user_id, global_product_id, item_type) values (a, gid_eligible, 'product');
  begin
    perform save_tryon_result(null, null, 'foundation', a::text || '/inelig.png', 'beauty', '{}'::jsonb, gid_ineligible);
    raise exception 'FAIL: saved try-on for ineligible global beauty item';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  perform save_tryon_result(null, null, 'foundation', a::text || '/elig.png', 'beauty', '{}'::jsonb, gid_eligible);
  execute 'reset role';

  -- Second user without new_arrivals opt-in to verify consent check in CRM trigger
  insert into auth.users (id, email, aud, role) values (c_no_optin, 'nooptin@test.local', 'authenticated', 'authenticated')
  on conflict (id) do nothing;
  update customer_preferences
     set preferred_industries = array['beauty']::industry[],
         beauty_notes = '128 Warm Nude',
         topics = '{"promotions": true, "appointments": true, "new_arrivals": false, "system": true}'::jsonb
   where user_id = c_no_optin;

  -- Customer A matches Beauty + Warm Nude + opted-in
  update customer_preferences
     set preferred_industries = array['beauty']::industry[],
         beauty_notes = '128 Warm Nude',
         topics = '{"promotions": true, "appointments": true, "new_arrivals": true, "system": true}'::jsonb,
         channels = '{"in_app": true, "email": true, "sms": false, "whatsapp": false}'::jsonb
   where user_id = a;

  -- Retailer R creates store listing linked to global_product_id with 0 stock -> submits & admin approves -> 0 CRM notifications yet
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  pid2 := gen_random_uuid();
  insert into products (id, business_id, industry, category_id, global_product_id, sku, subcategory, name, brand, description, price, tryon_supported, is_active)
  values (pid2, bid, 'beauty', cat_beauty, gid_eligible, 'KZ-TEST-ELIG', 'Foundation', 'Fit Me Reference Listing', 'Maybelline New York', 'Authentic matte poreless liquid foundation reference listing with retailer stock verification.', 549, true, true);
  -- Duplicate adoption in same business must fail
  begin
    insert into products (business_id, industry, category_id, global_product_id, sku, name, price)
    values (bid, 'beauty', cat_beauty, gid_eligible, 'KZ-TEST-ELIG', 'Duplicate Ref', 549);
    raise exception 'FAIL: retailer adopted same global product twice';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  insert into product_images (product_id, storage_path, sort_order, width_px, height_px, sha256) values
    (pid2, bid::text || '/fit1.jpg', 0, 900, 900, 'hash-fit-1'),
    (pid2, bid::text || '/fit2.jpg', 1, 900, 900, 'hash-fit-2');
  perform submit_product_for_review(pid2, '{"genuine_item":true,"right_to_sell":true,"accurate_details":true}'::jsonb, '{"score":92,"errorCount":0,"warningCount":0}'::jsonb);
  vid2 := gen_random_uuid();
  insert into product_variants (id, product_id, label, color_hex) values (vid2, pid2, '128 Warm Nude', '#D5A073');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform admin_review_product(pid2, 'approved', 'Approved global reference listing');
  execute 'reset role';

  v_n := (select count(*) from notifications where product_id = pid2);
  if v_n <> 0 then raise exception 'FAIL: notification sent before stock confirmation (%)', v_n; end if;

  -- Retailer confirms positive stock -> triggers stock-confirmed CRM alert ONLY for opted-in matching customer A
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform adjust_stock(vid2, 5, 'Verified opening stock');
  execute 'reset role';

  v_n := (select count(*) from notifications where user_id = a and product_id = pid2 and category = 'new_arrivals');
  if v_n <> 1 then raise exception 'FAIL: expected 1 stock-confirmed notification for opted-in customer A, got %', v_n; end if;
  v_n := (select count(*) from notifications where user_id = c_no_optin and product_id = pid2);
  if v_n <> 0 then raise exception 'FAIL: sent notification to customer who opted out of new_arrivals'; end if;

  -- Section 11: Commercial Retailer Platform Extension (000009) checks
  insert into auth.users (id, email, aud, role) values
    (u_viewer, 'viewer@test.local', 'authenticated', 'authenticated'),
    (u_editor, 'editor@test.local', 'authenticated', 'authenticated'),
    (c_extra,  'extra@test.local',  'authenticated', 'authenticated')
  on conflict (id) do nothing;

  -- Team invitations & RBAC enforcement
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  v_tok_viewer := (invite_business_member(bid, 'viewer@test.local', 'viewer', 7)) ->> 'token';
  v_tok_editor := (invite_business_member(bid, 'editor@test.local', 'catalogue_editor', 7)) ->> 'token';
  -- Verification doc path enforcement & submission
  begin
    perform submit_business_verification_doc(bid, 'gstin_certificate', '29ABCDE1234F1Z5', 'other-biz/gstin.pdf', 'gstin.pdf', 'application/pdf', 12000);
    raise exception 'FAIL: accepted verification doc outside business folder';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  v_doc_id := submit_business_verification_doc(bid, 'gstin_certificate', '29ABCDE1234F1Z5', bid::text || '/gstin.pdf', 'gstin.pdf', 'application/pdf', 12000);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform admin_review_business_docs(bid, 'approved', 'GSTIN matched');
  execute 'reset role';

  -- Wrong user cannot accept another user's invitation
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  begin
    perform accept_business_invitation(v_tok_viewer);
    raise exception 'FAIL: mismatched email accepted team invite';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  execute 'reset role';

  -- Viewer accepts invite: can read analytics/products, blocked from catalogue writes, settings & audit logs
  perform set_config('request.jwt.claims', json_build_object('sub', u_viewer, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform accept_business_invitation(v_tok_viewer);
  if (select count(*) from retailer_audit_logs where business_id = bid) <> 0 then raise exception 'FAIL: viewer read retailer_audit_logs'; end if;
  begin
    insert into products (business_id, industry, category_id, name, description, price)
    values (bid, 'beauty', cat_beauty, 'Viewer Blocked Product', 'Long description over forty chars for check.', 100);
    raise exception 'FAIL: viewer created product';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform invite_business_member(bid, 'x@test.local', 'viewer', 7); raise exception 'FAIL: viewer invited member'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  update businesses set city = 'Delhi' where id = bid;
  get diagnostics v_n = row_count; if v_n <> 0 then raise exception 'FAIL: viewer updated business settings'; end if;
  execute 'reset role';

  -- Catalogue editor accepts invite: can add/edit products & offers, blocked from verification docs, settings & team
  perform set_config('request.jwt.claims', json_build_object('sub', u_editor, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform accept_business_invitation(v_tok_editor);
  if (select count(*) from retailer_audit_logs where business_id = bid) <> 0 then raise exception 'FAIL: editor read retailer_audit_logs'; end if;
  begin
    perform submit_business_verification_doc(bid, 'other', null, bid::text || '/ed.pdf', 'ed.pdf', 'application/pdf', 1000);
    raise exception 'FAIL: catalogue editor submitted verification doc';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  update businesses set city = 'Mumbai' where id = bid;
  get diagnostics v_n = row_count; if v_n <> 0 then raise exception 'FAIL: catalogue editor updated business settings'; end if;
  -- Temporary unsaved draft created by editor then deleted via archive_or_delete_product
  insert into products (business_id, industry, category_id, name, description, price)
  values (bid, 'beauty', cat_beauty, 'Editor Temporary Draft', 'Temporary listing with over forty characters description for cleanup test.', 299) returning id into pid_tmp;
  if archive_or_delete_product(pid_tmp) <> 'deleted' then raise exception 'FAIL: unsaved product was not hard deleted'; end if;
  execute 'reset role';

  -- Cannot remove last owner
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  begin perform update_business_member_role(bid, r, 'manager'); raise exception 'FAIL: demoted last owner'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  -- Instant price edit preserves approved vs substantive edit queues re-review; saved product archives cleanly
  update products set price = 1099 where id = pid;
  if (select review_status from products where id = pid) <> 'approved' then raise exception 'FAIL: price edit broke approved status'; end if;
  update products set name = 'Silk Foundation Pro Edition' where id = pid;
  if (select review_status from products where id = pid) <> 'pending_review' then raise exception 'FAIL: name edit did not queue auto re-review'; end if;
  if (select count(*) from product_reviews where product_id = pid and event_type = 'auto_re_review') < 1 then raise exception 'FAIL: auto_re_review history missing'; end if;
  -- Direct delete of saved product blocked; archive_or_delete_product archives cleanly
  begin
    delete from products where id = pid;
    raise exception 'FAIL: directly deleted customer-saved product';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  if archive_or_delete_product(pid) <> 'archived' then raise exception 'FAIL: saved product was not archived'; end if;
  if (select review_status from products where id = pid) <> 'archived' then raise exception 'FAIL: product review_status not archived'; end if;

  -- Admin review requires reason on rejection
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  begin perform admin_review_product(pid2, 'rejected', ''); raise exception 'FAIL: admin rejected product without reason'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  execute 'reset role';

  -- Non-overlapping offers, auto-approve limits & effective price RPC
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  v_json := save_offer(bid, null, 'Launch 20', '20% OFF', 'percent', 20, now() - interval '1 hour', now() + interval '5 days', array[pid2]);
  v_offer_id := (v_json ->> 'id')::uuid;
  if (v_json ->> 'status') <> 'approved' then raise exception 'FAIL: 20%% offer was not auto-approved (%)', v_json; end if;
  v_json := save_offer(bid, null, 'Mega 45', null, 'percent', 45, now() + interval '10 days', now() + interval '15 days', array[pid2]);
  if (v_json ->> 'status') <> 'pending_review' then raise exception 'FAIL: >30%% offer did not require admin approval'; end if;
  begin
    perform save_offer(bid, null, 'Overlap', null, 'percent', 15, now(), now() + interval '2 days', array[pid2]);
    raise exception 'FAIL: overlapping offer allowed on same product';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  -- Low-stock crossing alert on vid2
  perform adjust_stock(vid2, 10, 'Restock above threshold');
  if (select low_stock_alert_active from product_variants where id = vid2) <> false then raise exception 'FAIL: restock did not keep/clear low_stock_alert_active'; end if;
  perform adjust_stock(vid2, -12, 'Sell down below threshold 5');
  if (select low_stock_alert_active from product_variants where id = vid2) <> true then raise exception 'FAIL: crossing below threshold did not activate low_stock_alert_active'; end if;
  if (select count(*) from notifications where user_id = r and product_id = pid2 and title like 'Low stock alert:%') < 1 then
    raise exception 'FAIL: retailer low stock notification missing';
  end if;
  perform adjust_stock(vid2, 10, 'Restock back to healthy');
  if (select low_stock_alert_active from product_variants where id = vid2) <> false then raise exception 'FAIL: restock did not clear low_stock_alert_active'; end if;
  execute 'reset role';

  -- Customer gets discounted effective price from live approved offer
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  if (select effective_price from get_effective_product_prices(array[pid2]) limit 1) <> 439.20 then
    raise exception 'FAIL: get_effective_product_prices returned unexpected price';
  end if;
  execute 'reset role';

  -- k=5 Anonymized Retailer Analytics
  insert into analytics_events (user_id, event, industry, product_id) values
    (a,        'view_product', 'beauty', pid2),
    (a,        'view_product', 'beauty', pid2),
    (c_no_optin,'view_product', 'beauty', pid2),
    (u_viewer, 'view_product', 'beauty', pid2);

  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  v_json := retailer_analytics(bid, 30);
  if coalesce((v_json -> 'summary' ->> 'views_suppressed')::boolean, false) <> true then
    raise exception 'FAIL: expected k=5 suppression for 3 distinct viewing users (%)', v_json -> 'summary';
  end if;
  if (v_json -> 'summary' -> 'views') <> 'null'::jsonb then
    raise exception 'FAIL: suppressed views returned non-null value (%)', v_json -> 'summary';
  end if;
  v_txt := v_json::text;
  if position('a@test.local' in v_txt) > 0 or position(a::text in v_txt) > 0 then
    raise exception 'FAIL: customer PII leaked into retailer analytics';
  end if;
  execute 'reset role';

  insert into analytics_events (user_id, event, industry, product_id) values
    (u_editor, 'view_product', 'beauty', pid2),
    (c_extra,  'view_product', 'beauty', pid2);

  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  v_json := retailer_analytics(bid, 30);
  if coalesce((v_json -> 'summary' ->> 'views_suppressed')::boolean, true) <> false then
    raise exception 'FAIL: expected k=5 unsuppressed when >=5 distinct users viewed (%)', v_json -> 'summary';
  end if;
  if (v_json -> 'summary' ->> 'views')::int < 6 then
    raise exception 'FAIL: expected raw views count >= 6 after 5 distinct users (%)', v_json -> 'summary';
  end if;
  execute 'reset role';

  raise notice 'ALL KLOZEVA CHECKS PASSED';
end $$;
rollback;
