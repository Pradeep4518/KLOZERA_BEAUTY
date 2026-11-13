-- KLOZEVA Beauty Intelligence: optional server-side copy of the app database.
-- The app keeps its whole relational store (brands, products, shades, inventory, customers, analyses,
-- recommendations, messages, retailer accounts) as one JSON document, so it is stored as a single row.
-- Only used when the frontend runs with VITE_BEAUTY_BACKEND=supabase.
--
-- SECURITY NOTE: the Beauty kiosk has no Supabase Auth (the retailer login is a client-side demo login),
-- so these policies let the public anon key read/write the single 'main' row. Treat the stored data as
-- demo data. Before using real customer data, put Supabase Auth in front of the kiosk and restrict
-- the policies below to authenticated retailer staff.
create table if not exists public.beauty_kiosk_store (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.beauty_kiosk_store enable row level security;

drop policy if exists beauty_kiosk_store_select on public.beauty_kiosk_store;
create policy beauty_kiosk_store_select on public.beauty_kiosk_store
  for select to anon, authenticated using (id = 'main');

drop policy if exists beauty_kiosk_store_insert on public.beauty_kiosk_store;
create policy beauty_kiosk_store_insert on public.beauty_kiosk_store
  for insert to anon, authenticated with check (id = 'main');

drop policy if exists beauty_kiosk_store_update on public.beauty_kiosk_store;
create policy beauty_kiosk_store_update on public.beauty_kiosk_store
  for update to anon, authenticated using (id = 'main') with check (id = 'main');
