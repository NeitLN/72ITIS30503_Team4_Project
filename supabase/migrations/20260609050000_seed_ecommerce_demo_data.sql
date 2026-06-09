insert into public.roles (name, description)
values
  ('buyer', 'Can browse products, manage carts, and place orders.'),
  ('seller', 'Can list and manage marketplace products.'),
  ('admin', 'Can manage the complete StyleHub marketplace.')
on conflict (name) do update
set description = excluded.description;

insert into public.users (role_id, email, full_name, phone, status)
select r.id, seed.email, seed.full_name, seed.phone, 'active'
from (
  values
    ('buyer', 'minh.tran@stylehub.demo', 'Minh Tran', '+84 901 111 222'),
    ('buyer', 'linh.nguyen@stylehub.demo', 'Linh Nguyen', '+84 902 222 333'),
    ('seller', 'quang.minh@stylehub.demo', 'Quang Minh', '+84 903 333 444'),
    ('seller', 'thao.vy@stylehub.demo', 'Thao Vy', '+84 904 444 555'),
    ('admin', 'admin@stylehub.demo', 'StyleHub Admin', '+84 905 555 666')
) as seed(role_name, email, full_name, phone)
join public.roles r on r.name = seed.role_name
on conflict (email) do update
set
  role_id = excluded.role_id,
  full_name = excluded.full_name,
  phone = excluded.phone,
  status = excluded.status;

insert into public.brands (name, slug, description)
values
  ('Nike', 'nike', 'Global sportswear and footwear brand.'),
  ('Adidas', 'adidas', 'International sportswear and lifestyle brand.'),
  ('Uniqlo', 'uniqlo', 'Japanese essentials and LifeWear label.'),
  ('Zara', 'zara', 'Contemporary international fashion retailer.'),
  ('DirtyCoins', 'dirtycoins', 'Vietnamese streetwear and youth culture label.'),
  ('Degrey', 'degrey', 'Vietnamese local brand with retro streetwear influences.'),
  ('Levents', 'levents', 'Vietnamese casual streetwear label.'),
  ('Coolmate', 'coolmate', 'Vietnamese direct-to-consumer everyday apparel brand.'),
  ('Ananas', 'ananas', 'Vietnamese footwear brand known for vulcanized sneakers.'),
  ('Biti''s', 'bitis', 'Established Vietnamese footwear brand.')
on conflict (name) do update
set
  slug = excluded.slug,
  description = excluded.description,
  is_active = true;

update public.products p
set brand_id = b.id
from public.brands b
where lower(b.name) = lower(p.brand)
  and p.brand_id is distinct from b.id;

with sellers as (
  select id, row_number() over (order by email) as position
  from public.users
  where email in (
    'quang.minh@stylehub.demo',
    'thao.vy@stylehub.demo'
  )
),
catalog as (
  select id, row_number() over (order by slug) as position
  from public.products
)
update public.products p
set seller_id = s.id
from catalog c
join sellers s on s.position = 1 + ((c.position - 1) % 2)
where p.id = c.id
  and p.seller_id is null;

insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
select
  p.id,
  coalesce(p.thumbnail, p.image_url),
  concat(p.brand, ' ', p.name),
  0,
  true
from public.products p
where coalesce(p.thumbnail, p.image_url) is not null
on conflict (product_id, url) do update
set
  alt_text = excluded.alt_text,
  sort_order = excluded.sort_order,
  is_primary = excluded.is_primary;

insert into public.product_variants (
  product_id,
  sku,
  title,
  price,
  sale_price,
  stock,
  status
)
select
  p.id,
  upper(substr(md5(p.id::text), 1, 10)),
  concat('Size ', p.size),
  p.price,
  p.sale_price,
  p.stock,
  case when p.stock > 0 then 'active' else 'sold_out' end
from public.products p
on conflict (sku) do update
set
  title = excluded.title,
  price = excluded.price,
  sale_price = excluded.sale_price,
  stock = excluded.stock,
  status = excluded.status;

insert into public.attributes (name, slug)
values
  ('Size', 'size'),
  ('Condition', 'condition')
on conflict (slug) do update
set name = excluded.name;

insert into public.attribute_values (attribute_id, value, slug)
select
  a.id,
  source.value,
  lower(regexp_replace(source.value, '[^a-zA-Z0-9]+', '-', 'g'))
from public.attributes a
join (
  select 'size' as attribute_slug, size as value from public.products
  union
  select 'condition', condition from public.products
) source on source.attribute_slug = a.slug
where source.value is not null
on conflict (attribute_id, slug) do update
set value = excluded.value;

insert into public.variant_attribute_values (variant_id, attribute_value_id)
select distinct pv.id, av.id
from public.product_variants pv
join public.products p on p.id = pv.product_id
join public.attributes a on a.slug = 'size'
join public.attribute_values av
  on av.attribute_id = a.id
  and av.value = p.size
on conflict do nothing;

insert into public.variant_attribute_values (variant_id, attribute_value_id)
select distinct pv.id, av.id
from public.product_variants pv
join public.products p on p.id = pv.product_id
join public.attributes a on a.slug = 'condition'
join public.attribute_values av
  on av.attribute_id = a.id
  and av.value = p.condition
on conflict do nothing;

insert into public.addresses (
  user_id,
  label,
  recipient_name,
  phone,
  address_line_1,
  ward,
  district,
  city,
  is_default
)
select
  u.id,
  'Home',
  u.full_name,
  coalesce(u.phone, '+84 900 000 000'),
  '128 Nguyen Dinh Chieu Street',
  'Vo Thi Sau Ward',
  'District 3',
  'Ho Chi Minh City',
  true
from public.users u
where u.email = 'minh.tran@stylehub.demo'
  and not exists (
    select 1 from public.addresses a
    where a.user_id = u.id and a.label = 'Home'
  );

insert into public.carts (user_id, status, currency)
select u.id, 'active', 'VND'
from public.users u
where u.email = 'linh.nguyen@stylehub.demo'
on conflict (user_id) where status = 'active' do nothing;

insert into public.cart_items (
  cart_id,
  product_id,
  variant_id,
  quantity,
  unit_price
)
select
  c.id,
  p.id,
  pv.id,
  1,
  coalesce(p.sale_price, p.price)
from public.carts c
join public.users u on u.id = c.user_id
cross join lateral (
  select product.*
  from public.products product
  where product.status = 'active'
  order by product.slug
  limit 1
) p
left join lateral (
  select variant.id
  from public.product_variants variant
  where variant.product_id = p.id
  order by variant.created_at
  limit 1
) pv on true
where u.email = 'linh.nguyen@stylehub.demo'
  and c.status = 'active'
on conflict do nothing;

insert into public.coupons (
  code,
  description,
  discount_type,
  discount_value,
  minimum_order_amount,
  maximum_discount_amount,
  starts_at,
  expires_at,
  usage_limit,
  is_active
)
values
  ('WELCOME10', '10% off a first StyleHub order.', 'percentage', 10, 500000, 300000, now() - interval '1 day', now() + interval '180 days', 500, true),
  ('FREESHIP50', '50,000 VND shipping credit.', 'fixed', 50000, 300000, 50000, now() - interval '1 day', now() + interval '90 days', 300, true)
on conflict (code) do update
set
  description = excluded.description,
  discount_type = excluded.discount_type,
  discount_value = excluded.discount_value,
  minimum_order_amount = excluded.minimum_order_amount,
  maximum_discount_amount = excluded.maximum_discount_amount,
  expires_at = excluded.expires_at,
  usage_limit = excluded.usage_limit,
  is_active = excluded.is_active;

insert into public.orders (
  order_number,
  user_id,
  shipping_address_id,
  status,
  payment_status,
  subtotal,
  discount_amount,
  shipping_fee,
  total,
  currency,
  notes,
  placed_at
)
select
  'SH-DEMO-0001',
  u.id,
  a.id,
  'shipped',
  'paid',
  700000,
  70000,
  30000,
  660000,
  'VND',
  'Demo order for the expanded StyleHub ERD.',
  now() - interval '2 days'
from public.users u
left join public.addresses a on a.user_id = u.id and a.is_default
where u.email = 'minh.tran@stylehub.demo'
on conflict (order_number) do update
set
  user_id = excluded.user_id,
  shipping_address_id = excluded.shipping_address_id,
  status = excluded.status,
  payment_status = excluded.payment_status,
  subtotal = excluded.subtotal,
  discount_amount = excluded.discount_amount,
  shipping_fee = excluded.shipping_fee,
  total = excluded.total,
  notes = excluded.notes;

insert into public.order_items (
  order_id,
  product_id,
  variant_id,
  seller_id,
  product_name,
  variant_name,
  sku,
  quantity,
  unit_price,
  total_price
)
select
  o.id,
  selected.product_id,
  selected.variant_id,
  selected.seller_id,
  selected.product_name,
  selected.variant_name,
  selected.sku,
  1,
  selected.unit_price,
  selected.unit_price
from public.orders o
cross join lateral (
  select
    p.id as product_id,
    pv.id as variant_id,
    p.seller_id,
    concat(p.brand, ' ', p.name) as product_name,
    pv.title as variant_name,
    pv.sku,
    coalesce(p.sale_price, p.price) as unit_price
  from public.products p
  join public.product_variants pv on pv.product_id = p.id
  where p.status = 'active'
  order by p.slug
  limit 2
) selected
where o.order_number = 'SH-DEMO-0001'
  and not exists (
    select 1 from public.order_items oi
    where oi.order_id = o.id and oi.product_id = selected.product_id
  );

insert into public.order_coupons (order_id, coupon_id, discount_amount)
select
  o.id,
  c.id,
  least(
    (select sum(oi.total_price) from public.order_items oi where oi.order_id = o.id) * 0.10,
    coalesce(
      c.maximum_discount_amount,
      (select sum(oi.total_price) from public.order_items oi where oi.order_id = o.id) * 0.10
    )
  )
from public.orders o
join public.coupons c on c.code = 'WELCOME10'
where o.order_number = 'SH-DEMO-0001'
on conflict (order_id, coupon_id) do update
set discount_amount = excluded.discount_amount;

with totals as (
  select oi.order_id, sum(oi.total_price) as subtotal
  from public.order_items oi
  group by oi.order_id
),
discounts as (
  select oc.order_id, sum(oc.discount_amount) as discount_amount
  from public.order_coupons oc
  group by oc.order_id
)
update public.orders o
set
  subtotal = totals.subtotal,
  discount_amount = coalesce(discounts.discount_amount, 0),
  total = totals.subtotal - coalesce(discounts.discount_amount, 0) + o.shipping_fee
from totals
left join discounts on discounts.order_id = totals.order_id
where o.id = totals.order_id
  and o.order_number = 'SH-DEMO-0001';

insert into public.payments (
  order_id,
  provider,
  transaction_id,
  amount,
  currency,
  status,
  paid_at,
  metadata
)
select
  o.id,
  'momo',
  'MOMO-DEMO-0001',
  o.total,
  o.currency,
  'paid',
  now() - interval '2 days',
  '{"channel":"wallet","demo":true}'::jsonb
from public.orders o
where o.order_number = 'SH-DEMO-0001'
on conflict (transaction_id) do update
set
  order_id = excluded.order_id,
  amount = excluded.amount,
  status = excluded.status,
  paid_at = excluded.paid_at,
  metadata = excluded.metadata;

insert into public.shipments (
  order_id,
  carrier,
  tracking_number,
  status,
  shipping_address,
  shipped_at
)
select
  o.id,
  'GHN',
  'GHN-DEMO-0001',
  'in_transit',
  jsonb_build_object(
    'recipient', a.recipient_name,
    'phone', a.phone,
    'address_line_1', a.address_line_1,
    'district', a.district,
    'city', a.city,
    'country', a.country
  ),
  now() - interval '1 day'
from public.orders o
join public.addresses a on a.id = o.shipping_address_id
where o.order_number = 'SH-DEMO-0001'
on conflict (order_id) do update
set
  carrier = excluded.carrier,
  tracking_number = excluded.tracking_number,
  status = excluded.status,
  shipping_address = excluded.shipping_address,
  shipped_at = excluded.shipped_at;

insert into public.reviews (
  user_id,
  product_id,
  order_item_id,
  rating,
  title,
  comment,
  status
)
select
  buyer.id,
  oi.product_id,
  oi.id,
  case when row_number() over (order by oi.created_at, oi.id) = 1 then 5 else 4 end,
  case when row_number() over (order by oi.created_at, oi.id) = 1
    then 'Exactly as described'
    else 'Great marketplace find'
  end,
  case when row_number() over (order by oi.created_at, oi.id) = 1
    then 'The item arrived clean, well packed, and matched the listing photos.'
    else 'Smooth seller communication and fast delivery.'
  end,
  'published'
from public.orders o
join public.users buyer on buyer.id = o.user_id
join public.order_items oi on oi.order_id = o.id
where o.order_number = 'SH-DEMO-0001'
on conflict (user_id, product_id) do update
set
  order_item_id = excluded.order_item_id,
  rating = excluded.rating,
  title = excluded.title,
  comment = excluded.comment,
  status = excluded.status;

insert into public.wishlists (user_id, product_id)
select buyer.id, product.id
from public.users buyer
cross join lateral (
  select p.id
  from public.products p
  where p.status = 'active'
  order by p.price desc, p.slug
  limit 3
) product
where buyer.email = 'linh.nguyen@stylehub.demo'
on conflict (user_id, product_id) do nothing;
