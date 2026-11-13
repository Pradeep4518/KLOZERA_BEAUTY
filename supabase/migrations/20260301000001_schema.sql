-- KLOZEVA Stage 1 schema: one customer identity across five industries, multi-tenant retailers, catalogue, saved items, notifications.
create type user_role as enum ('customer', 'retailer', 'admin');
create type account_status as enum ('active', 'suspended');
create type industry as enum ('beauty', 'fashion', 'salon', 'jewellery', 'fitness');
create type business_status as enum ('pending', 'verified', 'rejected', 'suspended');
create type product_kind as enum ('product', 'service');
create type ticket_status as enum ('open', 'in_progress', 'resolved');

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 60),
  phone text check (phone is null or phone ~ '^[0-9+ -]{7,15}$'),
  avatar_path text,
  role user_role not null default 'customer',
  status account_status not null default 'active',
  last_industry industry not null default 'beauty',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create table public.customer_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_industries industry[] not null default array['beauty']::industry[],
  favourite_brands text[] not null default '{}' check (cardinality(favourite_brands) <= 20),
  categories text[] not null default '{}' check (cardinality(categories) <= 30),
  style_notes text check (char_length(style_notes) <= 500),
  beauty_notes text check (char_length(beauty_notes) <= 500),
  jewellery_notes text check (char_length(jewellery_notes) <= 500),
  fitness_goals text check (char_length(fitness_goals) <= 500),
  channels jsonb not null default '{"in_app": true, "email": true, "sms": false, "whatsapp": false}',
  topics jsonb not null default '{"promotions": true, "appointments": true, "new_arrivals": true, "system": true}',
  image_consent boolean not null default false,   -- explicit consent for photo processing (used from Stage 2)
  updated_at timestamptz not null default now()
);
create trigger prefs_touch before update on public.customer_preferences for each row execute function public.touch_updated_at();

create table public.product_categories (
  id serial primary key,
  industry industry not null,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  unique (industry, slug)
);
insert into public.product_categories (industry, slug, name, sort_order) values
  ('beauty', 'foundation', 'Foundation', 1), ('beauty', 'concealer', 'Concealer', 2), ('beauty', 'lipstick', 'Lipstick', 3), ('beauty', 'blush', 'Blush', 4), ('beauty', 'skincare', 'Skincare', 5), ('beauty', 'other-makeup', 'Other makeup', 6),
  ('fashion', 'dresses', 'Dresses', 1), ('fashion', 'shirts', 'Shirts', 2), ('fashion', 'trousers', 'Trousers', 3), ('fashion', 'jackets', 'Jackets', 4), ('fashion', 'traditional', 'Traditional wear', 5), ('fashion', 'accessories', 'Accessories', 6),
  ('salon', 'haircuts', 'Haircuts', 1), ('salon', 'hairstyles', 'Hairstyles', 2), ('salon', 'hair-colour', 'Hair colour', 3), ('salon', 'treatments', 'Treatments', 4), ('salon', 'haircare', 'Haircare products', 5),
  ('jewellery', 'rings', 'Rings', 1), ('jewellery', 'necklaces', 'Necklaces', 2), ('jewellery', 'pendants', 'Pendants', 3), ('jewellery', 'earrings', 'Earrings', 4), ('jewellery', 'bracelets', 'Bracelets', 5), ('jewellery', 'bridal', 'Bridal', 6),
  ('fitness', 'programmes', 'Programmes', 1), ('fitness', 'memberships', 'Memberships', 2), ('fitness', 'apparel', 'Apparel', 3), ('fitness', 'equipment', 'Equipment', 4), ('fitness', 'wearables', 'Wearables', 5);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  industry industry not null,
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 600),
  city text check (char_length(city) <= 80),
  contact_email text check (char_length(contact_email) <= 120),
  contact_phone text check (contact_phone is null or contact_phone ~ '^[0-9+ -]{7,15}$'),
  status business_status not null default 'pending',
  status_note text,
  verified_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger businesses_touch before update on public.businesses for each row execute function public.touch_updated_at();

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_idx on public.business_members (user_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  industry industry not null,                    -- always derived from the business by trigger
  category_id int not null references public.product_categories(id),
  name text not null check (char_length(name) between 2 and 100),
  brand text check (char_length(brand) <= 60),
  description text not null default '' check (char_length(description) <= 1500),
  price numeric(10, 2) not null check (price >= 0 and price <= 10000000),
  kind product_kind not null default 'product',
  attributes jsonb not null default '{}',        -- structured attributes used by the Stage 2+ matching engine (shade, undertone, sizes, material...)
  tryon_supported boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_catalogue_idx on public.products (industry, is_active, category_id);
create index products_business_idx on public.products (business_id);
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  sku text check (char_length(sku) <= 40),
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  size text check (char_length(size) <= 20),
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, label)
);
create index variants_product_idx on public.product_variants (product_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_idx on public.product_images (product_id, sort_order);

create table public.inventory_movements (
  id bigserial primary key,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  delta int not null check (delta <> 0),
  reason text not null check (char_length(reason) between 1 and 120),
  stock_after int not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_movements_idx on public.inventory_movements (variant_id, created_at desc);

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null default 'product' check (item_type in ('product', 'service', 'outfit', 'hairstyle', 'jewellery', 'tryon_result')),
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('promotions', 'appointments', 'new_arrivals', 'system')),
  title text not null,
  body text not null default '',
  product_id uuid references public.products(id) on delete set null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  starts_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  stylist text, notes text,
  created_at timestamptz not null default now()
);
create index appointments_user_idx on public.appointments (user_id, starts_at desc);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'help' check (kind in ('help', 'issue')),
  subject text not null check (char_length(subject) between 3 and 120),
  message text not null check (char_length(message) between 5 and 2000),
  status ticket_status not null default 'open',
  created_at timestamptz not null default now()
);
create index tickets_user_idx on public.support_tickets (user_id, created_at desc);

create table public.analytics_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event text not null check (event in ('view_industry', 'view_product', 'search', 'save_item')),
  industry industry,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);
create index analytics_user_idx on public.analytics_events (user_id, created_at desc);

create table public.audit_logs (
  id bigserial primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null, target_type text not null, target_id uuid,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index audit_created_idx on public.audit_logs (created_at desc);
