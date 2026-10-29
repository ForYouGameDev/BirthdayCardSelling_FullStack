-- 0001_schema.sql  (Batch 1: catalogue, accounts, carts)
-- Money is stored in MINOR units (paise for INR). 19900 = Rs 199.00
-- Orders, payments, coupons, invoices, shipments, audit logs come in the next batch (separate migration).

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Trusted admin check. Reads the role from the DB (never from JWT user_metadata, which users can edit).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- addresses ----------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'IN',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- ---------- products ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  slug text not null unique,
  name text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  product_type text not null default 'physical' check (product_type in ('physical','digital','both')),
  price_minor int not null check (price_minor >= 0),
  sale_price_minor int check (sale_price_minor is null or (sale_price_minor >= 0 and sale_price_minor < price_minor)),
  currency text not null default 'INR',
  effective_price_minor int generated always as (coalesce(sale_price_minor, price_minor)) stored,
  track_inventory boolean not null default true,
  stock_qty int not null default 0 check (stock_qty >= 0),
  in_stock boolean generated always as (not track_inventory or stock_qty > 0) stored,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_sample boolean not null default false,
  personalization_enabled boolean not null default true,
  delivery_min_days int check (delivery_min_days is null or delivery_min_days >= 0),
  delivery_max_days int check (delivery_max_days is null or delivery_max_days >= coalesce(delivery_min_days, 0)),
  sold_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_active_idx on public.products (is_active, created_at desc);
create index products_price_idx on public.products (effective_price_minor);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path text not null,            -- path inside the public "product-images" bucket
  alt text,
  position int not null default 0
);
create index product_images_product_idx on public.product_images (product_id, position);

-- Variants: size / finish / paper type. The price_delta is added to the unit price.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  sku text,
  size text,
  finish text,
  paper text,
  price_delta_minor int not null default 0,
  stock_qty int check (stock_qty is null or stock_qty >= 0),   -- null = use the product's stock
  is_active boolean not null default true,
  position int not null default 0
);
create index product_variants_product_idx on public.product_variants (product_id, position);

-- Quantity-based pricing: from min_qty cards, the base unit price becomes unit_price_minor.
create table public.product_price_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_qty int not null check (min_qty >= 2),
  unit_price_minor int not null check (unit_price_minor >= 0),
  unique (product_id, min_qty)
);

-- ---------- personalisation fields ----------
-- scope 'global'  : applies to every product.
-- scope 'product' : applies to one product and OVERRIDES the global field with the same key
--                   (e.g. a product-level row with is_enabled=false hides that global field for that product).
create table public.customization_fields (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global','product')),
  product_id uuid references public.products(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null,
  help_text text,
  field_type text not null check (field_type in ('text','textarea','select','photo')),
  is_enabled boolean not null default true,
  is_required boolean not null default false,
  max_length int check (max_length is null or (max_length between 1 and 2000)),
  allowed_mime_types text[] not null default array['image/jpeg','image/png','image/webp'],
  max_file_bytes int not null default 5242880 check (max_file_bytes between 1 and 10485760),
  options jsonb not null default '[]'::jsonb,
  extra_price_minor int not null default 0 check (extra_price_minor >= 0),
  position int not null default 0,
  check ((scope = 'global' and product_id is null) or (scope = 'product' and product_id is not null))
);
create unique index customization_global_key_uq on public.customization_fields (key) where scope = 'global';
create unique index customization_product_key_uq on public.customization_fields (product_id, key) where scope = 'product';

-- ---------- carts (signed-in users only; guests keep their cart in the browser) ----------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity int not null check (quantity between 1 and 100),
  customization jsonb not null default '{}'::jsonb,   -- {field_key: value}; photo values are private-storage paths
  created_at timestamptz not null default now()
);
create index cart_items_cart_idx on public.cart_items (cart_id, created_at);
