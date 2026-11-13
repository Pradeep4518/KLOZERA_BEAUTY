create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active') $$;
create or replace function public.is_active() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active') $$;
create or replace function public.is_business_member(p_business uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from business_members where business_id = p_business and user_id = auth.uid()) $$;
create or replace function public.is_member_of_text(p text) returns boolean language sql stable security definer set search_path = public as $$
  select case when p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then is_business_member(p::uuid) else false end $$;
create or replace function public.can_view_business(p_business uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from businesses b where b.id = p_business and b.status = 'verified') or is_business_member(p_business) or is_admin() $$;

create or replace function public._bypass() returns void language sql as $$ select set_config('klozeva.bypass', '1', true) $$;
create or replace function public._require_admin() returns void language plpgsql security definer set search_path = public as $$
begin if not is_admin() then raise exception 'forbidden'; end if; end $$;
create or replace function public._audit(p_action text, p_type text, p_id uuid, p_details jsonb default '{}') returns void language sql security definer set search_path = public as $$
  insert into audit_logs (admin_id, action, target_type, target_id, details) values (auth.uid(), p_action, p_type, p_id, p_details) $$;
create or replace function public._notify(p_user uuid, p_category text, p_title text, p_body text, p_link text) returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, category, title, body, link) values (p_user, p_category, p_title, p_body, p_link) $$;
create or replace function public._notify_admins(p_title text, p_body text, p_link text) returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, category, title, body, link) select id, 'system', p_title, p_body, p_link from profiles where role = 'admin' and status = 'active' $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'user'), 60));
  insert into customer_preferences (user_id) values (new.id);
  perform _notify(new.id, 'system', 'Welcome to KLOZEVA', 'Your account works across Beauty, Fashion, Salon, Jewellery and Fitness.', '/customer/dashboard');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.guard_profile() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('klozeva.bypass', true), '') <> '1' and (new.role <> old.role or new.status <> old.status or new.id <> old.id) then raise exception 'forbidden'; end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile();

-- Products always inherit the industry of their business; the category must belong to the same industry.
create or replace function public.products_guard() returns trigger language plpgsql as $$
declare v_ind industry; v_cat industry;
begin
  v_ind := (select industry from businesses where id = new.business_id);
  v_cat := (select industry from product_categories where id = new.category_id);
  if v_ind is null or v_cat is null or v_ind <> v_cat then raise exception 'category_mismatch'; end if;
  if tg_op = 'UPDATE' and new.business_id <> old.business_id then raise exception 'forbidden'; end if;
  new.industry := v_ind;
  return new;
end $$;
drop trigger if exists products_guard on public.products;
create trigger products_guard before insert or update on public.products for each row execute function public.products_guard();

create or replace function public.businesses_guard() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('klozeva.bypass', true), '') <> '1' and (new.status <> old.status or new.industry <> old.industry or new.created_by <> old.created_by or new.verified_at is distinct from old.verified_at or new.status_note is distinct from old.status_note) then
    raise exception 'forbidden';
  end if;
  return new;
end $$;
drop trigger if exists businesses_guard on public.businesses;
create trigger businesses_guard before update on public.businesses for each row execute function public.businesses_guard();

create or replace function public.register_business(p_industry industry, p_name text, p_description text, p_city text, p_email text, p_phone text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid := gen_random_uuid();
begin
  if auth.uid() is null or not is_active() then raise exception 'unauthorized'; end if;
  if (select count(*) from businesses where created_by = auth.uid()) >= 3 then raise exception 'business_limit'; end if;
  insert into businesses (id, industry, name, description, city, contact_email, contact_phone, created_by)
  values (v_id, p_industry, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), nullif(trim(coalesce(p_city, '')), ''), nullif(trim(coalesce(p_email, '')), ''), nullif(trim(coalesce(p_phone, '')), ''), auth.uid());
  insert into business_members (business_id, user_id, member_role) values (v_id, auth.uid(), 'owner');
  perform _bypass();
  update profiles set role = 'retailer' where id = auth.uid() and role = 'customer';
  perform _notify_admins('New retailer awaiting verification', trim(p_name) || ' (' || p_industry::text || ')', '/admin/retailers');
  perform _notify(auth.uid(), 'system', 'Retailer application received', 'An administrator will verify ' || trim(p_name) || ' before customers can see your products.', '/retailer/settings');
  return v_id;
end $$;

create or replace function public.admin_set_business_status(p_id uuid, p_status business_status, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_biz_name text;
begin
  perform _require_admin();
  if p_status in ('rejected', 'suspended') and coalesce(trim(p_note), '') = '' then raise exception 'reason_required'; end if;
  perform 1 from businesses where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  v_biz_name := (select name from businesses where id = p_id);
  perform _bypass();
  update businesses set status = p_status, status_note = nullif(trim(coalesce(p_note, '')), ''), verified_at = case when p_status = 'verified' then now() else verified_at end where id = p_id;
  perform _audit('business_' || p_status::text, 'business', p_id, jsonb_build_object('note', p_note));
  insert into notifications (user_id, category, title, body, link)
  select user_id, 'system', 'Business ' || p_status::text, v_biz_name || ' is now ' || p_status::text || coalesce(': ' || nullif(trim(p_note), ''), '.'), '/retailer/settings' from business_members where business_id = p_id;
end $$;

create or replace function public.adjust_stock(p_variant uuid, p_delta int, p_reason text) returns int language plpgsql security definer set search_path = public as $$
declare v_biz uuid; v_new int;
begin
  v_biz := (select p.business_id from product_variants v join products p on p.id = v.product_id where v.id = p_variant);
  if v_biz is null or not is_business_member(v_biz) or not is_active() then raise exception 'not_found'; end if;
  if p_delta = 0 or coalesce(trim(p_reason), '') = '' then raise exception 'invalid_request'; end if;
  update product_variants set stock = stock + p_delta where id = p_variant;   -- check (stock >= 0) rejects negatives
  v_new := (select stock from product_variants where id = p_variant);
  insert into inventory_movements (variant_id, delta, reason, stock_after, actor_id) values (p_variant, p_delta, left(trim(p_reason), 120), v_new, auth.uid());
  return v_new;
end $$;

create or replace function public.admin_stats() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  return jsonb_build_object(
    'customers', (select count(*) from profiles where role = 'customer'),
    'retailers', (select count(*) from businesses),
    'pending_retailers', (select count(*) from businesses where status = 'pending'),
    'verified_retailers', (select count(*) from businesses where status = 'verified'),
    'products', (select count(*) from products),
    'open_tickets', (select count(*) from support_tickets where status <> 'resolved'));
end $$;

create or replace function public.admin_list_users(p_search text default '', p_limit int default 20, p_offset int default 0)
returns table (id uuid, full_name text, email text, role user_role, status account_status, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  return query select p.id, p.full_name, u.email::text, p.role, p.status, p.created_at from profiles p join auth.users u on u.id = p.id
   where coalesce(p_search, '') = '' or position(lower(p_search) in lower(p.full_name)) > 0 or position(lower(p_search) in lower(u.email)) > 0
   order by p.created_at desc limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_set_user_status(p_user uuid, p_status account_status, p_reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  if p_user = auth.uid() or exists (select 1 from profiles where id = p_user and role = 'admin') then raise exception 'forbidden'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  perform _bypass();
  update profiles set status = p_status where id = p_user;
  perform _audit('user_' || p_status::text, 'profile', p_user, jsonb_build_object('reason', p_reason));
  if p_status = 'suspended' then begin delete from auth.sessions where user_id = p_user; exception when others then null; end; end if;
end $$;

create or replace function public.admin_set_ticket_status(p_id uuid, p_status ticket_status) returns void language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update support_tickets set status = p_status where id = p_id;
  perform _audit('ticket_' || p_status::text, 'support_ticket', p_id, '{}');
end $$;

-- Privacy: export everything we hold about the caller, and delete the account (cascades to all owned rows).
create or replace function public.export_my_data() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from profiles p where id = auth.uid()),
    'preferences', (select to_jsonb(c) from customer_preferences c where user_id = auth.uid()),
    'saved_items', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from saved_items s where user_id = auth.uid()),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n)), '[]') from notifications n where user_id = auth.uid()),
    'appointments', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from appointments a where user_id = auth.uid()),
    'support_tickets', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from support_tickets t where user_id = auth.uid()),
    'activity', (select coalesce(jsonb_agg(to_jsonb(e)), '[]') from analytics_events e where user_id = auth.uid()));
end $$;

create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if exists (select 1 from profiles where id = auth.uid() and role = 'admin') then raise exception 'forbidden'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Run ONCE in the SQL editor after signing up. No default admin credentials exist.
create or replace function public.promote_admin(p_email text) returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  v_id := (select id from auth.users where lower(email) = lower(p_email) limit 1);
  if v_id is null then raise exception 'No user with that email. Sign up first.'; end if;
  perform _bypass();
  update profiles set role = 'admin' where id = v_id;
  insert into audit_logs (admin_id, action, target_type, target_id) values (null, 'admin_promoted', 'profile', v_id);
end $$;
