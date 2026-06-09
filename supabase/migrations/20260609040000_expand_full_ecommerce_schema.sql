create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  role_id uuid not null references public.roles(id) on delete restrict,
  email text not null unique,
  full_name text not null,
  phone text,
  avatar_url text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  logo_url text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories
  add column if not exists image text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists parent_id uuid,
  add column if not exists updated_at timestamptz not null default now();

alter table public.products
  add column if not exists brand_id uuid,
  add column if not exists seller_id uuid,
  add column if not exists thumbnail text,
  add column if not exists sale_price numeric(12, 2),
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

update public.products
set thumbnail = image_url
where thumbnail is null;

alter table public.products
  drop constraint if exists products_sale_price_check;
alter table public.products
  add constraint products_sale_price_check
  check (sale_price is null or sale_price >= 0);

alter table public.products
  drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status in ('draft', 'active', 'sold', 'archived'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_parent_id_fkey'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_parent_id_fkey
      foreign key (parent_id) references public.categories(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_brand_id_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_brand_id_fkey
      foreign key (brand_id) references public.brands(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_seller_id_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_seller_id_fkey
      foreign key (seller_id) references public.users(id) on delete set null;
  end if;
end;
$$;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, url)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  title text not null,
  price numeric(12, 2) not null check (price >= 0),
  sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'sold_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  value text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (attribute_id, slug)
);

create table if not exists public.variant_attribute_values (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  attribute_value_id uuid not null references public.attribute_values(id) on delete cascade,
  primary key (variant_id, attribute_value_id)
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  phone text not null,
  address_line_1 text not null,
  address_line_2 text,
  ward text,
  district text,
  city text not null,
  postal_code text,
  country text not null default 'Vietnam',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'converted', 'abandoned')),
  currency char(3) not null default 'VND',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists carts_one_active_per_user_idx
  on public.carts(user_id)
  where status = 'active';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cart_items_unique_variant_idx
  on public.cart_items(cart_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.users(id) on delete restrict,
  shipping_address_id uuid references public.addresses(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  shipping_fee numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  currency char(3) not null default 'VND',
  notes text,
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  seller_id uuid references public.users(id) on delete set null,
  product_name text not null,
  variant_name text,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  transaction_id text unique,
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null default 'VND',
  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text unique,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'in_transit', 'delivered', 'returned')),
  shipping_address jsonb not null default '{}'::jsonb,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  status text not null default 'published'
    check (status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null
    check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  minimum_order_amount numeric(12, 2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount_amount numeric(12, 2) check (maximum_discount_amount is null or maximum_discount_amount >= 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_coupons (
  order_id uuid not null references public.orders(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  discount_amount numeric(12, 2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now(),
  primary key (order_id, coupon_id)
);

create index if not exists products_brand_id_idx on public.products(brand_id);
create index if not exists products_seller_id_idx on public.products(seller_id);
create index if not exists product_images_product_id_idx on public.product_images(product_id);
create index if not exists product_variants_product_id_idx on public.product_variants(product_id);
create index if not exists attribute_values_attribute_id_idx on public.attribute_values(attribute_id);
create index if not exists addresses_user_id_idx on public.addresses(user_id);
create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists reviews_product_id_idx on public.reviews(product_id);
create index if not exists wishlists_user_id_idx on public.wishlists(user_id);

drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at before update on public.roles
for each row execute function public.set_updated_at();
drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();
drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at before update on public.brands
for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();
drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at before update on public.addresses
for each row execute function public.set_updated_at();
drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at before update on public.carts
for each row execute function public.set_updated_at();
drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();
drop trigger if exists shipments_set_updated_at on public.shipments;
create trigger shipments_set_updated_at before update on public.shipments
for each row execute function public.set_updated_at();
drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews
for each row execute function public.set_updated_at();
drop trigger if exists coupons_set_updated_at on public.coupons;
create trigger coupons_set_updated_at before update on public.coupons
for each row execute function public.set_updated_at();

alter table public.roles enable row level security;
alter table public.users enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.attributes enable row level security;
alter table public.attribute_values enable row level security;
alter table public.variant_attribute_values enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.coupons enable row level security;
alter table public.order_coupons enable row level security;

drop policy if exists "Roles are publicly readable" on public.roles;
create policy "Roles are publicly readable" on public.roles for select using (true);
drop policy if exists "Brands are publicly readable" on public.brands;
create policy "Brands are publicly readable" on public.brands for select using (is_active);
drop policy if exists "Categories are publicly readable" on public.categories;
create policy "Categories are publicly readable" on public.categories for select using (is_active);
drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable" on public.products for select using (status = 'active');
drop policy if exists "Product images are publicly readable" on public.product_images;
create policy "Product images are publicly readable" on public.product_images for select using (true);
drop policy if exists "Product variants are publicly readable" on public.product_variants;
create policy "Product variants are publicly readable" on public.product_variants for select using (status = 'active');
drop policy if exists "Attributes are publicly readable" on public.attributes;
create policy "Attributes are publicly readable" on public.attributes for select using (true);
drop policy if exists "Attribute values are publicly readable" on public.attribute_values;
create policy "Attribute values are publicly readable" on public.attribute_values for select using (true);
drop policy if exists "Variant attributes are publicly readable" on public.variant_attribute_values;
create policy "Variant attributes are publicly readable" on public.variant_attribute_values for select using (true);
drop policy if exists "Published reviews are publicly readable" on public.reviews;
create policy "Published reviews are publicly readable" on public.reviews for select using (status = 'published');
drop policy if exists "Active coupons are publicly readable" on public.coupons;
create policy "Active coupons are publicly readable" on public.coupons for select
using (is_active and starts_at <= now() and (expires_at is null or expires_at > now()));

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile" on public.users for select
using (auth.uid() = auth_user_id);
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users for update
using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own addresses" on public.addresses for all
using (user_id in (select id from public.users where auth_user_id = auth.uid()))
with check (user_id in (select id from public.users where auth_user_id = auth.uid()));
drop policy if exists "Users manage own carts" on public.carts;
create policy "Users manage own carts" on public.carts for all
using (user_id in (select id from public.users where auth_user_id = auth.uid()))
with check (user_id in (select id from public.users where auth_user_id = auth.uid()));
drop policy if exists "Users manage own cart items" on public.cart_items;
create policy "Users manage own cart items" on public.cart_items for all
using (cart_id in (
  select c.id from public.carts c
  join public.users u on u.id = c.user_id
  where u.auth_user_id = auth.uid()
))
with check (cart_id in (
  select c.id from public.carts c
  join public.users u on u.id = c.user_id
  where u.auth_user_id = auth.uid()
));
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders for select
using (user_id in (select id from public.users where auth_user_id = auth.uid()));
drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items" on public.order_items for select
using (order_id in (
  select o.id from public.orders o
  join public.users u on u.id = o.user_id
  where u.auth_user_id = auth.uid()
));
drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments" on public.payments for select
using (order_id in (
  select o.id from public.orders o
  join public.users u on u.id = o.user_id
  where u.auth_user_id = auth.uid()
));
drop policy if exists "Users read own shipments" on public.shipments;
create policy "Users read own shipments" on public.shipments for select
using (order_id in (
  select o.id from public.orders o
  join public.users u on u.id = o.user_id
  where u.auth_user_id = auth.uid()
));
drop policy if exists "Users manage own wishlists" on public.wishlists;
create policy "Users manage own wishlists" on public.wishlists for all
using (user_id in (select id from public.users where auth_user_id = auth.uid()))
with check (user_id in (select id from public.users where auth_user_id = auth.uid()));
drop policy if exists "Users create own reviews" on public.reviews;
create policy "Users create own reviews" on public.reviews for insert
with check (user_id in (select id from public.users where auth_user_id = auth.uid()));
drop policy if exists "Users update own reviews" on public.reviews;
create policy "Users update own reviews" on public.reviews for update
using (user_id in (select id from public.users where auth_user_id = auth.uid()))
with check (user_id in (select id from public.users where auth_user_id = auth.uid()));
drop policy if exists "Users read own order coupons" on public.order_coupons;
create policy "Users read own order coupons" on public.order_coupons for select
using (order_id in (
  select o.id from public.orders o
  join public.users u on u.id = o.user_id
  where u.auth_user_id = auth.uid()
));
