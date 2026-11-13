-- KLOZEVA Stage 2: On-device analysis results, industry profiles, and privacy consent records.

-- 1. Industry profiles: single current profile per user per industry
create table if not exists public.industry_profiles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  industry industry not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, industry)
);
create index if not exists industry_profiles_user_idx on public.industry_profiles (user_id);

-- 2. Analysis results: full history of customer estimates
create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  industry industry not null,
  kind text not null,
  result jsonb not null default '{}'::jsonb,
  method text not null,
  created_at timestamptz not null default now()
);
create index if not exists analysis_results_user_idx on public.analysis_results (user_id, created_at desc);

-- 3. Consent records: immutable audit log of consent decisions
create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists consent_records_user_idx on public.consent_records (user_id, created_at desc);

-- 4. Extend analytics_events event constraint
alter table public.analytics_events drop constraint if exists analytics_events_event_check;
alter table public.analytics_events add constraint analytics_events_event_check
  check (event in ('view_industry', 'view_product', 'search', 'save_item', 'run_analysis', 'view_recommendation'));

-- 5. Row Level Security: customer only; retailers and other customers can NEVER read; admins cannot read analysis results
alter table public.industry_profiles enable row level security;
alter table public.analysis_results enable row level security;
alter table public.consent_records enable row level security;

drop policy if exists industry_profiles_select on public.industry_profiles;
create policy industry_profiles_select on public.industry_profiles for select to authenticated using (user_id = auth.uid());

drop policy if exists analysis_results_select on public.analysis_results;
create policy analysis_results_select on public.analysis_results for select to authenticated using (user_id = auth.uid());

drop policy if exists consent_records_select on public.consent_records;
create policy consent_records_select on public.consent_records for select to authenticated using (user_id = auth.uid());

-- Revoke direct mutations: writes MUST go through the SECURITY DEFINER functions
revoke all on public.industry_profiles from anon;
revoke all on public.analysis_results from anon;
revoke all on public.consent_records from anon;

revoke insert, update, delete on public.industry_profiles from authenticated;
revoke insert, update, delete on public.analysis_results from authenticated;
revoke insert, update, delete on public.consent_records from authenticated;

grant select on public.industry_profiles to authenticated;
grant select on public.analysis_results to authenticated;
grant select on public.consent_records to authenticated;

-- 6. SECURITY DEFINER functions for consent & analysis management

create or replace function public.set_photo_consent(p_granted boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  update customer_preferences set image_consent = p_granted, updated_at = now() where user_id = auth.uid();
  insert into consent_records (user_id, purpose, granted) values (auth.uid(), 'photo_analysis', p_granted);
end $$;

create or replace function public.save_analysis(
  p_industry industry,
  p_kind text,
  p_result jsonb,
  p_method text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_consent boolean;
  v_id uuid := gen_random_uuid();
  v_existing jsonb;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;

  -- Refuse to save photo-derived results unless consent is granted
  if p_kind not in ('fitness_manual', 'skin_type_self_report', 'hair_type_self_report') and p_method <> 'manual' then
    v_consent := (select image_consent from customer_preferences where user_id = auth.uid());
    if coalesce(v_consent, false) = false then
      raise exception 'consent_required';
    end if;
  end if;

  insert into analysis_results (id, user_id, industry, kind, result, method)
  values (v_id, auth.uid(), p_industry, p_kind, p_result, p_method);

  v_existing := (select data from industry_profiles where user_id = auth.uid() and industry = p_industry);
  if v_existing is null then
    v_existing := '{}'::jsonb;
  end if;
  v_existing := jsonb_set(v_existing, array[p_kind], p_result, true);

  insert into industry_profiles (user_id, industry, data, updated_at)
  values (auth.uid(), p_industry, v_existing, now())
  on conflict (user_id, industry) do update
  set data = v_existing, updated_at = now();

  return v_id;
end $$;

create or replace function public.delete_my_analysis(p_industry industry default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;

  if p_industry is null then
    delete from analysis_results where user_id = auth.uid();
    delete from industry_profiles where user_id = auth.uid();
  else
    delete from analysis_results where user_id = auth.uid() and industry = p_industry;
    delete from industry_profiles where user_id = auth.uid() and industry = p_industry;
  end if;
end $$;

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
    'consent_records', (select coalesce(jsonb_agg(to_jsonb(cr)), '[]') from consent_records cr where user_id = auth.uid()),
    'saved_items', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from saved_items s where user_id = auth.uid()),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n)), '[]') from notifications n where user_id = auth.uid()),
    'appointments', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from appointments a where user_id = auth.uid()),
    'support_tickets', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from support_tickets t where user_id = auth.uid()),
    'activity', (select coalesce(jsonb_agg(to_jsonb(e)), '[]') from analytics_events e where user_id = auth.uid()));
end $$;

revoke all on function public.set_photo_consent(boolean), public.save_analysis(industry, text, jsonb, text), public.delete_my_analysis(industry) from public, anon;
grant execute on function public.set_photo_consent(boolean), public.save_analysis(industry, text, jsonb, text), public.delete_my_analysis(industry) to authenticated;

-- 7. Ensure handle_new_user trigger is idempotent and active
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'user'), 60))
  on conflict (id) do nothing;
  insert into customer_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  perform _notify(new.id, 'system', 'Welcome to KLOZEVA', 'Your account works across Beauty, Fashion, Salon, Jewellery and Fitness.', '/customer/dashboard');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

