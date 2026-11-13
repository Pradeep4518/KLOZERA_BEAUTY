alter table public.profiles enable row level security;
alter table public.customer_preferences enable row level security;
alter table public.product_categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.saved_items enable row level security;
alter table public.notifications enable row level security;
alter table public.appointments enable row level security;
alter table public.support_tickets enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy prefs_select on public.customer_preferences for select to authenticated using (user_id = auth.uid());
create policy prefs_update on public.customer_preferences for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy categories_select on public.product_categories for select to authenticated using (true);

create policy businesses_select on public.businesses for select to authenticated using (public.can_view_business(id));
create policy businesses_update on public.businesses for update to authenticated using (public.is_business_member(id)) with check (public.is_business_member(id));
create policy members_select on public.business_members for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy products_select on public.products for select to authenticated using ((is_active and public.can_view_business(business_id)) or public.is_business_member(business_id) or public.is_admin());
create policy products_insert on public.products for insert to authenticated with check (public.is_business_member(business_id) and public.is_active());
create policy products_update on public.products for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy products_delete on public.products for delete to authenticated using (public.is_business_member(business_id));

create policy variants_select on public.product_variants for select to authenticated using (exists (select 1 from public.products p where p.id = product_id));
create policy variants_insert on public.product_variants for insert to authenticated with check (stock = 0 and exists (select 1 from public.products p where p.id = product_id and public.is_business_member(p.business_id)));
create policy variants_update on public.product_variants for update to authenticated using (exists (select 1 from public.products p where p.id = product_id and public.is_business_member(p.business_id))) with check (exists (select 1 from public.products p where p.id = product_id and public.is_business_member(p.business_id)));
create policy variants_delete on public.product_variants for delete to authenticated using (exists (select 1 from public.products p where p.id = product_id and public.is_business_member(p.business_id)));

create policy images_select on public.product_images for select to authenticated using (exists (select 1 from public.products p where p.id = product_id));
create policy images_insert on public.product_images for insert to authenticated with check (exists (select 1 from public.products p where p.id = product_id and public.is_business_member(p.business_id)));
create policy images_delete on public.product_images for delete to authenticated using (exists (select 1 from public.products p where p.id = product_id and public.is_business_member(p.business_id)));

create policy movements_select on public.inventory_movements for select to authenticated using (exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and public.is_business_member(p.business_id)));

create policy saved_select on public.saved_items for select to authenticated using (user_id = auth.uid());
create policy saved_insert on public.saved_items for insert to authenticated with check (user_id = auth.uid() and public.is_active() and exists (select 1 from public.products p where p.id = product_id));
create policy saved_delete on public.saved_items for delete to authenticated using (user_id = auth.uid());

create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy appointments_select on public.appointments for select to authenticated using (user_id = auth.uid());
create policy tickets_select on public.support_tickets for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy tickets_insert on public.support_tickets for insert to authenticated with check (user_id = auth.uid() and public.is_active());
create policy events_select on public.analytics_events for select to authenticated using (user_id = auth.uid());
create policy events_insert on public.analytics_events for insert to authenticated with check (user_id = auth.uid());
create policy audit_select on public.audit_logs for select to authenticated using (public.is_admin());

-- Privileges: anon gets nothing; clients only get the column/verb access they need.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_path, last_industry) on public.profiles to authenticated;
revoke insert, delete on public.customer_preferences from authenticated;
revoke update on public.customer_preferences from authenticated;
grant update (preferred_industries, favourite_brands, categories, style_notes, beauty_notes, jewellery_notes, fitness_goals, channels, topics, image_consent) on public.customer_preferences to authenticated;
revoke insert, update, delete on public.product_categories, public.business_members, public.inventory_movements, public.appointments, public.audit_logs from authenticated;
revoke insert, delete on public.businesses from authenticated;
revoke update on public.businesses from authenticated;
grant update (name, description, city, contact_email, contact_phone) on public.businesses to authenticated;
revoke update on public.product_variants from authenticated;
grant update (label, sku, color_hex, size, is_active) on public.product_variants to authenticated;
revoke delete, insert on public.notifications from authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke update, delete on public.support_tickets, public.analytics_events from authenticated;
revoke update on public.saved_items from authenticated;

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin(), public.is_active(), public.is_business_member(uuid), public.can_view_business(uuid), public.is_member_of_text(text),
  public.register_business(industry, text, text, text, text, text), public.admin_set_business_status(uuid, business_status, text), public.adjust_stock(uuid, int, text),
  public.admin_stats(), public.admin_list_users(text, int, int), public.admin_set_user_status(uuid, account_status, text), public.export_my_data(), public.delete_my_account(), public.admin_set_ticket_status(uuid, ticket_status) to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- Storage. product-images: public read (catalogue photos), write only by members of the business whose id is the first path segment.
-- avatars: private, own folder only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_write on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_member_of_text((storage.foldername(name))[1]));
create policy product_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_member_of_text((storage.foldername(name))[1]));
create policy avatars_insert on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_select on storage.objects for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
