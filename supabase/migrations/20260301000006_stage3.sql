-- KLOZEVA Stage 3: On-Device Virtual Try-On Schema, Assets, Results & Private Storage Policies.

-- 1. Retailer Try-On Cut-out Assets (for image-driven engines: jewellery, hairstyles, garments)
create table if not exists public.product_tryon_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  kind text not null check (kind in ('earring','necklace','pendant','ring','bracelet','garment_top','garment_bottom','garment_dress','garment_outerwear','hairstyle')),
  storage_path text not null,
  anchor jsonb not null default '{"scale": 1.0, "offset_x": 0, "offset_y": 0, "rotation": 0, "pair_mode": "pair"}'::jsonb,
  width_px int,
  height_px int,
  created_at timestamptz not null default now()
);
create index if not exists product_tryon_assets_product_idx on public.product_tryon_assets (product_id);
create index if not exists product_tryon_assets_variant_idx on public.product_tryon_assets (variant_id);

-- 2. Customer Try-On Rendered Results (private; original photo is NEVER stored)
create table if not exists public.tryon_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  engine text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists tryon_results_user_idx on public.tryon_results (user_id, created_at desc);

-- 3. Adjust saved_items to support multiple try-on results alongside favourites
alter table public.saved_items add column if not exists tryon_result_id uuid references public.tryon_results(id) on delete cascade;

-- Replace strict unique (user_id, product_id) so multiple try-on results are allowed, while keeping single favourite
alter table public.saved_items drop constraint if exists saved_items_user_id_product_id_key;
drop index if exists saved_items_user_product_fav_idx;
create unique index if not exists saved_items_user_product_fav_idx
  on public.saved_items (user_id, product_id)
  where item_type <> 'tryon_result';

-- 4. Extend analytics_events event constraint for try-on actions
alter table public.analytics_events drop constraint if exists analytics_events_event_check;
alter table public.analytics_events add constraint analytics_events_event_check
  check (event in ('view_industry', 'view_product', 'search', 'save_item', 'run_analysis', 'view_recommendation', 'start_tryon', 'save_tryon'));

-- 5. Row Level Security for product_tryon_assets
alter table public.product_tryon_assets enable row level security;

drop policy if exists tryon_assets_select on public.product_tryon_assets;
create policy tryon_assets_select on public.product_tryon_assets for select to authenticated, anon
  using (exists (
    select 1 from public.products p
    where p.id = product_id and (
      exists (select 1 from public.businesses b where b.id = p.business_id and b.status = 'verified')
      or public.is_business_member(p.business_id)
      or public.is_admin()
    )
  ));

drop policy if exists tryon_assets_insert on public.product_tryon_assets;
create policy tryon_assets_insert on public.product_tryon_assets for insert to authenticated
  with check (exists (
    select 1 from public.products p
    where p.id = product_id and public.is_business_member(p.business_id)
  ));

drop policy if exists tryon_assets_update on public.product_tryon_assets;
create policy tryon_assets_update on public.product_tryon_assets for update to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and public.is_business_member(p.business_id)
  ));

drop policy if exists tryon_assets_delete on public.product_tryon_assets;
create policy tryon_assets_delete on public.product_tryon_assets for delete to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and public.is_business_member(p.business_id)
  ));

grant select on public.product_tryon_assets to anon, authenticated;
grant insert, update, delete on public.product_tryon_assets to authenticated;

-- 6. Row Level Security for tryon_results (strictly private to owner; retailers and admins CANNOT read)
alter table public.tryon_results enable row level security;

drop policy if exists tryon_results_select on public.tryon_results;
create policy tryon_results_select on public.tryon_results for select to authenticated
  using (user_id = auth.uid());

revoke all on public.tryon_results from anon;
revoke insert, update, delete on public.tryon_results from authenticated;
grant select on public.tryon_results to authenticated;

-- 7. Storage Buckets: tryon-assets (public cutouts) & tryon-results (private user renders)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('tryon-assets', 'tryon-assets', true, 5242880, array['image/png']),
  ('tryon-results', 'tryon-results', false, 4194304, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies for tryon-assets (retailer cutouts: write/delete only by business member)
drop policy if exists tryon_assets_upload on storage.objects;
create policy tryon_assets_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'tryon-assets' and public.is_member_of_text((storage.foldername(name))[1]));

drop policy if exists tryon_assets_remove on storage.objects;
create policy tryon_assets_remove on storage.objects for delete to authenticated
  using (bucket_id = 'tryon-assets' and public.is_member_of_text((storage.foldername(name))[1]));

-- Storage policies for tryon-results (private, strictly own-folder only: auth.uid()/...)
drop policy if exists tryon_results_upload on storage.objects;
create policy tryon_results_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'tryon-results' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists tryon_results_read on storage.objects;
create policy tryon_results_read on storage.objects for select to authenticated
  using (bucket_id = 'tryon-results' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists tryon_results_delete on storage.objects;
create policy tryon_results_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tryon-results' and (storage.foldername(name))[1] = auth.uid()::text);

-- 8. SECURITY DEFINER Functions for Try-On Management

-- Consent specifically for saving try-on rendered previews
create or replace function public.set_tryon_consent(p_granted boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  insert into consent_records (user_id, purpose, granted) values (auth.uid(), 'tryon_save', p_granted);
end $$;

-- Save rendered try-on result (refuses without 'tryon_save' consent, validates path & product visibility)
create or replace function public.save_tryon_result(
  p_product_id uuid,
  p_variant_id uuid,
  p_engine text,
  p_storage_path text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_consent boolean;
  v_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;

  -- 1. Must have explicit 'tryon_save' consent
  v_consent := (
    select granted
    from public.consent_records
    where user_id = auth.uid() and purpose = 'tryon_save'
    order by created_at desc
    limit 1
  );

  if coalesce(v_consent, false) = false then
    raise exception 'consent_required';
  end if;

  -- 2. Storage path MUST start with the caller's auth.uid()
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_storage_path';
  end if;

  -- 3. Product must be visible to caller (verified business, member, or admin)
  if not exists (
    select 1 from public.products p
    join public.businesses b on b.id = p.business_id
    where p.id = p_product_id and (b.status = 'verified' or public.is_business_member(b.id) or public.is_admin())
  ) then
    raise exception 'product_not_found';
  end if;

  -- 4. Insert tryon_results row
  insert into public.tryon_results (id, user_id, product_id, variant_id, engine, storage_path)
  values (v_id, auth.uid(), p_product_id, p_variant_id, p_engine, p_storage_path);

  -- 5. Insert corresponding saved_items entry
  insert into public.saved_items (user_id, product_id, item_type, tryon_result_id)
  values (auth.uid(), p_product_id, 'tryon_result', v_id);

  return v_id;
end $$;

-- Delete my try-on results (removes database records; client cleans storage or on cascade)
create or replace function public.delete_my_tryon_results(p_id uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;

  if p_id is null then
    delete from public.tryon_results where user_id = auth.uid();
    delete from public.saved_items where user_id = auth.uid() and item_type = 'tryon_result';
  else
    delete from public.tryon_results where id = p_id and user_id = auth.uid();
    delete from public.saved_items where tryon_result_id = p_id and user_id = auth.uid();
  end if;
end $$;

-- Extend export_my_data to include tryon_results metadata
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
    'tryon_results', (select coalesce(jsonb_agg(to_jsonb(tr)), '[]') from tryon_results tr where user_id = auth.uid()),
    'consent_records', (select coalesce(jsonb_agg(to_jsonb(cr)), '[]') from consent_records cr where user_id = auth.uid()),
    'saved_items', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from saved_items s where user_id = auth.uid()),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n)), '[]') from notifications n where user_id = auth.uid()),
    'appointments', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from appointments a where user_id = auth.uid()),
    'support_tickets', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from support_tickets t where user_id = auth.uid()),
    'activity', (select coalesce(jsonb_agg(to_jsonb(e)), '[]') from analytics_events e where user_id = auth.uid()));
end $$;

revoke all on function public.set_tryon_consent(boolean), public.save_tryon_result(uuid, uuid, text, text), public.delete_my_tryon_results(uuid) from public, anon;
grant execute on function public.set_tryon_consent(boolean), public.save_tryon_result(uuid, uuid, text, text), public.delete_my_tryon_results(uuid) to authenticated;

