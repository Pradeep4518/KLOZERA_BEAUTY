-- ==============================================================================
-- KLOZEVA AI BEAUTY INTELLIGENCE: AUDIT LOGS, MODEL REGISTRY & CUSTOMER PREFERENCES
-- Migration: 20260301000012_beauty_ai_audit_and_corrections.sql
-- ==============================================================================

-- 1. AI Model Registry Table
create table if not exists public.beauty_ai_models (
  id                         text primary key,
  name                       text not null,
  architecture               text not null,
  task                       text not null,
  version                    text not null,
  license                    text not null,
  commercial_clearance       boolean not null default false,
  runtime_target             text not null default 'browser',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

-- Seed authoritative models into registry
insert into public.beauty_ai_models (id, name, architecture, task, version, license, commercial_clearance, runtime_target)
values
  ('mediapipe-face-landmarker', 'MediaPipe FaceLandmarker', 'MobileNetV2 Attention Mesh', '3d-facial-landmarks', '0.10.14', 'Apache-2.0', true, 'browser'),
  ('klozeva-cielab-ita-engine', 'KLOZEVA CIELAB & ITA Engine', 'Calibrated Color Physics', 'skin-depth-and-undertone', '2.0.0', 'MIT', true, 'browser'),
  ('jonathandinu/face-parsing', 'SegFormer Face Parsing', 'SegFormer B0', 'image-segmentation', '1.0.0', 'MIT (wrapper)', false, 'browser-research'),
  ('gemini-2.5-flash', 'Google Gemini 2.5 Vision', 'Multimodal Foundation Transformer', 'multimodal-beauty-profile', '2.5', 'Commercial Cloud API', true, 'edge-function')
on conflict (id) do update set
  version = excluded.version,
  commercial_clearance = excluded.commercial_clearance,
  updated_at = now();

-- 2. AI Analysis Audit & Telemetry Logs
create table if not exists public.beauty_ai_analysis_logs (
  id                         uuid primary key default gen_random_uuid(),
  customer_id                text not null,
  model_id                   text not null references public.beauty_ai_models(id),
  detected_skin_tone         text not null,
  detected_undertone         text not null,
  detected_skin_type         text not null,
  ita_degrees                numeric(5, 2),
  confidence_score           numeric(4, 2) not null,
  image_quality_score        numeric(4, 2),
  execution_duration_ms      integer,
  privacy_ephemeral_flag     boolean not null default true,
  created_at                 timestamptz not null default now()
);

-- 3. Customer Shade & Undertone Corrections (Separate from raw predictions)
create table if not exists public.customer_shade_corrections (
  id                         uuid primary key default gen_random_uuid(),
  customer_id                text not null,
  analysis_log_id            uuid references public.beauty_ai_analysis_logs(id) on delete set null,
  original_tone              text not null,
  corrected_tone             text,
  original_undertone         text not null,
  corrected_undertone        text,
  original_skin_type         text not null,
  corrected_skin_type        text,
  notes                      text,
  created_at                 timestamptz not null default now()
);

-- 4. Customer Biometric Consent & Data Retention Records
create table if not exists public.customer_biometric_consents (
  id                         uuid primary key default gen_random_uuid(),
  customer_id                text not null,
  consent_biometric_scan     boolean not null default true,
  consent_marketing          boolean not null default false,
  retention_policy_accepted  boolean not null default true,
  captured_at                timestamptz not null default now(),
  scheduled_deletion_at      timestamptz not null default (now() + interval '30 days')
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.beauty_ai_models enable row level security;
alter table public.beauty_ai_analysis_logs enable row level security;
alter table public.customer_shade_corrections enable row level security;
alter table public.customer_biometric_consents enable row level security;

-- Models are public read-only for verification
drop policy if exists beauty_ai_models_select on public.beauty_ai_models;
create policy beauty_ai_models_select on public.beauty_ai_models
  for select to anon, authenticated using (true);

-- Anonymous / Authenticated Kiosk can insert execution logs
drop policy if exists beauty_ai_logs_insert on public.beauty_ai_analysis_logs;
create policy beauty_ai_logs_insert on public.beauty_ai_analysis_logs
  for insert to anon, authenticated with check (true);

drop policy if exists beauty_ai_logs_select on public.beauty_ai_analysis_logs;
create policy beauty_ai_logs_select on public.beauty_ai_analysis_logs
  for select to authenticated using (true);

-- Customer corrections: insertable from kiosk session
drop policy if exists customer_corrections_insert on public.customer_shade_corrections;
create policy customer_corrections_insert on public.customer_shade_corrections
  for insert to anon, authenticated with check (true);

drop policy if exists customer_corrections_select on public.customer_shade_corrections;
create policy customer_corrections_select on public.customer_shade_corrections
  for select to authenticated using (true);

-- Customer biometric consents: kiosk write, authenticated read
drop policy if exists biometric_consent_insert on public.customer_biometric_consents;
create policy biometric_consent_insert on public.customer_biometric_consents
  for insert to anon, authenticated with check (true);

drop policy if exists biometric_consent_select on public.customer_biometric_consents;
create policy biometric_consent_select on public.customer_biometric_consents
  for select to authenticated using (true);

