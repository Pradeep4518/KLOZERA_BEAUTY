-- ==============================================================================
-- KLOZEVA MULTI-TENANT SaaS, PRIVATE BIOMETRIC STORAGE & STRICT RLS ENFORCEMENT
-- Migration: 20260301000013_multi_tenant_saas_and_private_storage.sql
-- ==============================================================================

-- 1. Private Storage Bucket for Consented Customer Facial Portraits
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-portraits-private',
  'customer-portraits-private',
  false,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Storage Policies: strictly scoped to the authenticated customer's own folder (user_id/...)
drop policy if exists customer_portraits_insert on storage.objects;
create policy customer_portraits_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'customer-portraits-private' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists customer_portraits_select on storage.objects;
create policy customer_portraits_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'customer-portraits-private' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists customer_portraits_delete on storage.objects;
create policy customer_portraits_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'customer-portraits-private' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Multi-Tenant Association on Beauty AI Telemetry & Corrections
alter table if exists public.beauty_ai_analysis_logs
  add column if not exists business_id uuid references public.businesses(id) on delete set null;

create index if not exists beauty_ai_logs_business_idx
  on public.beauty_ai_analysis_logs (business_id);

alter table if exists public.customer_shade_corrections
  add column if not exists business_id uuid references public.businesses(id) on delete set null;

create index if not exists customer_corrections_business_idx
  on public.customer_shade_corrections (business_id);

-- 3. Strict Multi-Tenant Row Level Security Policies
-- Replace overly broad select policies with strict tenant and customer boundaries

-- A. beauty_ai_analysis_logs
drop policy if exists beauty_ai_logs_select on public.beauty_ai_analysis_logs;
create policy beauty_ai_logs_select on public.beauty_ai_analysis_logs
  for select to authenticated
  using (
    -- Customer owns record
    customer_id = auth.uid()::text
    -- Retailer member belongs to the business hosting the kiosk
    or (business_id is not null and exists (
      select 1 from public.business_members bm
      where bm.business_id = public.beauty_ai_analysis_logs.business_id
        and bm.user_id = auth.uid()
    ))
    -- Platform admin
    or public.is_admin()
  );

-- B. customer_shade_corrections
drop policy if exists customer_corrections_select on public.customer_shade_corrections;
create policy customer_corrections_select on public.customer_shade_corrections
  for select to authenticated
  using (
    -- Customer owns record
    customer_id = auth.uid()::text
    -- Retailer member of associated store
    or (business_id is not null and exists (
      select 1 from public.business_members bm
      where bm.business_id = public.customer_shade_corrections.business_id
        and bm.user_id = auth.uid()
    ))
    -- Platform admin
    or public.is_admin()
  );

-- C. customer_biometric_consents (Sensitive Biometric Records)
drop policy if exists biometric_consent_select on public.customer_biometric_consents;
create policy biometric_consent_select on public.customer_biometric_consents
  for select to authenticated
  using (
    customer_id = auth.uid()::text
    or public.is_admin()
  );

-- Allow customer to update/withdraw consent
drop policy if exists biometric_consent_update on public.customer_biometric_consents;
create policy biometric_consent_update on public.customer_biometric_consents
  for update to authenticated
  using (customer_id = auth.uid()::text)
  with check (customer_id = auth.uid()::text);

-- 4. Biometric Data Retention & Auto-Purge Procedure
create or replace function public.cleanup_expired_biometric_data()
returns integer
language plpgsql
security definer
as $$
declare
  purged_count integer := 0;
begin
  -- Delete expired analysis telemetry past retention period
  delete from public.beauty_ai_analysis_logs
  where created_at < (now() - interval '90 days')
    and privacy_ephemeral_flag = true;

  -- Delete expired biometric consent records past scheduled deletion
  with deleted as (
    delete from public.customer_biometric_consents
    where scheduled_deletion_at <= now()
    returning id
  )
  select count(*) into purged_count from deleted;

  return purged_count;
end;
$$;

