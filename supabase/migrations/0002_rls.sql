-- 0002_rls.sql  Row Level Security. Customers see only their own rows; admins are decided by profiles.role (set in SQL only).

alter table public.profiles            enable row level security;
alter table public.addresses           enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.product_variants    enable row level security;
alter table public.product_price_tiers enable row level security;
alter table public.customization_fields enable row level security;
alter table public.carts               enable row level security;
alter table public.cart_items          enable row level security;

-- Logged-out visitors must never touch private tables, even by mistake.
revoke all on public.profiles, public.addresses, public.carts, public.cart_items from anon;

-- ---------- profiles ----------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
-- Users may change only these columns. role can NOT be changed from the browser.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- addresses ----------
create policy addresses_own on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_admin_read on public.addresses for select to authenticated
  using (public.is_admin());

-- ---------- catalogue: public read, admin write ----------
create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or public.is_admin());
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy products_read on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
create policy products_admin on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy product_images_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin())));
create policy product_images_admin on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy product_variants_read on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin())));
create policy product_variants_admin on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy product_price_tiers_read on public.product_price_tiers for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin())));
create policy product_price_tiers_admin on public.product_price_tiers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Field definitions are not sensitive. Disabled rows must stay readable so that a product-level
-- "disabled" row can override an enabled global field.
create policy customization_fields_read on public.customization_fields for select to anon, authenticated
  using (true);
create policy customization_fields_admin on public.customization_fields for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- carts ----------
create policy carts_own on public.carts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy cart_items_own on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
