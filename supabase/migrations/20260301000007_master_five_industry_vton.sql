-- KLOZEVA Master Enhancement Migration (000007)
-- Strictly additive & idempotent extension for Five-Industry Virtual Try-On,
-- Fitness Measurements, Multi-Category Beauty, and Anonymized Retailer Matching.

-- 1. Seed additional Beauty & Studio categories safely
insert into public.product_categories (industry, slug, name, sort_order) values
  ('beauty', 'eyeshadow', 'Eyeshadow', 7),
  ('beauty', 'eyeliner', 'Eyeliner', 8),
  ('beauty', 'mascara', 'Mascara', 9),
  ('beauty', 'highlighter', 'Highlighter', 10)
on conflict (industry, slug) do nothing;

-- 2. Extend products with explicit try-on metadata columns
alter table public.products add column if not exists tryon_category text;
alter table public.products add column if not exists tryon_config jsonb not null default '{}'::jsonb;

-- 3. Extend tryon_results for Studio & cross-industry metadata
alter table public.tryon_results add column if not exists industry industry;
alter table public.tryon_results add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.tryon_results alter column product_id drop not null;

-- Allow standalone Studio try-on saves without forcing a catalogue product FK on saved_items
alter table public.saved_items alter column product_id drop not null;
alter table public.saved_items drop constraint if exists saved_items_product_or_tryon_check;
alter table public.saved_items add constraint saved_items_product_or_tryon_check
  check (product_id is not null or item_type = 'tryon_result');

-- Update save_tryon_result RPC cleanly (backward compatible with 4-argument calls)
drop function if exists public.save_tryon_result(uuid, uuid, text, text);
create or replace function public.save_tryon_result(
  p_product_id uuid,
  p_variant_id uuid,
  p_engine text,
  p_storage_path text,
  p_industry industry default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_consent boolean;
  v_id uuid := gen_random_uuid();
  v_industry industry;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;

  -- Must have explicit 'tryon_save' consent
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

  -- Storage path MUST start with the caller's auth.uid()
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_storage_path';
  end if;

  -- If product_id is supplied, verify caller can see it and inherit industry
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
  else
    v_industry := p_industry;
  end if;

  insert into public.tryon_results (id, user_id, product_id, variant_id, engine, storage_path, industry, metadata)
  values (v_id, auth.uid(), p_product_id, p_variant_id, p_engine, p_storage_path, coalesce(p_industry, v_industry), coalesce(p_metadata, '{}'::jsonb));

  insert into public.saved_items (user_id, product_id, item_type, tryon_result_id)
  values (auth.uid(), p_product_id, 'tryon_result', v_id);

  return v_id;
end $$;

revoke all on function public.save_tryon_result(uuid, uuid, text, text, industry, jsonb) from public, anon;
grant execute on function public.save_tryon_result(uuid, uuid, text, text, industry, jsonb) to authenticated;

-- 4. Fitness Measurements & Progress Log (strictly private per customer)
create table if not exists public.fitness_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  age int check (age is null or (age between 13 and 120)),
  height_cm numeric(5,1) check (height_cm is null or (height_cm between 80 and 260)),
  weight_kg numeric(5,1) check (weight_kg is null or (weight_kg between 20 and 350)),
  chest_cm numeric(5,1) check (chest_cm is null or (chest_cm between 40 and 220)),
  waist_cm numeric(5,1) check (waist_cm is null or (waist_cm between 35 and 220)),
  hips_cm numeric(5,1) check (hips_cm is null or (hips_cm between 40 and 220)),
  body_fat_pct numeric(4,1) check (body_fat_pct is null or (body_fat_pct between 2 and 70)),
  goal text check (char_length(goal) <= 80),
  activity_level text check (char_length(activity_level) <= 40),
  bmi numeric(4,1),
  notes text check (char_length(notes) <= 400),
  recorded_at timestamptz not null default now()
);
create index if not exists fitness_measurements_user_idx on public.fitness_measurements (user_id, recorded_at desc);

alter table public.fitness_measurements enable row level security;

drop policy if exists fitness_select_own on public.fitness_measurements;
create policy fitness_select_own on public.fitness_measurements for select to authenticated
  using (user_id = auth.uid());

drop policy if exists fitness_insert_own on public.fitness_measurements;
create policy fitness_insert_own on public.fitness_measurements for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists fitness_delete_own on public.fitness_measurements;
create policy fitness_delete_own on public.fitness_measurements for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.fitness_measurements from anon;
grant select, insert, delete on public.fitness_measurements to authenticated;

-- Extend export_my_data() cleanly to include fitness_measurements
create or replace function public.export_my_data() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from profiles p where id = auth.uid()),
    'preferences', (select to_jsonb(c) from customer_preferences c where user_id = auth.uid()),
    'industry_profiles', (select coalesce(jsonb_agg(to_jsonb(ip)), '[]') from industry_profiles ip where user_id = auth.uid()),
    'analysis_results', (select coalesce(jsonb_agg(to_jsonb(ar)), '[]') from analysis_results ar where user_id = auth.uid()),
    'fitness_measurements', (select coalesce(jsonb_agg(to_jsonb(fm)), '[]') from fitness_measurements fm where user_id = auth.uid()),
    'tryon_results', (select coalesce(jsonb_agg(to_jsonb(tr)), '[]') from tryon_results tr where user_id = auth.uid()),
    'consent_records', (select coalesce(jsonb_agg(to_jsonb(cr)), '[]') from consent_records cr where user_id = auth.uid()),
    'saved_items', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from saved_items s where user_id = auth.uid()),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n)), '[]') from notifications n where user_id = auth.uid()),
    'appointments', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from appointments a where user_id = auth.uid()),
    'support_tickets', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from support_tickets t where user_id = auth.uid()),
    'activity', (select coalesce(jsonb_agg(to_jsonb(e)), '[]') from analytics_events e where user_id = auth.uid()));
end $$;

-- 5. Preference-Matched Customer Notification Trigger (on verified product creation / activation)
create or replace function public.notify_matching_customers_on_product() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_biz_status business_status;
  v_biz_name text;
  v_cat_name text;
  v_link text;
begin
  if not new.is_active then
    return new;
  end if;

  if tg_op = 'UPDATE' and not (
    (coalesce(old.is_active, false) = false and new.is_active = true)
    or (
      coalesce(old.is_active, false) = true
      and coalesce(old.tryon_supported, false) = false
      and new.tryon_supported = true
    )
  ) then
    return new;
  end if;

  v_biz_status := (select b.status from public.businesses b where b.id = new.business_id);
  if v_biz_status is distinct from 'verified' then
    return new;
  end if;

  v_biz_name := (select b.name from public.businesses b where b.id = new.business_id);
  v_cat_name := (select pc.name from public.product_categories pc where pc.id = new.category_id);
  v_link := case when new.tryon_supported then '/customer/product/' || new.id::text || '/try-on' else '/customer/product/' || new.id::text end;

  insert into public.notifications (user_id, category, title, body, product_id, link)
  select
    cp.user_id,
    'new_arrivals',
    case when new.tryon_supported then 'New try-on match: ' || new.name else 'New arrival: ' || new.name end,
    coalesce(v_biz_name, 'Verified retailer') || ' added ' || new.name ||
      case when v_cat_name is not null then ' in ' || v_cat_name else '' end ||
      case when new.tryon_supported then '. Virtual try-on preview is ready.' else '.' end,
    new.id,
    v_link
  from public.customer_preferences cp
  join public.profiles p on p.id = cp.user_id
  where p.status = 'active'
    and coalesce((cp.topics ->> 'new_arrivals')::boolean, true) = true
    and coalesce((cp.channels ->> 'in_app')::boolean, true) = true
    and (
      new.industry = any(cp.preferred_industries)
      or (new.brand is not null and exists (
        select 1 from unnest(cp.favourite_brands) fb where lower(trim(fb)) = lower(trim(new.brand))
      ))
      or (v_cat_name is not null and exists (
        select 1 from unnest(cp.categories) ct where lower(trim(ct)) = lower(trim(v_cat_name))
      ))
    )
    and not exists (
      select 1 from public.notifications n
      where n.user_id = cp.user_id and n.product_id = new.id and n.category = 'new_arrivals'
    );

  return new;
end $$;

drop trigger if exists products_notify_matches on public.products;
create trigger products_notify_matches
  after insert or update of is_active, tryon_supported on public.products
  for each row execute function public.notify_matching_customers_on_product();

-- 6. Anonymized Retailer Audience Insights RPC (no customer PII, no photos leaked)
create or replace function public.retailer_audience_insights(p_business_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_industry industry;
  v_biz_name text;
  v_interested_customers int := 0;
  v_optin_arrivals int := 0;
  v_tryon_products int := 0;
  v_product_saves int := 0;
  v_top_categories jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not (public.is_business_member(p_business_id) or public.is_admin()) then
    raise exception 'forbidden';
  end if;

  v_industry := (select b.industry from public.businesses b where b.id = p_business_id);
  if v_industry is null then raise exception 'not_found'; end if;
  v_biz_name := (select b.name from public.businesses b where b.id = p_business_id);

  v_interested_customers := (
    select count(*)
    from public.customer_preferences cp
    where v_industry = any(cp.preferred_industries)
  );

  v_optin_arrivals := (
    select count(*)
    from public.customer_preferences cp
    where v_industry = any(cp.preferred_industries)
      and coalesce((cp.topics ->> 'new_arrivals')::boolean, true) = true
  );

  v_tryon_products := (
    select count(*)
    from public.products p
    where p.business_id = p_business_id and p.is_active = true and p.tryon_supported = true
  );

  v_product_saves := (
    select count(*)
    from public.saved_items si
    join public.products p on p.id = si.product_id
    where p.business_id = p_business_id
  );

  v_top_categories := (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    from (
      select pc.name as category, count(p.id) as active_items,
        count(*) filter (where p.tryon_supported) as tryon_enabled_items
      from public.products p
      join public.product_categories pc on pc.id = p.category_id
      where p.business_id = p_business_id and p.is_active = true
      group by pc.name
      order by active_items desc
      limit 6
    ) t
  );

  return jsonb_build_object(
    'business_id', p_business_id,
    'business_name', v_biz_name,
    'industry', v_industry,
    'interested_shoppers_count', v_interested_customers,
    'new_arrival_subscribers_count', v_optin_arrivals,
    'tryon_ready_products', v_tryon_products,
    'anonymized_product_saves', v_product_saves,
    'category_breakdown', v_top_categories
  );
end $$;

revoke all on function public.retailer_audience_insights(uuid) from public, anon;
grant execute on function public.retailer_audience_insights(uuid) to authenticated;

