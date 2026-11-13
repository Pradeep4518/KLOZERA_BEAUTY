-- KLOZEVA Commercial Retailer Platform Extension (000009)
-- Strictly additive & idempotent extension after 000008.
-- Enforces product lifecycle & verification, automated submission checks support,
-- business verification documents, team RBAC & invitations, non-overlapping offers &
-- server-side effective pricing, inventory thresholds & crossing alerts,
-- k=5 anonymized retailer analytics, notification preferences, and support linkage.
--
-- IMPORTANT (Supabase Dashboard SQL Editor compatibility):
-- ZERO `SELECT ... INTO` or `RETURNING ... INTO` statements inside `$$` blocks.
-- All scalar assignments use `v := (select ...);` and IDs are pre-generated via `gen_random_uuid()`.

-- ============================================================================
-- 1. TEAM ROLES, INVITATIONS & RETAILER AUDIT LOGS (SECTION 9)
-- ============================================================================

alter table public.business_members drop constraint if exists business_members_member_role_check;
update public.business_members set member_role = 'manager' where member_role = 'staff';
alter table public.business_members add constraint business_members_member_role_check
  check (member_role in ('owner', 'manager', 'catalogue_editor', 'viewer'));

create or replace function public.business_member_role(p_business uuid) returns text
language sql stable security definer set search_path = public as $$
  select bm.member_role
  from public.business_members bm
  join public.profiles pr on pr.id = bm.user_id
  where bm.business_id = p_business
    and bm.user_id = auth.uid()
    and pr.status = 'active'
  limit 1
$$;

create or replace function public.has_business_role(p_business uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.business_members bm
    join public.profiles pr on pr.id = bm.user_id
    where bm.business_id = p_business
      and bm.user_id = auth.uid()
      and pr.status = 'active'
      and bm.member_role = any(p_roles)
  )
$$;

create or replace function public.can_manage_catalogue(p_business uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_business_role(p_business, array['owner', 'manager', 'catalogue_editor'])
$$;

create or replace function public.can_manage_business_settings(p_business uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_business_role(p_business, array['owner', 'manager'])
$$;

create or replace function public.is_business_owner(p_business uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_business_role(p_business, array['owner'])
$$;

create or replace function public.can_manage_catalogue_text(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.can_manage_catalogue(p::uuid)
    else false
  end
$$;

create or replace function public.can_manage_business_settings_text(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.can_manage_business_settings(p::uuid)
    else false
  end
$$;

drop policy if exists members_select on public.business_members;
create policy members_select on public.business_members for select to authenticated
  using (user_id = auth.uid() or public.is_business_member(business_id) or public.is_admin());

create table if not exists public.retailer_audit_logs (
  id bigserial primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists retailer_audit_logs_biz_idx
  on public.retailer_audit_logs (business_id, created_at desc);

alter table public.retailer_audit_logs enable row level security;
drop policy if exists retailer_audit_select on public.retailer_audit_logs;
create policy retailer_audit_select on public.retailer_audit_logs for select to authenticated
  using (public.is_business_owner(business_id) or public.is_admin());

revoke all on public.retailer_audit_logs from anon;
revoke insert, update, delete on public.retailer_audit_logs from authenticated;
grant select on public.retailer_audit_logs to authenticated;

create or replace function public._retailer_audit(
  p_business_id uuid,
  p_action text,
  p_type text,
  p_id uuid,
  p_details jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = public as $$
  insert into public.retailer_audit_logs (business_id, actor_id, action, target_type, target_id, details)
  values (p_business_id, auth.uid(), p_action, p_type, p_id, coalesce(p_details, '{}'::jsonb))
$$;
revoke all on function public._retailer_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;

create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  member_role text not null check (member_role in ('owner', 'manager', 'catalogue_editor', 'viewer')),
  token text not null unique,
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists business_invitations_biz_idx
  on public.business_invitations (business_id, created_at desc);
create index if not exists business_invitations_email_idx
  on public.business_invitations (lower(email));

alter table public.business_invitations enable row level security;
drop policy if exists business_invitations_select on public.business_invitations;
create policy business_invitations_select on public.business_invitations for select to authenticated
  using (public.is_business_owner(business_id) or public.is_admin());

revoke all on public.business_invitations from anon;
revoke insert, update, delete on public.business_invitations from authenticated;
grant select on public.business_invitations to authenticated;

create or replace function public.list_business_team(p_business_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_is_owner boolean;
  v_members jsonb := '[]'::jsonb;
  v_invites jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not (public.is_business_member(p_business_id) or public.is_admin()) then
    raise exception 'forbidden';
  end if;

  v_is_owner := public.is_business_owner(p_business_id) or public.is_admin();

  v_members := (
    select coalesce(jsonb_agg(row_to_json(m) order by m.created_at asc), '[]'::jsonb)
    from (
      select
        bm.user_id,
        bm.member_role,
        bm.created_at,
        pr.full_name,
        pr.status as account_status,
        u.email::text as email
      from public.business_members bm
      join public.profiles pr on pr.id = bm.user_id
      join auth.users u on u.id = bm.user_id
      where bm.business_id = p_business_id
    ) m
  );

  if v_is_owner then
    v_invites := (
      select coalesce(jsonb_agg(row_to_json(iv) order by iv.created_at desc), '[]'::jsonb)
      from (
        select
          i.id,
          i.email,
          i.member_role,
          i.token,
          i.expires_at,
          i.accepted_at,
          i.revoked_at,
          i.created_at
        from public.business_invitations i
        where i.business_id = p_business_id
        order by i.created_at desc
        limit 50
      ) iv
    );
  end if;

  return jsonb_build_object('members', v_members, 'invitations', v_invites);
end $$;

create or replace function public.invite_business_member(
  p_business_id uuid,
  p_email text,
  p_role text,
  p_expires_days int default 7
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_days int;
  v_id uuid := gen_random_uuid();
  v_token text;
  v_expires timestamptz;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  if not public.is_business_owner(p_business_id) then raise exception 'forbidden'; end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or position('@' in v_email) < 2 then raise exception 'invalid_request'; end if;
  if p_role not in ('owner', 'manager', 'catalogue_editor', 'viewer') then raise exception 'invalid_request'; end if;

  if exists (
    select 1
    from public.business_members bm
    join auth.users u on u.id = bm.user_id
    where bm.business_id = p_business_id and lower(u.email) = v_email
  ) then
    raise exception 'already_member';
  end if;

  v_days := least(greatest(coalesce(p_expires_days, 7), 1), 30);
  v_expires := now() + make_interval(days => v_days);
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.business_invitations (id, business_id, email, member_role, token, invited_by, expires_at)
  values (v_id, p_business_id, v_email, p_role, v_token, auth.uid(), v_expires);

  perform public._retailer_audit(p_business_id, 'team_invited', 'business_invitation', v_id, jsonb_build_object('email', v_email, 'role', p_role, 'expires_at', v_expires));

  return jsonb_build_object('id', v_id, 'email', v_email, 'member_role', p_role, 'token', v_token, 'expires_at', v_expires);
end $$;

create or replace function public.list_my_pending_invitations() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  v_email := (select lower(u.email) from auth.users u where u.id = auth.uid() limit 1);
  if v_email is null then return '[]'::jsonb; end if;

  return (
    select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb)
    from (
      select
        bi.id,
        bi.business_id,
        b.name as business_name,
        b.industry,
        b.city,
        bi.member_role,
        bi.token,
        bi.expires_at,
        bi.created_at
      from public.business_invitations bi
      join public.businesses b on b.id = bi.business_id
      where lower(bi.email) = v_email
        and bi.accepted_at is null
        and bi.revoked_at is null
        and bi.expires_at > now()
    ) t
  );
end $$;

create or replace function public.accept_business_invitation(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_inv_id uuid;
  v_biz_id uuid;
  v_inv_email text;
  v_role text;
  v_expires timestamptz;
  v_accepted timestamptz;
  v_revoked timestamptz;
  v_caller_email text;
  v_biz_name text;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;

  v_inv_id := (select bi.id from public.business_invitations bi where bi.token = trim(coalesce(p_token, '')) limit 1);
  if v_inv_id is null then raise exception 'invitation_invalid'; end if;

  v_biz_id := (select bi.business_id from public.business_invitations bi where bi.id = v_inv_id);
  v_inv_email := (select lower(bi.email) from public.business_invitations bi where bi.id = v_inv_id);
  v_role := (select bi.member_role from public.business_invitations bi where bi.id = v_inv_id);
  v_expires := (select bi.expires_at from public.business_invitations bi where bi.id = v_inv_id);
  v_accepted := (select bi.accepted_at from public.business_invitations bi where bi.id = v_inv_id);
  v_revoked := (select bi.revoked_at from public.business_invitations bi where bi.id = v_inv_id);

  if v_accepted is not null or v_revoked is not null then raise exception 'invitation_invalid'; end if;
  if v_expires <= now() then raise exception 'invitation_expired'; end if;

  v_caller_email := (select lower(u.email) from auth.users u where u.id = auth.uid() limit 1);
  if v_caller_email is null or v_caller_email <> v_inv_email then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.business_members (business_id, user_id, member_role)
  values (v_biz_id, auth.uid(), v_role)
  on conflict (business_id, user_id) do update set member_role = excluded.member_role;

  update public.business_invitations
     set accepted_at = now(), accepted_by = auth.uid()
   where id = v_inv_id;

  perform public._bypass();
  update public.profiles set role = 'retailer' where id = auth.uid() and role = 'customer';
  perform set_config('klozeva.bypass', '0', true);

  v_biz_name := (select b.name from public.businesses b where b.id = v_biz_id);
  perform public._retailer_audit(v_biz_id, 'team_invite_accepted', 'business_member', auth.uid(), jsonb_build_object('role', v_role));
  perform public._notify(auth.uid(), 'system', 'Joined ' || coalesce(v_biz_name, 'retailer team'), 'Your role is now ' || replace(v_role, '_', ' ') || '.', '/retailer');

  return jsonb_build_object('business_id', v_biz_id, 'business_name', v_biz_name, 'member_role', v_role);
end $$;

create or replace function public.revoke_business_invitation(p_invitation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  v_biz_id := (select bi.business_id from public.business_invitations bi where bi.id = p_invitation_id);
  if v_biz_id is null then raise exception 'not_found'; end if;
  if not public.is_business_owner(v_biz_id) then raise exception 'forbidden'; end if;

  update public.business_invitations set revoked_at = now() where id = p_invitation_id and accepted_at is null;
  perform public._retailer_audit(v_biz_id, 'team_invite_revoked', 'business_invitation', p_invitation_id, '{}'::jsonb);
end $$;

create or replace function public.update_business_member_role(
  p_business_id uuid,
  p_user_id uuid,
  p_role text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_current text;
  v_owners int;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  if not public.is_business_owner(p_business_id) then raise exception 'forbidden'; end if;
  if p_role not in ('owner', 'manager', 'catalogue_editor', 'viewer') then raise exception 'invalid_request'; end if;

  v_current := (select bm.member_role from public.business_members bm where bm.business_id = p_business_id and bm.user_id = p_user_id);
  if v_current is null then raise exception 'not_found'; end if;

  if v_current = 'owner' and p_role <> 'owner' then
    v_owners := (select count(*) from public.business_members where business_id = p_business_id and member_role = 'owner');
    if v_owners <= 1 then raise exception 'cannot_remove_last_owner'; end if;
  end if;

  update public.business_members set member_role = p_role where business_id = p_business_id and user_id = p_user_id;
  perform public._retailer_audit(p_business_id, 'team_role_updated', 'business_member', p_user_id, jsonb_build_object('from', v_current, 'to', p_role));
end $$;

create or replace function public.remove_business_member(
  p_business_id uuid,
  p_user_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_current text;
  v_owners int;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  if not public.is_business_owner(p_business_id) then raise exception 'forbidden'; end if;

  v_current := (select bm.member_role from public.business_members bm where bm.business_id = p_business_id and bm.user_id = p_user_id);
  if v_current is null then raise exception 'not_found'; end if;

  if v_current = 'owner' then
    v_owners := (select count(*) from public.business_members where business_id = p_business_id and member_role = 'owner');
    if v_owners <= 1 then raise exception 'cannot_remove_last_owner'; end if;
  end if;

  delete from public.business_members where business_id = p_business_id and user_id = p_user_id;
  perform public._retailer_audit(p_business_id, 'team_member_removed', 'business_member', p_user_id, jsonb_build_object('prior_role', v_current));
end $$;

-- ============================================================================
-- 2. NOTIFICATION PREFERENCES & BUSINESS SUPPORT TICKETS (SECTION 9)
-- ============================================================================

create table if not exists public.business_notification_preferences (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  low_stock boolean not null default true,
  review_decisions boolean not null default true,
  offer_updates boolean not null default true,
  verification_updates boolean not null default true,
  team_updates boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

drop trigger if exists bnp_touch on public.business_notification_preferences;
create trigger bnp_touch before update on public.business_notification_preferences
  for each row execute function public.touch_updated_at();

alter table public.business_notification_preferences enable row level security;
drop policy if exists bnp_select on public.business_notification_preferences;
create policy bnp_select on public.business_notification_preferences for select to authenticated
  using (user_id = auth.uid() and public.is_business_member(business_id));
drop policy if exists bnp_insert on public.business_notification_preferences;
create policy bnp_insert on public.business_notification_preferences for insert to authenticated
  with check (user_id = auth.uid() and public.is_business_member(business_id));
drop policy if exists bnp_update on public.business_notification_preferences;
create policy bnp_update on public.business_notification_preferences for update to authenticated
  using (user_id = auth.uid() and public.is_business_member(business_id))
  with check (user_id = auth.uid() and public.is_business_member(business_id));

revoke all on public.business_notification_preferences from anon;
revoke delete on public.business_notification_preferences from authenticated;
grant select, insert, update on public.business_notification_preferences to authenticated;

alter table public.support_tickets
  add column if not exists business_id uuid references public.businesses(id) on delete set null;
create index if not exists support_tickets_business_idx
  on public.support_tickets (business_id, created_at desc)
  where business_id is not null;

drop policy if exists tickets_select on public.support_tickets;
create policy tickets_select on public.support_tickets for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (business_id is not null and public.is_business_member(business_id))
  );

drop policy if exists tickets_insert on public.support_tickets;
create policy tickets_insert on public.support_tickets for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active()
    and (business_id is null or public.is_business_member(business_id))
  );

-- ============================================================================
-- 3. BUSINESS VERIFICATION DOCUMENTS & STORE PROFILE (SECTIONS 4 & 9)
-- ============================================================================

alter table public.businesses add column if not exists gstin_or_reg_no text check (gstin_or_reg_no is null or char_length(gstin_or_reg_no) <= 40);
alter table public.businesses add column if not exists doc_review_status text not null default 'not_submitted'
  check (doc_review_status in ('not_submitted', 'pending', 'more_info_requested', 'approved', 'rejected'));
alter table public.businesses add column if not exists logo_path text;
alter table public.businesses add column if not exists banner_path text;
alter table public.businesses add column if not exists address text check (address is null or char_length(address) <= 300);
alter table public.businesses add column if not exists opening_hours jsonb not null default '{}'::jsonb;
alter table public.businesses add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.businesses add column if not exists return_policy text check (return_policy is null or char_length(return_policy) <= 1000);

drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses for update to authenticated
  using (public.can_manage_business_settings(id))
  with check (public.can_manage_business_settings(id));

revoke update on public.businesses from authenticated;
grant update (
  name, description, city, contact_email, contact_phone,
  gstin_or_reg_no, logo_path, banner_path, address, opening_hours, social_links, return_policy
) on public.businesses to authenticated;

create or replace function public.businesses_guard() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('klozeva.bypass', true), '') <> '1' and (
    new.status <> old.status
    or new.industry <> old.industry
    or new.created_by <> old.created_by
    or new.verified_at is distinct from old.verified_at
    or new.status_note is distinct from old.status_note
    or new.doc_review_status is distinct from old.doc_review_status
  ) then
    raise exception 'forbidden';
  end if;
  return new;
end $$;

create table if not exists public.business_verification_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  doc_type text not null check (doc_type in ('gstin_certificate', 'business_registration', 'shop_licence', 'pan_card', 'trademark_or_auth', 'other')),
  reg_number text check (reg_number is null or char_length(reg_number) <= 40),
  storage_path text not null,
  file_name text not null check (char_length(file_name) between 1 and 200),
  mime_type text not null,
  file_size int not null check (file_size > 0 and file_size <= 5242880),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists bvd_business_idx
  on public.business_verification_documents (business_id, created_at desc);

create table if not exists public.business_verification_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null default 'retailer',
  decision text not null check (decision in ('submitted', 'approved', 'rejected', 'more_info_requested', 'verified', 'suspended')),
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists bvh_business_idx
  on public.business_verification_history (business_id, created_at desc);

alter table public.business_verification_documents enable row level security;
alter table public.business_verification_history enable row level security;

drop policy if exists bvd_select on public.business_verification_documents;
create policy bvd_select on public.business_verification_documents for select to authenticated
  using (public.is_business_member(business_id) or public.is_admin());

drop policy if exists bvh_select on public.business_verification_history;
create policy bvh_select on public.business_verification_history for select to authenticated
  using (public.is_business_member(business_id) or public.is_admin());

revoke all on public.business_verification_documents, public.business_verification_history from anon;
revoke insert, update, delete on public.business_verification_documents, public.business_verification_history from authenticated;
grant select on public.business_verification_documents, public.business_verification_history to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('verification-docs', 'verification-docs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('store-media', 'store-media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists verification_docs_select on storage.objects;
create policy verification_docs_select on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (public.is_member_of_text((storage.foldername(name))[1]) or public.is_admin())
  );

drop policy if exists verification_docs_insert on storage.objects;
create policy verification_docs_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and public.can_manage_business_settings_text((storage.foldername(name))[1])
  );

drop policy if exists verification_docs_delete on storage.objects;
create policy verification_docs_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and public.can_manage_business_settings_text((storage.foldername(name))[1])
  );

drop policy if exists store_media_insert on storage.objects;
create policy store_media_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'store-media'
    and public.can_manage_business_settings_text((storage.foldername(name))[1])
  );

drop policy if exists store_media_delete on storage.objects;
create policy store_media_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'store-media'
    and public.can_manage_business_settings_text((storage.foldername(name))[1])
  );

create or replace function public.submit_business_verification_doc(
  p_business_id uuid,
  p_doc_type text,
  p_reg_number text,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_file_size int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := gen_random_uuid();
  v_biz_name text;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  if not public.can_manage_business_settings(p_business_id) then raise exception 'forbidden'; end if;
  if split_part(coalesce(p_storage_path, ''), '/', 1) <> p_business_id::text then
    raise exception 'invalid_storage_path';
  end if;

  insert into public.business_verification_documents (
    id, business_id, doc_type, reg_number, storage_path, file_name, mime_type, file_size, uploaded_by
  ) values (
    v_id, p_business_id, p_doc_type, nullif(trim(coalesce(p_reg_number, '')), ''),
    p_storage_path, left(trim(coalesce(p_file_name, 'document')), 200),
    p_mime_type, p_file_size, auth.uid()
  );

  perform public._bypass();
  update public.businesses
     set gstin_or_reg_no = coalesce(nullif(trim(coalesce(p_reg_number, '')), ''), gstin_or_reg_no),
         doc_review_status = 'pending'
   where id = p_business_id;
  perform set_config('klozeva.bypass', '0', true);

  insert into public.business_verification_history (business_id, actor_id, actor_role, decision, reason)
  values (p_business_id, auth.uid(), 'retailer', 'submitted', 'Uploaded ' || replace(p_doc_type, '_', ' ') || coalesce(' (' || nullif(trim(coalesce(p_reg_number, '')), '') || ')', ''));

  v_biz_name := (select b.name from public.businesses b where b.id = p_business_id);
  perform public._retailer_audit(p_business_id, 'verification_doc_uploaded', 'business_verification_document', v_id, jsonb_build_object('doc_type', p_doc_type, 'reg_number', p_reg_number));
  perform public._notify_admins('Retailer verification document uploaded', coalesce(v_biz_name, 'A retailer') || ' uploaded ' || replace(p_doc_type, '_', ' '), '/admin/retailers');

  return v_id;
end $$;

create or replace function public.delete_business_verification_doc(p_doc_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  v_biz_id := (select d.business_id from public.business_verification_documents d where d.id = p_doc_id);
  if v_biz_id is null then raise exception 'not_found'; end if;
  if not public.can_manage_business_settings(v_biz_id) then raise exception 'forbidden'; end if;

  delete from public.business_verification_documents where id = p_doc_id;
  perform public._retailer_audit(v_biz_id, 'verification_doc_deleted', 'business_verification_document', p_doc_id, '{}'::jsonb);
end $$;

create or replace function public.admin_review_business_docs(
  p_business_id uuid,
  p_decision text,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_name text;
  v_clean_reason text;
begin
  perform public._require_admin();
  if p_decision not in ('approved', 'rejected', 'more_info_requested') then
    raise exception 'invalid_request';
  end if;
  v_clean_reason := nullif(trim(coalesce(p_reason, '')), '');
  if p_decision in ('rejected', 'more_info_requested') and v_clean_reason is null then
    raise exception 'reason_required';
  end if;

  v_biz_name := (select b.name from public.businesses b where b.id = p_business_id);
  if v_biz_name is null then raise exception 'not_found'; end if;

  if p_decision = 'approved' and not exists (
    select 1 from public.business_verification_documents where business_id = p_business_id
  ) and coalesce((select b.gstin_or_reg_no from public.businesses b where b.id = p_business_id), '') = '' then
    raise exception 'doc_required';
  end if;

  perform public._bypass();
  update public.businesses
     set doc_review_status = p_decision,
         status = case
           when p_decision = 'approved' then 'verified'::business_status
           when p_decision = 'rejected' then 'rejected'::business_status
           else status
         end,
         status_note = coalesce(v_clean_reason, status_note),
         verified_at = case when p_decision = 'approved' then now() else verified_at end
   where id = p_business_id;
  perform set_config('klozeva.bypass', '0', true);

  insert into public.business_verification_history (business_id, actor_id, actor_role, decision, reason)
  values (p_business_id, auth.uid(), 'admin', p_decision, v_clean_reason);

  perform public._audit('business_docs_' || p_decision, 'business', p_business_id, jsonb_build_object('reason', v_clean_reason));

  insert into public.notifications (user_id, category, title, body, link)
  select
    bm.user_id,
    'system',
    'Verification review: ' || replace(p_decision, '_', ' '),
    v_biz_name || ' verification documents marked ' || replace(p_decision, '_', ' ') || coalesce(': ' || v_clean_reason, '.'),
    '/retailer/settings'
  from public.business_members bm
  where bm.business_id = p_business_id
    and coalesce((
      select bnp.verification_updates
      from public.business_notification_preferences bnp
      where bnp.business_id = p_business_id and bnp.user_id = bm.user_id
    ), true) = true;
end $$;

create or replace function public.admin_set_business_status(p_id uuid, p_status business_status, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_name text;
  v_clean_note text;
begin
  perform public._require_admin();
  v_clean_note := nullif(trim(coalesce(p_note, '')), '');
  if p_status in ('rejected', 'suspended') and v_clean_note is null then
    raise exception 'reason_required';
  end if;

  v_biz_name := (select b.name from public.businesses b where b.id = p_id);
  if v_biz_name is null then raise exception 'not_found'; end if;

  perform public._bypass();
  update public.businesses
     set status = p_status,
         status_note = v_clean_note,
         verified_at = case when p_status = 'verified' then now() else verified_at end
   where id = p_id;
  perform set_config('klozeva.bypass', '0', true);

  if p_status in ('verified', 'rejected', 'suspended') then
    insert into public.business_verification_history (business_id, actor_id, actor_role, decision, reason)
    values (p_id, auth.uid(), 'admin', p_status::text, v_clean_note);
  end if;

  perform public._audit('business_' || p_status::text, 'business', p_id, jsonb_build_object('note', p_note));
  insert into public.notifications (user_id, category, title, body, link)
  select
    bm.user_id,
    'system',
    'Business ' || p_status::text,
    v_biz_name || ' is now ' || p_status::text || coalesce(': ' || v_clean_note, '.'),
    '/retailer/settings'
  from public.business_members bm
  where bm.business_id = p_id;
end $$;

-- ============================================================================
-- 4. PRODUCT LIFECYCLE, REVIEW TIMELINE, CHECKS & ARCHIVE (SECTIONS 2, 3, 5)
-- ============================================================================

alter table public.products add column if not exists sku text check (sku is null or char_length(sku) <= 40);
alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists global_product_id uuid;
alter table public.saved_items add column if not exists global_product_id uuid;
alter table public.tryon_results add column if not exists global_product_id uuid;
alter table public.analytics_events add column if not exists global_product_id uuid;
alter table public.products add column if not exists submitted_at timestamptz;
alter table public.products add column if not exists submitted_by uuid references public.profiles(id) on delete set null;
alter table public.products add column if not exists reviewed_at timestamptz;
alter table public.products add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.products add column if not exists approved_at timestamptz;
alter table public.products add column if not exists review_note text;
alter table public.products add column if not exists mrp_price numeric(10, 2) check (mrp_price is null or (mrp_price >= 0 and mrp_price <= 10000000));
alter table public.products add column if not exists tax_rate numeric(5, 2) check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 100));
alter table public.products add column if not exists highlights text[] not null default '{}';
alter table public.products add column if not exists video_url text;
alter table public.products add column if not exists tags text[] not null default '{}';
alter table public.products add column if not exists service_details jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists declarations jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists declaration_accepted_by uuid references public.profiles(id) on delete set null;
alter table public.products add column if not exists declaration_accepted_at timestamptz;
alter table public.products add column if not exists last_check_summary jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'review_status'
  ) then
    execute 'alter table public.products add column review_status text not null default ''draft'' check (review_status in (''draft'',''pending_review'',''approved'',''rejected'',''changes_requested'',''archived''))';
    execute 'update public.products set review_status = case when is_active then ''approved'' else ''draft'' end, approved_at = case when is_active then created_at else null end';
  end if;
end $$;

create index if not exists products_review_status_idx
  on public.products (review_status, industry, is_active);

alter table public.product_images add column if not exists width_px int;
alter table public.product_images add column if not exists height_px int;
alter table public.product_images add column if not exists sha256 text;
create index if not exists product_images_sha256_idx
  on public.product_images (sha256)
  where sha256 is not null;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null default 'retailer',
  event_type text not null check (event_type in ('submitted', 'resubmitted', 'approved', 'rejected', 'changes_requested', 'archived', 'auto_re_review')),
  reason text,
  check_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists product_reviews_prod_idx
  on public.product_reviews (product_id, created_at desc);

alter table public.product_reviews enable row level security;
drop policy if exists product_reviews_select on public.product_reviews;
create policy product_reviews_select on public.product_reviews for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_id and public.is_business_member(p.business_id)
    )
  );

revoke all on public.product_reviews from anon;
revoke insert, update, delete on public.product_reviews from authenticated;
grant select on public.product_reviews to authenticated;

create table if not exists public.banned_words (
  id serial primary key,
  word text not null unique check (char_length(trim(word)) between 2 and 60),
  severity text not null default 'error' check (severity in ('error', 'warning')),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.banned_words (word, severity, note) values
  ('counterfeit', 'error', 'Prohibited counterfeit listing claim'),
  ('first copy', 'error', 'Prohibited replica claim'),
  ('replica', 'error', 'Prohibited replica claim'),
  ('7a quality', 'error', 'Prohibited replica grading claim'),
  ('miracle cure', 'error', 'Prohibited unverified medical claim'),
  ('guaranteed weight loss', 'error', 'Prohibited medical claim'),
  ('whatsapp me', 'warning', 'Off-platform contact solicitation'),
  ('dm to order', 'warning', 'Off-platform contact solicitation')
on conflict (word) do nothing;

alter table public.banned_words enable row level security;
drop policy if exists banned_words_select on public.banned_words;
create policy banned_words_select on public.banned_words for select to authenticated using (true);
drop policy if exists banned_words_write on public.banned_words;
create policy banned_words_write on public.banned_words for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.banned_words from anon;
grant select, insert, update, delete on public.banned_words to authenticated;

-- Customer catalogue visibility: STRICTLY approved + active + verified business (members/admins see own/all)
drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated
  using (
    (
      review_status = 'approved'
      and is_active = true
      and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'verified')
    )
    or public.is_business_member(business_id)
    or public.is_admin()
  );

drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert to authenticated
  with check (public.can_manage_catalogue(business_id) and public.is_active());

drop policy if exists products_update on public.products;
create policy products_update on public.products for update to authenticated
  using (public.can_manage_catalogue(business_id))
  with check (public.can_manage_catalogue(business_id));

drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete to authenticated
  using (public.can_manage_catalogue(business_id));

drop policy if exists variants_select on public.product_variants;
create policy variants_select on public.product_variants for select to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (
        (
          p.review_status = 'approved'
          and p.is_active = true
          and exists (select 1 from public.businesses b where b.id = p.business_id and b.status = 'verified')
        )
        or public.is_business_member(p.business_id)
        or public.is_admin()
      )
    )
  );

drop policy if exists variants_insert on public.product_variants;
create policy variants_insert on public.product_variants for insert to authenticated
  with check (
    stock = 0
    and exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id))
  );

drop policy if exists variants_update on public.product_variants;
create policy variants_update on public.product_variants for update to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)));

drop policy if exists variants_delete on public.product_variants;
create policy variants_delete on public.product_variants for delete to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)));

drop policy if exists images_select on public.product_images;
create policy images_select on public.product_images for select to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (
        (
          p.review_status = 'approved'
          and p.is_active = true
          and exists (select 1 from public.businesses b where b.id = p.business_id and b.status = 'verified')
        )
        or public.is_business_member(p.business_id)
        or public.is_admin()
      )
    )
  );

drop policy if exists images_insert on public.product_images;
create policy images_insert on public.product_images for insert to authenticated
  with check (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)));

drop policy if exists images_update on public.product_images;
create policy images_update on public.product_images for update to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)));

drop policy if exists images_delete on public.product_images;
create policy images_delete on public.product_images for delete to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)));

grant update (sort_order, width_px, height_px, sha256) on public.product_images to authenticated;

-- Tighten try-on asset policies & product-images storage policies to role matrix
drop policy if exists tryon_assets_select on public.product_tryon_assets;
create policy tryon_assets_select on public.product_tryon_assets for select to authenticated, anon
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (
        (
          p.review_status = 'approved'
          and p.is_active = true
          and exists (select 1 from public.businesses b where b.id = p.business_id and b.status = 'verified')
        )
        or public.is_business_member(p.business_id)
        or public.is_admin()
      )
    )
  );

drop policy if exists tryon_assets_insert on public.product_tryon_assets;
create policy tryon_assets_insert on public.product_tryon_assets for insert to authenticated
  with check (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)));

drop policy if exists tryon_assets_update on public.product_tryon_assets;
create policy tryon_assets_update on public.product_tryon_assets for update to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)));

drop policy if exists tryon_assets_delete on public.product_tryon_assets;
create policy tryon_assets_delete on public.product_tryon_assets for delete to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.can_manage_catalogue(p.business_id)));

drop policy if exists product_images_write on storage.objects;
create policy product_images_write on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.can_manage_catalogue_text((storage.foldername(name))[1]));

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.can_manage_catalogue_text((storage.foldername(name))[1]));

drop policy if exists tryon_assets_upload on storage.objects;
create policy tryon_assets_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'tryon-assets' and public.can_manage_catalogue_text((storage.foldername(name))[1]));

drop policy if exists tryon_assets_remove on storage.objects;
create policy tryon_assets_remove on storage.objects for delete to authenticated
  using (bucket_id = 'tryon-assets' and public.can_manage_catalogue_text((storage.foldername(name))[1]));

-- Product lifecycle guard: enforces category/industry match, protects review columns,
-- allows instant price/MRP/tax/is_active edits on approved products, and queues substantive
-- changes (name, brand, category, description, highlights, attributes, tryon_supported,
-- subcategory, video_url, service_details) back into pending_review.
create or replace function public.products_guard() returns trigger language plpgsql as $$
declare
  v_ind industry;
  v_cat industry;
  v_bypass boolean;
begin
  v_ind := (select b.industry from public.businesses b where b.id = new.business_id);
  v_cat := (select pc.industry from public.product_categories pc where pc.id = new.category_id);
  if v_ind is null or v_cat is null or v_ind <> v_cat then
    raise exception 'category_mismatch';
  end if;

  v_bypass := (coalesce(current_setting('klozeva.bypass', true), '') = '1');
  new.industry := v_ind;

  if tg_op = 'INSERT' then
    if not v_bypass then
      new.review_status := 'draft';
      new.submitted_at := null;
      new.submitted_by := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.approved_at := null;
      new.review_note := null;
      new.declaration_accepted_by := null;
      new.declaration_accepted_at := null;
      new.archived_at := null;
    end if;
    return new;
  end if;

  if new.business_id <> old.business_id then
    raise exception 'forbidden';
  end if;

  if not v_bypass then
    if new.review_status is distinct from old.review_status
       or new.submitted_at is distinct from old.submitted_at
       or new.submitted_by is distinct from old.submitted_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.reviewed_by is distinct from old.reviewed_by
       or new.approved_at is distinct from old.approved_at
       or new.review_note is distinct from old.review_note
       or new.declaration_accepted_by is distinct from old.declaration_accepted_by
       or new.declaration_accepted_at is distinct from old.declaration_accepted_at
       or new.archived_at is distinct from old.archived_at then
      raise exception 'forbidden';
    end if;

    if old.review_status = 'approved' and (
      new.name is distinct from old.name
      or coalesce(new.brand, '') is distinct from coalesce(old.brand, '')
      or new.category_id is distinct from old.category_id
      or coalesce(new.description, '') is distinct from coalesce(old.description, '')
      or coalesce(new.highlights, '{}'::text[]) is distinct from coalesce(old.highlights, '{}'::text[])
      or coalesce(new.attributes, '{}'::jsonb) is distinct from coalesce(old.attributes, '{}'::jsonb)
      or new.tryon_supported is distinct from old.tryon_supported
      or coalesce(new.subcategory, '') is distinct from coalesce(old.subcategory, '')
      or coalesce(new.video_url, '') is distinct from coalesce(old.video_url, '')
      or coalesce(new.service_details, '{}'::jsonb) is distinct from coalesce(old.service_details, '{}'::jsonb)
    ) then
      new.review_status := 'pending_review';
      new.submitted_at := now();
      new.submitted_by := auth.uid();
      new.review_note := 'Substantive product details edited — queued for re-review';
    end if;
  end if;

  return new;
end $$;

create or replace function public.products_log_auto_re_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.review_status = 'approved'
     and new.review_status = 'pending_review'
     and coalesce(current_setting('klozeva.bypass', true), '') <> '1' then
    insert into public.product_reviews (product_id, actor_id, actor_role, event_type, reason)
    values (new.id, auth.uid(), 'retailer', 'auto_re_review', 'Substantive details updated after approval');
    perform public._notify_admins('Approved product edited for re-review', new.name || ' requires re-approval.', '/admin/products');
  end if;
  return new;
end $$;

drop trigger if exists products_log_auto_re_review on public.products;
create trigger products_log_auto_re_review
  after update on public.products
  for each row execute function public.products_log_auto_re_review();

-- Image changes (add / remove / reorder) on approved products also require re-review
create or replace function public.product_images_re_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_prod_id uuid;
  v_status text;
  v_name text;
begin
  if coalesce(current_setting('klozeva.bypass', true), '') = '1' then
    return null;
  end if;

  v_prod_id := case when tg_op = 'DELETE' then old.product_id else new.product_id end;
  v_status := (select p.review_status from public.products p where p.id = v_prod_id);
  if v_status = 'approved' then
    v_name := (select p.name from public.products p where p.id = v_prod_id);
    perform public._bypass();
    update public.products
       set review_status = 'pending_review',
           submitted_at = now(),
           submitted_by = auth.uid(),
           review_note = 'Product photos modified — queued for re-review'
     where id = v_prod_id and review_status = 'approved';
    perform set_config('klozeva.bypass', '0', true);

    insert into public.product_reviews (product_id, actor_id, actor_role, event_type, reason)
    values (v_prod_id, auth.uid(), 'retailer', 'auto_re_review', 'Product photos added, removed, or reordered');
    perform public._notify_admins('Product images updated for re-review', coalesce(v_name, 'Product') || ' photos changed and require re-approval.', '/admin/products');
  end if;
  return null;
end $$;

drop trigger if exists product_images_re_review on public.product_images;
create trigger product_images_re_review
  after insert or update of sort_order, storage_path or delete on public.product_images
  for each row execute function public.product_images_re_review();

-- Protect customer-saved products from hard deletion; retailers archive them instead
create or replace function public.products_prevent_saved_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('klozeva.bypass', true), '') <> '1'
     and exists (select 1 from public.saved_items si where si.product_id = old.id) then
    raise exception 'saved_product_archived';
  end if;
  return old;
end $$;

drop trigger if exists products_prevent_saved_delete on public.products;
create trigger products_prevent_saved_delete
  before delete on public.products
  for each row execute function public.products_prevent_saved_delete();

create or replace function public.archive_or_delete_product(p_product_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_biz uuid;
  v_name text;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  v_biz := (select p.business_id from public.products p where p.id = p_product_id);
  if v_biz is null then raise exception 'not_found'; end if;
  if not public.can_manage_catalogue(v_biz) then raise exception 'forbidden'; end if;

  v_name := (select p.name from public.products p where p.id = p_product_id);

  if exists (select 1 from public.saved_items si where si.product_id = p_product_id) then
    perform public._bypass();
    update public.products
       set review_status = 'archived',
           is_active = false,
           archived_at = now(),
           review_note = 'Archived by retailer (saved by customers)'
     where id = p_product_id;
    perform set_config('klozeva.bypass', '0', true);

    insert into public.product_reviews (product_id, actor_id, actor_role, event_type, reason)
    values (p_product_id, auth.uid(), 'retailer', 'archived', 'Archived instead of deleted because customers saved this item');

    perform public._retailer_audit(v_biz, 'product_archived', 'product', p_product_id, jsonb_build_object('name', v_name));
    return 'archived';
  else
    perform public._retailer_audit(v_biz, 'product_deleted', 'product', p_product_id, jsonb_build_object('name', v_name));
    delete from public.products where id = p_product_id;
    return 'deleted';
  end if;
end $$;

-- Update save_tryon_result and delete_my_account cleanly
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then raise exception 'forbidden'; end if;
  perform public._bypass();
  delete from auth.users where id = auth.uid();
  perform set_config('klozeva.bypass', '0', true);
end $$;

create or replace function public.save_tryon_result(
  p_product_id uuid,
  p_variant_id uuid,
  p_engine text,
  p_storage_path text,
  p_industry industry default null,
  p_metadata jsonb default '{}'::jsonb,
  p_global_product_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_consent boolean;
  v_id uuid := gen_random_uuid();
  v_industry industry;
  v_global_eligible boolean;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;

  v_consent := (
    select cr.granted
    from public.consent_records cr
    where cr.user_id = auth.uid() and cr.purpose = 'tryon_save'
    order by cr.created_at desc
    limit 1
  );
  if coalesce(v_consent, false) = false then raise exception 'consent_required'; end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then raise exception 'invalid_storage_path'; end if;

  if p_product_id is not null then
    v_industry := (
      select p.industry
      from public.products p
      join public.businesses b on b.id = p.business_id
      where p.id = p_product_id
        and (
          (p.review_status = 'approved' and p.is_active = true and b.status = 'verified')
          or public.is_business_member(b.id)
          or public.is_admin()
        )
      limit 1
    );
    if v_industry is null then raise exception 'product_not_found'; end if;
  elsif p_global_product_id is not null and exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'global_catalogue_products'
  ) then
    v_global_eligible := (
      select g.is_virtual_tryon_eligible
      from public.global_catalogue_products g
      where g.id = p_global_product_id
      limit 1
    );
    if v_global_eligible is null then raise exception 'product_not_found'; end if;
    if v_global_eligible = false then raise exception 'invalid_request'; end if;
    v_industry := (select g.industry from public.global_catalogue_products g where g.id = p_global_product_id limit 1);
  else
    v_industry := p_industry;
  end if;

  insert into public.tryon_results (id, user_id, product_id, global_product_id, variant_id, engine, storage_path, industry, metadata)
  values (v_id, auth.uid(), p_product_id, p_global_product_id, p_variant_id, p_engine, p_storage_path, coalesce(p_industry, v_industry), coalesce(p_metadata, '{}'::jsonb));

  insert into public.saved_items (user_id, product_id, global_product_id, item_type, tryon_result_id)
  values (auth.uid(), p_product_id, p_global_product_id, 'tryon_result', v_id);

  return v_id;
end $$;

-- Update stock-confirmed notifications to require review_status = 'approved'
create or replace function public.dispatch_stock_confirmed_notifications(p_product_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
  v_biz_status business_status;
  v_biz_name text;
  v_ind industry;
  v_prod_name text;
  v_brand text;
  v_subcat text;
  v_cat_id int;
  v_cat_name text;
  v_is_active boolean;
  v_review_status text;
  v_tryon boolean;
  v_total_stock int := 0;
  v_link text;
begin
  v_biz_id := (select p.business_id from public.products p where p.id = p_product_id);
  if v_biz_id is null then return; end if;

  v_is_active := (select p.is_active from public.products p where p.id = p_product_id);
  v_review_status := (select p.review_status from public.products p where p.id = p_product_id);
  if coalesce(v_is_active, false) = false or v_review_status is distinct from 'approved' then return; end if;

  v_biz_status := (select b.status from public.businesses b where b.id = v_biz_id);
  if v_biz_status is distinct from 'verified' then return; end if;

  v_total_stock := coalesce((
    select sum(pv.stock)::int
    from public.product_variants pv
    where pv.product_id = p_product_id and pv.is_active = true and pv.stock > 0
  ), 0);
  if v_total_stock <= 0 then return; end if;

  v_biz_name := (select b.name from public.businesses b where b.id = v_biz_id);
  v_ind := (select p.industry from public.products p where p.id = p_product_id);
  v_prod_name := (select p.name from public.products p where p.id = p_product_id);
  v_brand := (select p.brand from public.products p where p.id = p_product_id);
  v_subcat := (select p.subcategory from public.products p where p.id = p_product_id);
  v_cat_id := (select p.category_id from public.products p where p.id = p_product_id);
  v_tryon := (select p.tryon_supported from public.products p where p.id = p_product_id);
  v_cat_name := (select pc.name from public.product_categories pc where pc.id = v_cat_id);
  v_link := '/customer/product/' || p_product_id::text;

  insert into public.notifications (user_id, category, title, body, product_id, link)
  select
    cp.user_id,
    'new_arrivals',
    case when v_tryon then 'In-stock try-on match: ' || v_prod_name else 'Now in stock: ' || v_prod_name end,
    coalesce(v_biz_name, 'Verified retailer') || ' confirmed stock (' || v_total_stock || ' units) for ' || v_prod_name ||
      case when v_cat_name is not null then ' in ' || v_cat_name else '' end ||
      case when v_tryon then '. Virtual try-on preview is ready.' else '.' end,
    p_product_id,
    v_link
  from public.customer_preferences cp
  join public.profiles pr on pr.id = cp.user_id
  where pr.status = 'active'
    and coalesce((cp.topics ->> 'new_arrivals')::boolean, true) = true
    and coalesce((cp.channels ->> 'in_app')::boolean, true) = true
    and (
      v_ind = any(cp.preferred_industries)
      or (v_brand is not null and exists (select 1 from unnest(cp.favourite_brands) fb where lower(trim(fb)) = lower(trim(v_brand))))
      or (v_cat_name is not null and exists (select 1 from unnest(cp.categories) ct where lower(trim(ct)) = lower(trim(v_cat_name))))
      or (v_subcat is not null and exists (select 1 from unnest(cp.categories) ct where lower(trim(ct)) = lower(trim(v_subcat))))
      or (cp.beauty_notes is not null and trim(cp.beauty_notes) <> '' and exists (
        select 1 from public.product_variants pv
        where pv.product_id = p_product_id and pv.is_active = true and pv.stock > 0
          and (position(lower(trim(pv.label)) in lower(cp.beauty_notes)) > 0 or position(lower(v_prod_name) in lower(cp.beauty_notes)) > 0)
      ))
    )
    and not exists (
      select 1 from public.notifications n where n.user_id = cp.user_id and n.product_id = p_product_id and n.category = 'new_arrivals'
    );
end $$;

create or replace function public.notify_matching_customers_on_product() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_active and new.review_status = 'approved' then
    perform public.dispatch_stock_confirmed_notifications(new.id);
  end if;
  return new;
end $$;

drop trigger if exists products_notify_matches on public.products;
create trigger products_notify_matches
  after insert or update of is_active, review_status, tryon_supported, category_id, brand on public.products
  for each row execute function public.notify_matching_customers_on_product();

create or replace function public.notify_matching_customers_on_business_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from 'verified' and new.status = 'verified' then
    perform public.dispatch_stock_confirmed_notifications(p.id)
    from public.products p
    where p.business_id = new.id and p.is_active = true and p.review_status = 'approved';
  end if;
  return new;
end $$;

drop trigger if exists businesses_verified_notify_matches on public.businesses;
create trigger businesses_verified_notify_matches
  after update of status on public.businesses
  for each row execute function public.notify_matching_customers_on_business_verified();

-- Duplicate listing / category outlier / image hash check RPC (no cross-tenant PII leak)
create or replace function public.check_product_duplicates_and_stats(
  p_business_id uuid,
  p_product_id uuid default null,
  p_name text default '',
  p_brand text default '',
  p_category_id int default null,
  p_image_hashes text[] default '{}'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_norm_name text;
  v_norm_brand text;
  v_median numeric := null;
  v_cat_count int := 0;
  v_own_dup_id uuid;
  v_own_dup_name text;
  v_other_dup_count int := 0;
  v_own_hashes jsonb := '[]'::jsonb;
  v_other_hashes jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not (public.is_business_member(p_business_id) or public.is_admin()) then
    raise exception 'forbidden';
  end if;

  v_norm_name := lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
  v_norm_brand := lower(regexp_replace(trim(coalesce(p_brand, '')), '\s+', ' ', 'g'));

  if p_category_id is not null then
    v_cat_count := (
      select count(*)
      from public.products p
      where p.category_id = p_category_id
        and p.review_status <> 'archived'
        and p.price > 0
        and (p_product_id is null or p.id <> p_product_id)
    );
    if v_cat_count >= 2 then
      v_median := (
        select round(percentile_cont(0.5) within group (order by p.price)::numeric, 2)
        from public.products p
        where p.category_id = p_category_id
          and p.review_status <> 'archived'
          and p.price > 0
          and (p_product_id is null or p.id <> p_product_id)
      );
    end if;

    if v_norm_name <> '' then
      v_own_dup_id := (
        select p.id
        from public.products p
        where p.business_id = p_business_id
          and p.category_id = p_category_id
          and p.review_status <> 'archived'
          and (p_product_id is null or p.id <> p_product_id)
          and lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = v_norm_name
          and lower(regexp_replace(trim(coalesce(p.brand, '')), '\s+', ' ', 'g')) = v_norm_brand
        limit 1
      );
      if v_own_dup_id is not null then
        v_own_dup_name := (select p.name from public.products p where p.id = v_own_dup_id);
      end if;

      v_other_dup_count := (
        select count(*)
        from public.products p
        where p.business_id <> p_business_id
          and p.category_id = p_category_id
          and p.review_status <> 'archived'
          and lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = v_norm_name
          and (v_norm_brand = '' or lower(regexp_replace(trim(coalesce(p.brand, '')), '\s+', ' ', 'g')) = v_norm_brand)
      );
    end if;
  end if;

  if coalesce(array_length(p_image_hashes, 1), 0) > 0 then
    v_own_hashes := (
      select coalesce(jsonb_agg(distinct pi.sha256), '[]'::jsonb)
      from public.product_images pi
      join public.products p on p.id = pi.product_id
      where p.business_id = p_business_id
        and p.review_status <> 'archived'
        and (p_product_id is null or p.id <> p_product_id)
        and pi.sha256 = any(p_image_hashes)
    );
    v_other_hashes := (
      select coalesce(jsonb_agg(distinct pi.sha256), '[]'::jsonb)
      from public.product_images pi
      join public.products p on p.id = pi.product_id
      where p.business_id <> p_business_id
        and p.review_status <> 'archived'
        and pi.sha256 = any(p_image_hashes)
    );
  end if;

  return jsonb_build_object(
    'category_median_price', v_median,
    'category_sample_count', v_cat_count,
    'own_duplicate_id', v_own_dup_id,
    'own_duplicate_name', v_own_dup_name,
    'other_business_similar_count', v_other_dup_count,
    'own_duplicate_image_hashes', v_own_hashes,
    'other_duplicate_image_hashes', v_other_hashes
  );
end $$;

create or replace function public.submit_product_for_review(
  p_product_id uuid,
  p_declarations jsonb,
  p_check_summary jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
  v_biz_status business_status;
  v_biz_name text;
  v_ind industry;
  v_kind product_kind;
  v_name text;
  v_desc text;
  v_price numeric;
  v_old_status text;
  v_img_count int;
  v_min_imgs int;
  v_attrs jsonb;
  v_svc jsonb;
  v_ev_type text;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;

  v_biz_id := (select p.business_id from public.products p where p.id = p_product_id);
  if v_biz_id is null then raise exception 'not_found'; end if;
  if not public.can_manage_catalogue(v_biz_id) then raise exception 'forbidden'; end if;

  v_biz_status := (select b.status from public.businesses b where b.id = v_biz_id);
  if v_biz_status is distinct from 'verified' then raise exception 'business_not_verified'; end if;
  v_biz_name := (select b.name from public.businesses b where b.id = v_biz_id);

  if not (
    coalesce((p_declarations ->> 'genuine_item')::boolean, false)
    and coalesce((p_declarations ->> 'right_to_sell')::boolean, false)
    and coalesce((p_declarations ->> 'accurate_details')::boolean, false)
  ) then
    raise exception 'declarations_required';
  end if;

  v_ind := (select p.industry from public.products p where p.id = p_product_id);
  v_kind := (select p.kind from public.products p where p.id = p_product_id);
  v_name := (select p.name from public.products p where p.id = p_product_id);
  v_desc := (select p.description from public.products p where p.id = p_product_id);
  v_price := (select p.price from public.products p where p.id = p_product_id);
  v_old_status := (select p.review_status from public.products p where p.id = p_product_id);
  v_attrs := (select p.attributes from public.products p where p.id = p_product_id);
  v_svc := (select p.service_details from public.products p where p.id = p_product_id);

  if v_old_status = 'archived' then raise exception 'invalid_request'; end if;
  if coalesce(v_price, 0) <= 0 then raise exception 'checks_failed'; end if;
  if char_length(trim(coalesce(v_name, ''))) < 5 or char_length(trim(coalesce(v_name, ''))) > 100 then
    raise exception 'checks_failed';
  end if;
  if char_length(trim(coalesce(v_desc, ''))) < 40 then raise exception 'checks_failed'; end if;

  v_img_count := (select count(*) from public.product_images where product_id = p_product_id);
  v_min_imgs := case when v_ind in ('beauty', 'fashion', 'jewellery') and v_kind = 'product' then 2 else 1 end;
  if v_img_count < v_min_imgs then raise exception 'checks_failed'; end if;

  if exists (
    select 1 from public.banned_words bw
    where bw.severity = 'error'
      and trim(regexp_replace(lower(bw.word), '[^a-z0-9]+', ' ', 'g')) <> ''
      and (
        (' ' || regexp_replace(lower(v_name), '[^a-z0-9]+', ' ', 'g') || ' ')
          like ('% ' || trim(regexp_replace(lower(bw.word), '[^a-z0-9]+', ' ', 'g')) || ' %')
        or (' ' || regexp_replace(lower(v_desc), '[^a-z0-9]+', ' ', 'g') || ' ')
          like ('% ' || trim(regexp_replace(lower(bw.word), '[^a-z0-9]+', ' ', 'g')) || ' %')
      )
  ) then
    raise exception 'banned_word_detected';
  end if;

  if v_ind in ('salon', 'fitness') and v_kind = 'service' then
    if coalesce(nullif(v_attrs ->> 'duration_minutes', ''), nullif(v_attrs ->> 'duration_weeks', ''), nullif(v_svc ->> 'duration_minutes', ''), '') = '' then
      raise exception 'checks_failed';
    end if;
  end if;

  perform public._bypass();
  update public.products
     set review_status = 'pending_review',
         submitted_at = now(),
         submitted_by = auth.uid(),
         declarations = p_declarations,
         declaration_accepted_by = auth.uid(),
         declaration_accepted_at = now(),
         last_check_summary = coalesce(p_check_summary, '{}'::jsonb)
   where id = p_product_id;
  perform set_config('klozeva.bypass', '0', true);

  v_ev_type := case when v_old_status in ('rejected', 'changes_requested', 'pending_review') then 'resubmitted' else 'submitted' end;
  insert into public.product_reviews (product_id, actor_id, actor_role, event_type, reason, check_snapshot)
  values (p_product_id, auth.uid(), coalesce(public.business_member_role(v_biz_id), 'retailer'), v_ev_type, null, coalesce(p_check_summary, '{}'::jsonb));

  perform public._retailer_audit(v_biz_id, 'product_submitted_for_review', 'product', p_product_id, jsonb_build_object('event_type', v_ev_type));
  perform public._notify_admins('Product awaiting review', v_name || ' from ' || coalesce(v_biz_name, 'retailer'), '/admin/products');
end $$;

create or replace function public.admin_review_product(
  p_product_id uuid,
  p_decision text,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
  v_prod_name text;
  v_clean_reason text;
begin
  perform public._require_admin();
  if p_decision not in ('approved', 'rejected', 'changes_requested') then raise exception 'invalid_request'; end if;

  v_clean_reason := nullif(trim(coalesce(p_reason, '')), '');
  if p_decision in ('rejected', 'changes_requested') and v_clean_reason is null then
    raise exception 'reason_required';
  end if;

  v_biz_id := (select p.business_id from public.products p where p.id = p_product_id);
  if v_biz_id is null then raise exception 'not_found'; end if;
  v_prod_name := (select p.name from public.products p where p.id = p_product_id);

  perform public._bypass();
  update public.products
     set review_status = p_decision,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         approved_at = case when p_decision = 'approved' then now() else approved_at end,
         review_note = v_clean_reason,
         is_active = case when p_decision = 'approved' then true else is_active end
   where id = p_product_id;
  perform set_config('klozeva.bypass', '0', true);

  insert into public.product_reviews (product_id, actor_id, actor_role, event_type, reason)
  values (p_product_id, auth.uid(), 'admin', p_decision, v_clean_reason);

  perform public._audit('product_' || p_decision, 'product', p_product_id, jsonb_build_object('business_id', v_biz_id, 'reason', v_clean_reason));

  insert into public.notifications (user_id, category, title, body, product_id, link)
  select
    bm.user_id,
    'system',
    case
      when p_decision = 'approved' then 'Product approved: ' || v_prod_name
      when p_decision = 'changes_requested' then 'Changes requested: ' || v_prod_name
      else 'Product rejected: ' || v_prod_name
    end,
    coalesce(v_clean_reason, case when p_decision = 'approved' then 'Your listing is now live for customers.' else '' end),
    p_product_id,
    '/retailer/products/' || p_product_id::text
  from public.business_members bm
  where bm.business_id = v_biz_id
    and coalesce((
      select bnp.review_decisions
      from public.business_notification_preferences bnp
      where bnp.business_id = v_biz_id and bnp.user_id = bm.user_id
    ), true) = true;

  if p_decision = 'approved' then
    perform public.dispatch_stock_confirmed_notifications(p_product_id);
  end if;
end $$;

create or replace function public.admin_bulk_approve_products(p_product_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_pid uuid;
  v_count int := 0;
  v_status text;
  v_errs int;
  v_price numeric;
  v_name text;
  v_desc text;
  v_ind industry;
  v_kind product_kind;
  v_img_count int;
  v_min_imgs int;
  v_decl jsonb;
  v_biz_status business_status;
begin
  perform public._require_admin();
  foreach v_pid in array coalesce(p_product_ids, '{}'::uuid[]) loop
    v_status := (select p.review_status from public.products p where p.id = v_pid);
    v_errs := coalesce((select (p.last_check_summary ->> 'errorCount')::int from public.products p where p.id = v_pid), 1);
    v_price := (select p.price from public.products p where p.id = v_pid);
    v_name := (select p.name from public.products p where p.id = v_pid);
    v_desc := (select p.description from public.products p where p.id = v_pid);
    v_ind := (select p.industry from public.products p where p.id = v_pid);
    v_kind := (select p.kind from public.products p where p.id = v_pid);
    v_decl := (select p.declarations from public.products p where p.id = v_pid);
    v_biz_status := (select b.status from public.products p join public.businesses b on b.id = p.business_id where p.id = v_pid);
    v_img_count := (select count(*) from public.product_images pi where pi.product_id = v_pid);
    v_min_imgs := case when v_ind in ('beauty', 'fashion', 'jewellery') and v_kind = 'product' then 2 else 1 end;

    if v_status = 'pending_review'
       and v_errs = 0
       and v_biz_status = 'verified'
       and coalesce(v_price, 0) > 0
       and char_length(trim(coalesce(v_name, ''))) between 5 and 100
       and char_length(trim(coalesce(v_desc, ''))) >= 40
       and v_img_count >= v_min_imgs
       and coalesce((v_decl ->> 'genuine_item')::boolean, false)
       and coalesce((v_decl ->> 'right_to_sell')::boolean, false)
       and coalesce((v_decl ->> 'accurate_details')::boolean, false) then
      perform public.admin_review_product(v_pid, 'approved', 'Bulk approved by administrator (0 check errors)');
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

create or replace function public.admin_product_review_queue(
  p_status text default 'pending_review',
  p_industry text default null,
  p_business_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  return (
    select coalesce(jsonb_agg(row_to_json(q) order by q.sort_ts asc), '[]'::jsonb)
    from (
      select
        p.id,
        p.business_id,
        b.name as business_name,
        b.status as business_status,
        b.city as business_city,
        p.industry,
        p.category_id,
        pc.name as category_name,
        p.name,
        p.brand,
        p.sku,
        p.description,
        p.highlights,
        p.price,
        p.mrp_price,
        p.tax_rate,
        p.kind,
        p.attributes,
        p.service_details,
        p.tryon_supported,
        p.is_active,
        p.review_status,
        p.review_note,
        p.submitted_at,
        p.reviewed_at,
        p.created_at,
        p.declarations,
        p.declaration_accepted_at,
        p.last_check_summary,
        coalesce((p.last_check_summary ->> 'errorCount')::int, 0) as check_error_count,
        coalesce((p.last_check_summary ->> 'warningCount')::int, 0) as check_warning_count,
        coalesce((p.last_check_summary ->> 'score')::int, 0) as completeness_score,
        (select count(*) from public.product_images pi where pi.product_id = p.id) as image_count,
        (select coalesce(jsonb_agg(jsonb_build_object('id', pi.id, 'storage_path', pi.storage_path, 'sort_order', pi.sort_order, 'width_px', pi.width_px, 'height_px', pi.height_px) order by pi.sort_order asc), '[]'::jsonb) from public.product_images pi where pi.product_id = p.id) as images,
        (select coalesce(jsonb_agg(jsonb_build_object('id', pv.id, 'label', pv.label, 'sku', pv.sku, 'color_hex', pv.color_hex, 'size', pv.size, 'stock', pv.stock, 'price_override', pv.price_override) order by pv.created_at asc), '[]'::jsonb) from public.product_variants pv where pv.product_id = p.id) as variants,
        coalesce(p.submitted_at, p.created_at) as sort_ts
      from public.products p
      join public.businesses b on b.id = p.business_id
      join public.product_categories pc on pc.id = p.category_id
      where (p_status is null or p_status = 'all' or p.review_status = p_status)
        and (p_industry is null or p_industry = '' or p.industry::text = p_industry)
        and (p_business_id is null or p.business_id = p_business_id)
    ) q
  );
end $$;

create or replace function public.duplicate_product_as_draft(p_product_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
  v_new_id uuid := gen_random_uuid();
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  v_biz_id := (select p.business_id from public.products p where p.id = p_product_id);
  if v_biz_id is null then raise exception 'not_found'; end if;
  if not public.can_manage_catalogue(v_biz_id) then raise exception 'forbidden'; end if;

  insert into public.products (
    id, business_id, industry, category_id, name, brand, description, price, mrp_price, tax_rate,
    kind, attributes, highlights, tags, video_url, service_details, tryon_supported, is_active, review_status, subcategory
  )
  select
    v_new_id, p.business_id, p.industry, p.category_id, left(p.name || ' (Copy)', 100), p.brand, p.description,
    p.price, p.mrp_price, p.tax_rate, p.kind, p.attributes, p.highlights, p.tags, p.video_url,
    p.service_details, p.tryon_supported, false, 'draft', p.subcategory
  from public.products p
  where p.id = p_product_id;

  insert into public.product_variants (product_id, label, sku, color_hex, size, stock, price_override, low_stock_threshold, is_active)
  select v_new_id, pv.label, null, pv.color_hex, pv.size, 0, pv.price_override, pv.low_stock_threshold, pv.is_active
  from public.product_variants pv
  where pv.product_id = p_product_id;

  insert into public.product_images (product_id, storage_path, sort_order, width_px, height_px, sha256)
  select v_new_id, pi.storage_path, pi.sort_order, pi.width_px, pi.height_px, pi.sha256
  from public.product_images pi
  where pi.product_id = p_product_id;

  perform public._retailer_audit(v_biz_id, 'product_duplicated', 'product', v_new_id, jsonb_build_object('source_product_id', p_product_id));
  return v_new_id;
end $$;

create or replace function public.bulk_update_products(
  p_business_id uuid,
  p_product_ids uuid[],
  p_action text,
  p_category_id int default null,
  p_percent numeric default null
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_cnt int := 0;
  v_pid uuid;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  if not public.can_manage_catalogue(p_business_id) then raise exception 'forbidden'; end if;
  if p_action not in ('activate', 'deactivate', 'archive', 'change_category', 'adjust_price_percent') then
    raise exception 'invalid_request';
  end if;

  if p_action = 'activate' then
    update public.products
       set is_active = true
     where business_id = p_business_id and id = any(p_product_ids) and review_status <> 'archived';
    get diagnostics v_cnt = row_count;
  elsif p_action = 'deactivate' then
    update public.products
       set is_active = false
     where business_id = p_business_id and id = any(p_product_ids);
    get diagnostics v_cnt = row_count;
  elsif p_action = 'archive' then
    for v_pid in select id from public.products where business_id = p_business_id and id = any(p_product_ids) loop
      perform public._bypass();
      update public.products
         set review_status = 'archived', is_active = false, archived_at = now()
       where id = v_pid;
      perform set_config('klozeva.bypass', '0', true);
      insert into public.product_reviews (product_id, actor_id, actor_role, event_type, reason)
      values (v_pid, auth.uid(), 'retailer', 'archived', 'Bulk archived by retailer');
      v_cnt := v_cnt + 1;
    end loop;
  elsif p_action = 'change_category' then
    if p_category_id is null then raise exception 'invalid_request'; end if;
    update public.products
       set category_id = p_category_id
     where business_id = p_business_id and id = any(p_product_ids) and review_status <> 'archived';
    get diagnostics v_cnt = row_count;
  elsif p_action = 'adjust_price_percent' then
    if p_percent is null or p_percent <= -95 or p_percent > 500 then raise exception 'invalid_request'; end if;
    update public.products
       set price = greatest(1, round(price * (1 + (p_percent / 100.0)), 2))
     where business_id = p_business_id and id = any(p_product_ids) and review_status <> 'archived';
    get diagnostics v_cnt = row_count;
  end if;

  perform public._retailer_audit(p_business_id, 'bulk_' || p_action, 'product', null, jsonb_build_object('count', v_cnt, 'category_id', p_category_id, 'percent', p_percent));
  return v_cnt;
end $$;

-- ============================================================================
-- 5. INVENTORY THRESHOLDS, CROSSING ALERTS & BULK CSV STOCK (SECTION 6)
-- ============================================================================

alter table public.product_variants add column if not exists price_override numeric(10, 2)
  check (price_override is null or (price_override >= 0 and price_override <= 10000000));
alter table public.product_variants add column if not exists low_stock_threshold int not null default 5 check (low_stock_threshold >= 0);
alter table public.product_variants add column if not exists low_stock_alert_active boolean not null default false;
alter table public.product_variants add column if not exists updated_at timestamptz not null default now();

drop trigger if exists variants_touch on public.product_variants;
create trigger variants_touch before update on public.product_variants
  for each row execute function public.touch_updated_at();

create unique index if not exists variants_product_sku_uniq_idx
  on public.product_variants (product_id, lower(btrim(sku)))
  where sku is not null and btrim(sku) <> '';

revoke update on public.product_variants from authenticated;
grant update (label, sku, color_hex, size, is_active, price_override, low_stock_threshold) on public.product_variants to authenticated;

create or replace function public.adjust_stock(p_variant uuid, p_delta int, p_reason text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_biz uuid;
  v_prod_id uuid;
  v_prod_name text;
  v_var_label text;
  v_new int;
  v_thresh int;
  v_alert_active boolean;
begin
  v_biz := (select p.business_id from public.product_variants v join public.products p on p.id = v.product_id where v.id = p_variant);
  if v_biz is null or not public.can_manage_catalogue(v_biz) or not public.is_active() then
    raise exception 'not_found';
  end if;
  if p_delta = 0 or coalesce(trim(p_reason), '') = '' then
    raise exception 'invalid_request';
  end if;

  update public.product_variants set stock = stock + p_delta where id = p_variant;

  v_new := (select stock from public.product_variants where id = p_variant);
  v_thresh := (select low_stock_threshold from public.product_variants where id = p_variant);
  v_alert_active := (select low_stock_alert_active from public.product_variants where id = p_variant);
  v_prod_id := (select product_id from public.product_variants where id = p_variant);
  v_var_label := (select label from public.product_variants where id = p_variant);
  v_prod_name := (select name from public.products where id = v_prod_id);

  insert into public.inventory_movements (variant_id, delta, reason, stock_after, actor_id)
  values (p_variant, p_delta, left(trim(p_reason), 120), v_new, auth.uid());

  if v_new <= v_thresh and not v_alert_active then
    update public.product_variants set low_stock_alert_active = true where id = p_variant;
    insert into public.notifications (user_id, category, title, body, product_id, link)
    select
      bm.user_id,
      'system',
      case when v_new = 0 then 'Out of stock: ' || coalesce(v_prod_name, 'Item') else 'Low stock alert: ' || coalesce(v_prod_name, 'Item') end,
      coalesce(v_var_label, 'Variant') || ' reached ' || v_new || ' units (threshold: ' || v_thresh || ').',
      v_prod_id,
      '/retailer/inventory'
    from public.business_members bm
    where bm.business_id = v_biz
      and bm.member_role in ('owner', 'manager', 'catalogue_editor')
      and coalesce((
        select bnp.low_stock
        from public.business_notification_preferences bnp
        where bnp.business_id = v_biz and bnp.user_id = bm.user_id
      ), true) = true;
  elsif v_new > v_thresh and v_alert_active then
    update public.product_variants set low_stock_alert_active = false where id = p_variant;
  end if;

  return v_new;
end $$;

create or replace function public.bulk_adjust_stock(
  p_business_id uuid,
  p_items jsonb,
  p_reason text default 'Bulk CSV stock update'
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_vid uuid;
  v_cur int;
  v_target int;
  v_thresh int;
  v_cnt int := 0;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  if not public.can_manage_catalogue(p_business_id) then raise exception 'forbidden'; end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_vid := (v_item ->> 'variant_id')::uuid;
    v_cur := (
      select pv.stock
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = v_vid and p.business_id = p_business_id
    );
    if v_cur is null then raise exception 'not_found'; end if;

    v_target := (v_item ->> 'stock')::int;
    if v_target is not null and v_target <> v_cur then
      perform public.adjust_stock(v_vid, v_target - v_cur, coalesce(nullif(trim(p_reason), ''), 'Bulk stock update'));
      v_cnt := v_cnt + 1;
    end if;

    if (v_item ? 'low_stock_threshold') and nullif(v_item ->> 'low_stock_threshold', '') is not null then
      v_thresh := (v_item ->> 'low_stock_threshold')::int;
      if v_thresh >= 0 then
        update public.product_variants set low_stock_threshold = v_thresh where id = v_vid;
      end if;
    end if;
  end loop;

  perform public._retailer_audit(p_business_id, 'bulk_stock_updated', 'product_variant', null, jsonb_build_object('updated_variants', v_cnt));
  return v_cnt;
end $$;

-- ============================================================================
-- 6. PLATFORM SETTINGS, NON-OVERLAPPING OFFERS & EFFECTIVE PRICING (SECTION 7)
-- ============================================================================

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values
  ('offer_auto_approve_limits', '{"max_percent": 30, "max_fixed": 500}'::jsonb)
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;
drop policy if exists platform_settings_select on public.platform_settings;
create policy platform_settings_select on public.platform_settings for select to authenticated using (true);
drop policy if exists platform_settings_write on public.platform_settings;
create policy platform_settings_write on public.platform_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.platform_settings from anon;
grant select, insert, update on public.platform_settings to authenticated;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 100),
  badge_label text check (badge_label is null or char_length(badge_label) <= 30),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'pending_review' check (status in ('draft', 'pending_review', 'approved', 'rejected', 'paused', 'expired')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percent' or (discount_value > 0 and discount_value <= 90))
);
create index if not exists offers_business_idx on public.offers (business_id, starts_at desc);

drop trigger if exists offers_touch on public.offers;
create trigger offers_touch before update on public.offers
  for each row execute function public.touch_updated_at();

create table if not exists public.offer_products (
  offer_id uuid not null references public.offers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (offer_id, product_id)
);
create index if not exists offer_products_prod_idx on public.offer_products (product_id);

alter table public.offers enable row level security;
alter table public.offer_products enable row level security;

drop policy if exists offers_select on public.offers;
create policy offers_select on public.offers for select to authenticated
  using (
    (status = 'approved' and starts_at <= now() and ends_at >= now()
     and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'verified'))
    or public.is_business_member(business_id)
    or public.is_admin()
  );

drop policy if exists offer_products_select on public.offer_products;
create policy offer_products_select on public.offer_products for select to authenticated
  using (exists (select 1 from public.offers o where o.id = offer_id));

revoke all on public.offers, public.offer_products from anon;
revoke insert, update, delete on public.offers, public.offer_products from authenticated;
grant select on public.offers, public.offer_products to authenticated;

create or replace function public.save_offer(
  p_business_id uuid,
  p_offer_id uuid,
  p_title text,
  p_badge_label text,
  p_discount_type text,
  p_discount_value numeric,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_product_ids uuid[]
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := coalesce(p_offer_id, gen_random_uuid());
  v_limits jsonb;
  v_max_pct numeric;
  v_max_fix numeric;
  v_status text;
  v_biz_name text;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  if not public.can_manage_catalogue(p_business_id) then raise exception 'forbidden'; end if;
  if coalesce(array_length(p_product_ids, 1), 0) = 0 then raise exception 'invalid_request'; end if;
  if p_ends_at <= p_starts_at then raise exception 'invalid_request'; end if;
  if p_discount_type not in ('percent', 'fixed') or coalesce(p_discount_value, 0) <= 0 then
    raise exception 'invalid_request';
  end if;
  if p_discount_type = 'percent' and p_discount_value > 90 then raise exception 'invalid_request'; end if;

  -- Every targeted product must belong to p_business_id
  if exists (
    select 1 from unnest(p_product_ids) pid
    where not exists (select 1 from public.products p where p.id = pid and p.business_id = p_business_id)
  ) then
    raise exception 'forbidden';
  end if;

  -- Reject overlapping active/approved/pending offers for any selected product
  if exists (
    select 1
    from public.offer_products op
    join public.offers o on o.id = op.offer_id
    where op.product_id = any(p_product_ids)
      and o.id <> v_id
      and o.status in ('approved', 'pending_review')
      and o.starts_at < p_ends_at
      and o.ends_at > p_starts_at
  ) then
    raise exception 'overlapping_offer';
  end if;

  v_limits := (select ps.value from public.platform_settings ps where ps.key = 'offer_auto_approve_limits');
  v_max_pct := coalesce((v_limits ->> 'max_percent')::numeric, 30);
  v_max_fix := coalesce((v_limits ->> 'max_fixed')::numeric, 500);

  if (p_discount_type = 'percent' and p_discount_value <= v_max_pct)
     or (p_discount_type = 'fixed' and p_discount_value <= v_max_fix) then
    v_status := 'approved';
  else
    v_status := 'pending_review';
  end if;

  if p_offer_id is not null then
    if not exists (select 1 from public.offers where id = p_offer_id and business_id = p_business_id) then
      raise exception 'offer_not_found';
    end if;
    update public.offers
       set title = trim(p_title),
           badge_label = nullif(trim(coalesce(p_badge_label, '')), ''),
           discount_type = p_discount_type,
           discount_value = p_discount_value,
           starts_at = p_starts_at,
           ends_at = p_ends_at,
           status = v_status,
           review_note = case when v_status = 'pending_review' then 'Above auto-approval limit — awaiting admin review' else null end
     where id = v_id;
    delete from public.offer_products where offer_id = v_id;
  else
    insert into public.offers (
      id, business_id, title, badge_label, discount_type, discount_value, starts_at, ends_at, status, review_note, created_by
    ) values (
      v_id, p_business_id, trim(p_title), nullif(trim(coalesce(p_badge_label, '')), ''),
      p_discount_type, p_discount_value, p_starts_at, p_ends_at, v_status,
      case when v_status = 'pending_review' then 'Above auto-approval limit — awaiting admin review' else null end,
      auth.uid()
    );
  end if;

  insert into public.offer_products (offer_id, product_id)
  select v_id, pid from unnest(p_product_ids) pid
  on conflict do nothing;

  v_biz_name := (select b.name from public.businesses b where b.id = p_business_id);
  perform public._retailer_audit(p_business_id, 'offer_saved', 'offer', v_id, jsonb_build_object('status', v_status, 'discount_type', p_discount_type, 'discount_value', p_discount_value));

  if v_status = 'pending_review' then
    perform public._notify_admins('Offer awaiting approval', trim(p_title) || ' by ' || coalesce(v_biz_name, 'retailer'), '/admin/moderation');
  end if;

  return jsonb_build_object('id', v_id, 'status', v_status);
end $$;

create or replace function public.pause_resume_offer(p_offer_id uuid, p_pause boolean) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
  v_cur text;
  v_next text;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  v_biz_id := (select o.business_id from public.offers o where o.id = p_offer_id);
  if v_biz_id is null then raise exception 'offer_not_found'; end if;
  if not public.can_manage_catalogue(v_biz_id) then raise exception 'forbidden'; end if;

  v_cur := (select o.status from public.offers o where o.id = p_offer_id);
  if p_pause then
    if v_cur not in ('approved', 'pending_review') then raise exception 'invalid_request'; end if;
    v_next := 'paused';
  else
    if v_cur <> 'paused' then raise exception 'invalid_request'; end if;
    if exists (
      select 1
      from public.offer_products op1
      join public.offer_products op2 on op2.product_id = op1.product_id
      join public.offers o1 on o1.id = op1.offer_id
      join public.offers o2 on o2.id = op2.offer_id
      where o1.id = p_offer_id and o2.id <> p_offer_id
        and o2.status in ('approved', 'pending_review')
        and o2.starts_at < o1.ends_at and o2.ends_at > o1.starts_at
    ) then
      raise exception 'overlapping_offer';
    end if;
    v_next := 'approved';
  end if;

  update public.offers set status = v_next where id = p_offer_id;
  perform public._retailer_audit(v_biz_id, 'offer_' || v_next, 'offer', p_offer_id, '{}'::jsonb);
  return v_next;
end $$;

create or replace function public.delete_offer(p_offer_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
begin
  if auth.uid() is null or not public.is_active() then raise exception 'unauthorized'; end if;
  v_biz_id := (select o.business_id from public.offers o where o.id = p_offer_id);
  if v_biz_id is null then raise exception 'offer_not_found'; end if;
  if not public.can_manage_catalogue(v_biz_id) then raise exception 'forbidden'; end if;

  perform public._retailer_audit(v_biz_id, 'offer_deleted', 'offer', p_offer_id, '{}'::jsonb);
  delete from public.offers where id = p_offer_id;
end $$;

create or replace function public.admin_review_offer(
  p_offer_id uuid,
  p_decision text,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_biz_id uuid;
  v_title text;
  v_clean_reason text;
begin
  perform public._require_admin();
  if p_decision not in ('approved', 'rejected') then raise exception 'invalid_request'; end if;
  v_clean_reason := nullif(trim(coalesce(p_reason, '')), '');
  if p_decision = 'rejected' and v_clean_reason is null then raise exception 'reason_required'; end if;

  v_biz_id := (select o.business_id from public.offers o where o.id = p_offer_id);
  if v_biz_id is null then raise exception 'offer_not_found'; end if;
  v_title := (select o.title from public.offers o where o.id = p_offer_id);

  update public.offers
     set status = p_decision,
         review_note = v_clean_reason,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_offer_id;

  perform public._audit('offer_' || p_decision, 'offer', p_offer_id, jsonb_build_object('reason', v_clean_reason));
  insert into public.notifications (user_id, category, title, body, link)
  select
    bm.user_id,
    'system',
    'Offer ' || p_decision || ': ' || v_title,
    coalesce(v_clean_reason, 'Your promotional offer was ' || p_decision || '.'),
    '/retailer/offers'
  from public.business_members bm
  where bm.business_id = v_biz_id
    and coalesce((
      select bnp.offer_updates
      from public.business_notification_preferences bnp
      where bnp.business_id = v_biz_id and bnp.user_id = bm.user_id
    ), true) = true;
end $$;

create or replace function public.get_effective_product_prices(p_product_ids uuid[] default null)
returns table (
  product_id uuid,
  base_price numeric,
  effective_price numeric,
  discount_amount numeric,
  discount_percent numeric,
  offer_id uuid,
  offer_title text,
  badge_label text,
  ends_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select
      p.id as product_id,
      p.price as base_price,
      case
        when o.discount_type = 'percent' then greatest(0::numeric, round(p.price * (1 - o.discount_value / 100.0), 2))
        else greatest(0::numeric, round(p.price - o.discount_value, 2))
      end as effective_price,
      o.id as offer_id,
      o.title as offer_title,
      coalesce(
        nullif(o.badge_label, ''),
        case when o.discount_type = 'percent' then round(o.discount_value)::text || '% OFF'
             else 'SAVE INR ' || round(o.discount_value)::text end
      ) as badge_label,
      o.ends_at,
      o.starts_at
    from public.products p
    join public.businesses b on b.id = p.business_id
    join public.offer_products op on op.product_id = p.id
    join public.offers o on o.id = op.offer_id
    where (p_product_ids is null or p.id = any(p_product_ids))
      and o.status = 'approved'
      and o.starts_at <= now()
      and o.ends_at >= now()
      and (
        (p.review_status = 'approved' and p.is_active = true and b.status = 'verified')
        or public.is_business_member(b.id)
        or public.is_admin()
      )
  )
  select distinct on (r.product_id)
    r.product_id,
    r.base_price,
    r.effective_price,
    greatest(0::numeric, round(r.base_price - r.effective_price, 2)) as discount_amount,
    case when r.base_price > 0 then round(((r.base_price - r.effective_price) / r.base_price) * 100.0, 1) else 0 end as discount_percent,
    r.offer_id,
    r.offer_title,
    r.badge_label,
    r.ends_at
  from ranked r
  order by r.product_id, r.effective_price asc, r.starts_at desc
$$;

-- ============================================================================
-- 7. ANONYMIZED RETAILER ANALYTICS WITH K=5 SUPPRESSION (SECTION 8)
-- ============================================================================

alter table public.analytics_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.analytics_events add column if not exists surfaced_product_ids uuid[] not null default '{}'::uuid[];

alter table public.analytics_events drop constraint if exists analytics_events_event_check;
alter table public.analytics_events add constraint analytics_events_event_check
  check (event in ('view_industry', 'view_product', 'search', 'save_item', 'run_analysis', 'view_recommendation', 'start_tryon', 'save_tryon'));

create index if not exists analytics_surfaced_gin_idx
  on public.analytics_events using gin (surfaced_product_ids);

create or replace function public.retailer_analytics(
  p_business_id uuid,
  p_days int default 30
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_days int;
  v_since timestamptz;
  v_views_total int;
  v_views_users int;
  v_saves_total int;
  v_saves_users int;
  v_search_total int;
  v_search_users int;
  v_rec_total int;
  v_rec_users int;
  v_daily jsonb;
  v_products jsonb;
  v_categories jsonb;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not (public.is_business_member(p_business_id) or public.is_admin()) then
    raise exception 'forbidden';
  end if;

  v_days := least(greatest(coalesce(p_days, 30), 7), 90);
  v_since := date_trunc('day', now() - make_interval(days => v_days - 1));

  v_views_total := (
    select count(*) from public.analytics_events ae
    join public.products p on p.id = ae.product_id
    where p.business_id = p_business_id and ae.event = 'view_product' and ae.created_at >= v_since
  );
  v_views_users := (
    select count(distinct ae.user_id) from public.analytics_events ae
    join public.products p on p.id = ae.product_id
    where p.business_id = p_business_id and ae.event = 'view_product' and ae.created_at >= v_since
  );

  v_saves_total := (
    select count(*) from public.saved_items si
    join public.products p on p.id = si.product_id
    where p.business_id = p_business_id and si.created_at >= v_since and si.item_type <> 'tryon_result'
  );
  v_saves_users := (
    select count(distinct si.user_id) from public.saved_items si
    join public.products p on p.id = si.product_id
    where p.business_id = p_business_id and si.created_at >= v_since and si.item_type <> 'tryon_result'
  );

  v_search_total := (
    select count(*) from public.analytics_events ae
    where ae.event = 'search' and ae.created_at >= v_since
      and exists (select 1 from public.products p where p.business_id = p_business_id and p.id = any(ae.surfaced_product_ids))
  );
  v_search_users := (
    select count(distinct ae.user_id) from public.analytics_events ae
    where ae.event = 'search' and ae.created_at >= v_since
      and exists (select 1 from public.products p where p.business_id = p_business_id and p.id = any(ae.surfaced_product_ids))
  );

  v_rec_total := (
    select count(*) from public.analytics_events ae
    where ae.event = 'view_recommendation' and ae.created_at >= v_since
      and exists (select 1 from public.products p where p.business_id = p_business_id and p.id = any(ae.surfaced_product_ids))
  );
  v_rec_users := (
    select count(distinct ae.user_id) from public.analytics_events ae
    where ae.event = 'view_recommendation' and ae.created_at >= v_since
      and exists (select 1 from public.products p where p.business_id = p_business_id and p.id = any(ae.surfaced_product_ids))
  );

  v_daily := (
    with days as (
      select generate_series(v_since::date, now()::date, interval '1 day')::date as day
    ),
    day_views as (
      select ae.created_at::date as day, count(*) as cnt, count(distinct ae.user_id) as uids
      from public.analytics_events ae
      join public.products p on p.id = ae.product_id
      where p.business_id = p_business_id and ae.event = 'view_product' and ae.created_at >= v_since
      group by 1
    ),
    day_saves as (
      select si.created_at::date as day, count(*) as cnt, count(distinct si.user_id) as uids
      from public.saved_items si
      join public.products p on p.id = si.product_id
      where p.business_id = p_business_id and si.created_at >= v_since and si.item_type <> 'tryon_result'
      group by 1
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'day', to_char(d.day, 'YYYY-MM-DD'),
      'views', case when coalesce(dv.uids, 0) between 1 and 4 then null else coalesce(dv.cnt, 0) end,
      'views_suppressed', (coalesce(dv.uids, 0) between 1 and 4),
      'saves', case when coalesce(ds.uids, 0) between 1 and 4 then null else coalesce(ds.cnt, 0) end,
      'saves_suppressed', (coalesce(ds.uids, 0) between 1 and 4)
    ) order by d.day asc), '[]'::jsonb)
    from days d
    left join day_views dv on dv.day = d.day
    left join day_saves ds on ds.day = d.day
  );

  v_products := (
    select coalesce(jsonb_agg(row_to_json(t) order by coalesce(t.views, -1) desc, t.product_name asc), '[]'::jsonb)
    from (
      select
        p.id as product_id,
        p.name as product_name,
        pc.name as category_name,
        case when coalesce(ev.view_uids, 0) between 1 and 4 then null else coalesce(ev.raw_views, 0) end as views,
        (coalesce(ev.view_uids, 0) between 1 and 4) as views_suppressed,
        case when coalesce(sv.save_uids, 0) between 1 and 4 then null else coalesce(sv.raw_saves, 0) end as saves,
        (coalesce(sv.save_uids, 0) between 1 and 4) as saves_suppressed,
        case when coalesce(sr.search_uids, 0) between 1 and 4 then null else coalesce(sr.raw_searches, 0) end as search_appearances,
        (coalesce(sr.search_uids, 0) between 1 and 4) as search_suppressed,
        case when coalesce(rc.rec_uids, 0) between 1 and 4 then null else coalesce(rc.raw_recs, 0) end as recommendation_impressions,
        (coalesce(rc.rec_uids, 0) between 1 and 4) as rec_suppressed,
        case
          when coalesce(ev.view_uids, 0) between 1 and 4 or coalesce(sv.save_uids, 0) between 1 and 4 or coalesce(ev.raw_views, 0) = 0 then null
          else round((coalesce(sv.raw_saves, 0)::numeric / ev.raw_views::numeric) * 100.0, 1)
        end as saves_per_view_pct
      from public.products p
      join public.product_categories pc on pc.id = p.category_id
      left join (
        select ae.product_id, count(*) as raw_views, count(distinct ae.user_id) as view_uids
        from public.analytics_events ae
        where ae.event = 'view_product' and ae.created_at >= v_since and ae.product_id is not null
        group by ae.product_id
      ) ev on ev.product_id = p.id
      left join (
        select si.product_id, count(*) as raw_saves, count(distinct si.user_id) as save_uids
        from public.saved_items si
        where si.created_at >= v_since and si.product_id is not null and si.item_type <> 'tryon_result'
        group by si.product_id
      ) sv on sv.product_id = p.id
      left join (
        select spid as product_id, count(*) as raw_searches, count(distinct ae.user_id) as search_uids
        from public.analytics_events ae, unnest(ae.surfaced_product_ids) as spid
        where ae.event = 'search' and ae.created_at >= v_since
        group by spid
      ) sr on sr.product_id = p.id
      left join (
        select spid as product_id, count(*) as raw_recs, count(distinct ae.user_id) as rec_uids
        from public.analytics_events ae, unnest(ae.surfaced_product_ids) as spid
        where ae.event = 'view_recommendation' and ae.created_at >= v_since
        group by spid
      ) rc on rc.product_id = p.id
      where p.business_id = p_business_id and p.review_status <> 'archived'
    ) t
  );

  v_categories := (
    select coalesce(jsonb_agg(row_to_json(c) order by coalesce(c.views, -1) desc, c.category_name asc), '[]'::jsonb)
    from (
      select
        pc.id as category_id,
        pc.name as category_name,
        count(distinct p.id) as product_count,
        case when count(distinct case when ae.event = 'view_product' then ae.user_id end) between 1 and 4 then null
             else count(distinct case when ae.event = 'view_product' then ae.id end) end as views,
        (count(distinct case when ae.event = 'view_product' then ae.user_id end) between 1 and 4) as views_suppressed,
        case when count(distinct si.user_id) between 1 and 4 then null else count(distinct si.id) end as saves,
        (count(distinct si.user_id) between 1 and 4) as saves_suppressed
      from public.products p
      join public.product_categories pc on pc.id = p.category_id
      left join public.analytics_events ae on ae.product_id = p.id and ae.created_at >= v_since and ae.event = 'view_product'
      left join public.saved_items si on si.product_id = p.id and si.created_at >= v_since and si.item_type <> 'tryon_result'
      where p.business_id = p_business_id and p.review_status <> 'archived'
      group by pc.id, pc.name
    ) c
  );

  return jsonb_build_object(
    'business_id', p_business_id,
    'days', v_days,
    'min_distinct_users', 5,
    'summary', jsonb_build_object(
      'views', case when v_views_users between 1 and 4 then null else v_views_total end,
      'views_suppressed', (v_views_users between 1 and 4),
      'saves', case when v_saves_users between 1 and 4 then null else v_saves_total end,
      'saves_suppressed', (v_saves_users between 1 and 4),
      'search_appearances', case when v_search_users between 1 and 4 then null else v_search_total end,
      'search_suppressed', (v_search_users between 1 and 4),
      'recommendation_impressions', case when v_rec_users between 1 and 4 then null else v_rec_total end,
      'rec_suppressed', (v_rec_users between 1 and 4)
    ),
    'daily', v_daily,
    'products', v_products,
    'categories', v_categories
  );
end $$;

-- ============================================================================
-- 8. ADMIN STATS EXTENSION & FUNCTION GRANTS
-- ============================================================================

create or replace function public.admin_stats() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  return jsonb_build_object(
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'retailers', (select count(*) from public.businesses),
    'pending_retailers', (select count(*) from public.businesses where status = 'pending'),
    'verified_retailers', (select count(*) from public.businesses where status = 'verified'),
    'products', (select count(*) from public.products),
    'pending_products', (select count(*) from public.products where review_status = 'pending_review'),
    'pending_offers', (select count(*) from public.offers where status = 'pending_review'),
    'pending_docs', (select count(*) from public.businesses where doc_review_status in ('pending', 'more_info_requested')),
    'open_tickets', (select count(*) from public.support_tickets where status <> 'resolved')
  );
end $$;

grant execute on function
  public.business_member_role(uuid),
  public.has_business_role(uuid, text[]),
  public.can_manage_catalogue(uuid),
  public.can_manage_business_settings(uuid),
  public.is_business_owner(uuid),
  public.can_manage_catalogue_text(text),
  public.can_manage_business_settings_text(text),
  public.list_business_team(uuid),
  public.invite_business_member(uuid, text, text, int),
  public.list_my_pending_invitations(),
  public.accept_business_invitation(text),
  public.revoke_business_invitation(uuid),
  public.update_business_member_role(uuid, uuid, text),
  public.remove_business_member(uuid, uuid),
  public.submit_business_verification_doc(uuid, text, text, text, text, text, int),
  public.delete_business_verification_doc(uuid),
  public.admin_review_business_docs(uuid, text, text),
  public.check_product_duplicates_and_stats(uuid, uuid, text, text, int, text[]),
  public.submit_product_for_review(uuid, jsonb, jsonb),
  public.admin_review_product(uuid, text, text),
  public.admin_bulk_approve_products(uuid[]),
  public.admin_product_review_queue(text, text, uuid),
  public.archive_or_delete_product(uuid),
  public.duplicate_product_as_draft(uuid),
  public.bulk_update_products(uuid, uuid[], text, int, numeric),
  public.bulk_adjust_stock(uuid, jsonb, text),
  public.save_offer(uuid, uuid, text, text, text, numeric, timestamptz, timestamptz, uuid[]),
  public.pause_resume_offer(uuid, boolean),
  public.delete_offer(uuid),
  public.admin_review_offer(uuid, text, text),
  public.get_effective_product_prices(uuid[]),
  public.retailer_analytics(uuid, int)
to authenticated;
