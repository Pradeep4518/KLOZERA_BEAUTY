-- ==============================================================================
-- KLOZEVA CLOUD SAAS HARDENING, PERFORMANCE INDEXES & IDENTITY VALIDATION
-- Migration: 20260301000014_cloud_saas_hardening_and_indexes.sql
-- ==============================================================================

-- 1. Performance Indexes for RLS Predicates & High-Volume Lookups
create index if not exists beauty_ai_logs_customer_idx
  on public.beauty_ai_analysis_logs (customer_id);

create index if not exists customer_corrections_customer_idx
  on public.customer_shade_corrections (customer_id);

create index if not exists biometric_consents_customer_idx
  on public.customer_biometric_consents (customer_id);

create index if not exists biometric_consents_scheduled_del_idx
  on public.customer_biometric_consents (scheduled_deletion_at);

-- 2. Anti-Spoofing INSERT Policies for Authenticated Cloud Users
-- In authenticated mode, users cannot insert records on behalf of another customer_id

drop policy if exists beauty_ai_logs_insert on public.beauty_ai_analysis_logs;
create policy beauty_ai_logs_insert on public.beauty_ai_analysis_logs
  for insert to anon, authenticated
  with check (
    -- Anonymous kiosk session (unauthenticated guest flow)
    auth.role() = 'anon'
    -- Authenticated shopper must match own identity
    or customer_id = auth.uid()::text
    -- Or platform admin
    or public.is_admin()
  );

drop policy if exists customer_corrections_insert on public.customer_shade_corrections;
create policy customer_corrections_insert on public.customer_shade_corrections
  for insert to anon, authenticated
  with check (
    auth.role() = 'anon'
    or customer_id = auth.uid()::text
    or public.is_admin()
  );

drop policy if exists biometric_consent_insert on public.customer_biometric_consents;
create policy biometric_consent_insert on public.customer_biometric_consents
  for insert to anon, authenticated
  with check (
    auth.role() = 'anon'
    or customer_id = auth.uid()::text
    or public.is_admin()
  );

-- 3. Dedicated Verification Function for Health Checks & Synthetic Monitoring
create or replace function public.get_beauty_ai_system_health()
returns jsonb
language plpgsql
security definer
as $$
declare
  active_models_count integer;
  total_logs_count integer;
  consents_count integer;
begin
  select count(*) into active_models_count from public.beauty_ai_models;
  select count(*) into total_logs_count from public.beauty_ai_analysis_logs;
  select count(*) into consents_count from public.customer_biometric_consents;

  return json_build_object(
    'status', 'healthy',
    'timestamp', now(),
    'active_models', active_models_count,
    'telemetry_records', total_logs_count,
    'consent_records', consents_count,
    'environment', 'cloud-saas'
  );
end;
$$;

grant execute on function public.get_beauty_ai_system_health() to anon, authenticated;

