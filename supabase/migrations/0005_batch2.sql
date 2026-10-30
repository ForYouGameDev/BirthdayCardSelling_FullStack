-- 0005_batch2.sql  Orders, store settings, server-side checkout (COD + Razorpay), admin order management.
-- Run AFTER 0001-0004. Money is in minor units (paise).
--
-- Safety design:
--   * The browser NEVER writes orders directly. Orders are created by place_order(), which re-reads the cart,
--     re-prices every line from the database, checks stock and validates personalisation. Browser prices are ignored.
--   * Only the Edge Functions (service_role) can mark a Razorpay order as paid.

-- ---------- store settings (single row, readable by everyone, writable by admins) ----------
create table public.app_settings (
  id int primary key default 1 check (id = 1),
  cod_enabled boolean not null default true,
  cod_fee_minor int not null default 0 check (cod_fee_minor >= 0),
  razorpay_enabled boolean not null default false,
  shipping_fee_minor int not null default 4900 check (shipping_fee_minor >= 0),
  free_shipping_over_minor int check (free_shipping_over_minor is null or free_shipping_over_minor >= 0),
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id, free_shipping_over_minor) values (1, 49900);
alter table public.app_settings enable row level security;
create policy app_settings_read on public.app_settings for select to anon, authenticated using (true);
create policy app_settings_admin on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.app_settings from anon, authenticated;
revoke update on public.app_settings from anon;

-- ---------- orders ----------
create sequence public.order_no_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('BC-' || nextval('public.order_no_seq')),
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null check (status in ('pending_payment','placed','confirmed','processing','shipped','delivered','cancelled')),
  payment_method text not null check (payment_method in ('cod','razorpay')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  subtotal_minor int not null check (subtotal_minor >= 0),
  shipping_minor int not null default 0 check (shipping_minor >= 0),
  cod_fee_minor int not null default 0 check (cod_fee_minor >= 0),
  total_minor int not null check (total_minor >= 0),
  currency text not null default 'INR',
  address jsonb not null,
  customer_note text,
  courier text,
  tracking_no text,
  razorpay_order_id text,
  razorpay_payment_id text,
  stock_restored boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  name text not null,
  sku text not null,
  variant_label text,
  unit_price_minor int not null,
  charge_minor int not null default 0,
  quantity int not null check (quantity between 1 and 100),
  line_total_minor int not null,
  customization jsonb not null default '[]'::jsonb   -- [{key,label,type,value}] ; photo value = private storage path
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  actor uuid,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.order_events enable row level security;
revoke all on public.orders, public.order_items, public.order_events from anon, authenticated;
grant select on public.orders, public.order_items, public.order_events to authenticated;

create policy orders_select on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy order_events_select on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- ---------- helpers ----------
create or replace function public.restore_order_stock(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare it record; o record;
begin
  select * into o from public.orders where id = p_order for update;
  if o is null or o.stock_restored then return; end if;
  for it in select * from public.order_items where order_id = p_order loop
    if it.product_id is null then continue; end if;
    if it.variant_id is not null and exists (select 1 from public.product_variants v where v.id = it.variant_id and v.stock_qty is not null) then
      update public.product_variants set stock_qty = stock_qty + it.quantity where id = it.variant_id;
    elsif exists (select 1 from public.products p where p.id = it.product_id and p.track_inventory) then
      update public.products set stock_qty = stock_qty + it.quantity where id = it.product_id;
    end if;
  end loop;
  update public.orders set stock_restored = true where id = p_order;
end $$;
revoke all on function public.restore_order_stock(uuid) from public, anon, authenticated;

-- ---------- place_order: the ONLY way an order is created ----------
create or replace function public.place_order(p_address_id uuid, p_method text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.app_settings;
  addr public.addresses;
  v_cart uuid;
  ci record; p public.products; v public.product_variants;
  qty int; base int; tier int; unit int; charge int; line int;
  subtotal int := 0; shipping int := 0; codfee int := 0; total int;
  all_digital boolean := true;
  f record; val text; custom jsonb; has_variants boolean;
  order_id uuid; avail int; item_count int := 0;
begin
  if uid is null then raise exception 'Please sign in.'; end if;
  select * into s from public.app_settings where id = 1;
  if p_method = 'cod' and not s.cod_enabled then raise exception 'Cash on delivery is not available.'; end if;
  if p_method = 'razorpay' and not s.razorpay_enabled then raise exception 'Online payment is not available.'; end if;
  if p_method not in ('cod','razorpay') then raise exception 'Choose a payment method.'; end if;

  select * into addr from public.addresses where id = p_address_id and user_id = uid;
  if addr.id is null then raise exception 'Please choose a delivery address.'; end if;

  select id into v_cart from public.carts where user_id = uid;
  if v_cart is null or not exists (select 1 from public.cart_items x where x.cart_id = v_cart) then
    raise exception 'Your cart is empty.';
  end if;

  -- create the order shell first (totals are filled in at the end)
  insert into public.orders (user_id, status, payment_method, payment_status, subtotal_minor, total_minor, address, customer_note)
  values (uid, case when p_method = 'cod' then 'placed' else 'pending_payment' end, p_method, 'pending', 0, 0,
          jsonb_build_object('full_name', addr.full_name, 'phone', addr.phone, 'line1', addr.line1, 'line2', addr.line2,
                             'city', addr.city, 'state', addr.state, 'postal_code', addr.postal_code, 'country', addr.country),
          nullif(left(trim(coalesce(p_note, '')), 500), ''))
  returning id into order_id;

  for ci in select * from public.cart_items x where x.cart_id = v_cart order by x.created_at loop
    select * into p from public.products where id = ci.product_id for update;
    if p.id is null or not p.is_active then raise exception 'A card in your cart is no longer available.'; end if;
    qty := ci.quantity;
    if qty < 1 or qty > 100 then raise exception 'Invalid quantity.'; end if;

    -- variant
    v := null;
    select exists (select 1 from public.product_variants x where x.product_id = p.id and x.is_active) into has_variants;
    if ci.variant_id is not null then
      select * into v from public.product_variants where id = ci.variant_id and product_id = p.id and is_active;
      if v.id is null then raise exception 'An option in your cart is no longer available.'; end if;
    elsif has_variants then
      raise exception 'Please choose an option for %.', p.name;
    end if;

    -- stock
    if p.track_inventory then
      avail := case when v.id is not null and v.stock_qty is not null then v.stock_qty else p.stock_qty end;
      if avail < qty then raise exception 'Only % left of %.', avail, p.name; end if;
      if v.id is not null and v.stock_qty is not null then
        update public.product_variants set stock_qty = stock_qty - qty where id = v.id;
      else
        update public.products set stock_qty = stock_qty - qty where id = p.id;
      end if;
    end if;

    -- price: min(effective price, best tier) + variant delta
    base := coalesce(p.sale_price_minor, p.price_minor);
    select min(unit_price_minor) into tier from public.product_price_tiers t
      where t.product_id = p.id and t.min_qty = (select max(min_qty) from public.product_price_tiers t2 where t2.product_id = p.id and t2.min_qty <= qty);
    unit := least(base, coalesce(tier, base)) + coalesce(v.price_delta_minor, 0);

    -- personalisation: global fields, overridden by product-level rows with the same key; only enabled fields count
    charge := 0; custom := '[]'::jsonb;
    if p.personalization_enabled then
      for f in
        select distinct on (key) * from public.customization_fields
        where scope = 'global' or product_id = p.id
        order by key, (scope = 'product') desc
      loop
        if not f.is_enabled then continue; end if;
        val := nullif(trim(coalesce(ci.customization ->> f.key, '')), '');
        if val is null then
          if f.is_required then raise exception '% is required for %.', f.label, p.name; end if;
          continue;
        end if;
        if f.field_type in ('text','textarea') and f.max_length is not null and char_length(val) > f.max_length then
          raise exception '% is too long for %.', f.label, p.name;
        elsif f.field_type = 'select' and not (f.options ? val) then
          raise exception 'Invalid choice for % on %.', f.label, p.name;
        elsif f.field_type = 'photo' and val not like (uid::text || '/%') then
          raise exception 'Invalid photo for %.', p.name;
        end if;
        charge := charge + f.extra_price_minor;
        custom := custom || jsonb_build_array(jsonb_build_object('key', f.key, 'label', f.label, 'type', f.field_type, 'value', val));
      end loop;
    end if;

    line := (unit + charge) * qty;
    subtotal := subtotal + line;
    if p.product_type <> 'digital' then all_digital := false; end if;
    item_count := item_count + 1;

    insert into public.order_items (order_id, product_id, variant_id, name, sku, variant_label, unit_price_minor, charge_minor, quantity, line_total_minor, customization)
    values (order_id, p.id, v.id, p.name, p.sku, v.label, unit, charge, qty, line, custom);

    if p_method = 'cod' then update public.products set sold_count = sold_count + qty where id = p.id; end if;
  end loop;

  if item_count = 0 then raise exception 'Your cart is empty.'; end if;

  if not all_digital then
    shipping := case when s.free_shipping_over_minor is not null and subtotal >= s.free_shipping_over_minor then 0 else s.shipping_fee_minor end;
  end if;
  if p_method = 'cod' then codfee := s.cod_fee_minor; end if;
  total := subtotal + shipping + codfee;

  update public.orders set subtotal_minor = subtotal, shipping_minor = shipping, cod_fee_minor = codfee, total_minor = total where id = order_id;
  insert into public.order_events (order_id, status, note, actor)
  values (order_id, case when p_method = 'cod' then 'placed' else 'pending_payment' end,
          case when p_method = 'cod' then 'Order placed (cash on delivery)' else 'Waiting for online payment' end, uid);

  delete from public.cart_items x where x.cart_id = v_cart;
  return order_id;
end $$;
revoke all on function public.place_order(uuid, text, text) from public, anon;
grant execute on function public.place_order(uuid, text, text) to authenticated;

-- ---------- customer: cancel an order that is not paid and not shipped ----------
create or replace function public.cancel_my_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and user_id = auth.uid() for update;
  if o.id is null then raise exception 'Order not found.'; end if;
  if o.payment_status = 'paid' then raise exception 'This order is already paid. Please contact support to cancel it.'; end if;
  if o.status not in ('pending_payment','placed') then raise exception 'This order can no longer be cancelled.'; end if;
  update public.orders set status = 'cancelled', updated_at = now() where id = o.id;
  perform public.restore_order_stock(o.id);
  insert into public.order_events (order_id, status, note, actor) values (o.id, 'cancelled', 'Cancelled by customer', auth.uid());
end $$;
revoke all on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;

-- ---------- admin: change order status / add tracking ----------
create or replace function public.admin_set_order_status(p_order uuid, p_status text, p_courier text default null, p_tracking text default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_status not in ('placed','confirmed','processing','shipped','delivered','cancelled') then raise exception 'Invalid status.'; end if;
  select * into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'Order not found.'; end if;
  if o.status = 'cancelled' then raise exception 'A cancelled order cannot be changed.'; end if;
  if o.status = 'pending_payment' and p_status <> 'cancelled' then raise exception 'Waiting for payment. You can only cancel this order.'; end if;
  if p_status = 'cancelled' and o.payment_status = 'paid' then raise exception 'This order is paid. Refund it in the Razorpay dashboard, then cancel.'; end if;

  update public.orders set
    status = p_status,
    courier = coalesce(nullif(trim(p_courier), ''), courier),
    tracking_no = coalesce(nullif(trim(p_tracking), ''), tracking_no),
    payment_status = case when p_status = 'delivered' and payment_method = 'cod' then 'paid' else payment_status end,
    paid_at = case when p_status = 'delivered' and payment_method = 'cod' and paid_at is null then now() else paid_at end,
    updated_at = now()
  where id = o.id;
  if p_status = 'cancelled' then perform public.restore_order_stock(o.id); end if;
  insert into public.order_events (order_id, status, note, actor) values (o.id, p_status, nullif(trim(coalesce(p_note, '')), ''), auth.uid());
end $$;
revoke all on function public.admin_set_order_status(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, text, text, text, text) to authenticated;

-- ---------- Razorpay: only the Edge Functions (service_role) may call these ----------
create or replace function public.set_razorpay_order(p_order uuid, p_rzp_order text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set razorpay_order_id = p_rzp_order, updated_at = now()
  where id = p_order and payment_method = 'razorpay' and status = 'pending_payment';
  if not found then raise exception 'Order is not waiting for payment.'; end if;
end $$;

create or replace function public.mark_order_paid(p_order uuid, p_rzp_order text, p_payment_id text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'Order not found.'; end if;
  if o.payment_status = 'paid' then return; end if;                 -- already done (verify + webhook may both arrive)
  if o.razorpay_order_id is distinct from p_rzp_order then raise exception 'Payment does not match this order.'; end if;
  if o.status = 'cancelled' then raise exception 'Order was cancelled before payment arrived. Refund needed.'; end if;
  update public.orders set status = 'placed', payment_status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now(), updated_at = now() where id = o.id;
  update public.products p set sold_count = sold_count + i.quantity from public.order_items i where i.order_id = o.id and i.product_id = p.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'placed', 'Payment received (Razorpay)');
end $$;

revoke all on function public.set_razorpay_order(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_order_paid(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_razorpay_order(uuid, text) to service_role;
grant execute on function public.mark_order_paid(uuid, text, text) to service_role;
grant select, update on public.orders to service_role;
