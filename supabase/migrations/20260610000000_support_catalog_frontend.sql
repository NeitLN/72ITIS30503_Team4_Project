insert into public.attributes (name, slug)
values ('Color', 'color')
on conflict (slug) do update
set name = excluded.name;

insert into public.attribute_values (attribute_id, value, slug)
select a.id, seed.value, seed.slug
from public.attributes a
cross join (
  values
    ('Black', 'black'),
    ('White', 'white'),
    ('Navy', 'navy'),
    ('Grey', 'grey')
) as seed(value, slug)
where a.slug = 'color'
on conflict (attribute_id, slug) do update
set value = excluded.value;

insert into public.product_images (
  product_id,
  url,
  alt_text,
  sort_order,
  is_primary
)
select
  p.id,
  alternate.image_url,
  concat(p.brand, ' ', p.name, ' alternate view'),
  1,
  false
from public.products p
cross join lateral (
  select other.image_url
  from public.products other
  where other.category_slug = p.category_slug
    and other.id <> p.id
  order by md5(p.id::text || other.id::text)
  limit 1
) alternate
where p.status = 'active'
on conflict (product_id, url) do nothing;

with apparel_products as (
  select id, price, sale_price, stock
  from public.products
  where category_slug in ('t-shirts', 'hoodies', 'pants')
    and status = 'active'
),
sizes as (
  select *
  from (values ('S', 1), ('M', 2), ('L', 3), ('XL', 4)) as value(size_name, sort_order)
),
colors as (
  select *
  from (values ('Black', 1), ('White', 2)) as value(color_name, sort_order)
)
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
  product.id,
  upper(substr(md5(product.id::text || size.size_name || color.color_name), 1, 10)),
  concat(size.size_name, ' / ', color.color_name),
  product.price,
  product.sale_price,
  case
    when size.size_name = 'XL' and color.color_name = 'White' then 0
    else greatest(product.stock, 1)
  end,
  case
    when size.size_name = 'XL' and color.color_name = 'White' then 'sold_out'
    else 'active'
  end
from apparel_products product
cross join sizes size
cross join colors color
on conflict (sku) do update
set
  title = excluded.title,
  price = excluded.price,
  sale_price = excluded.sale_price,
  stock = excluded.stock,
  status = excluded.status;

insert into public.variant_attribute_values (variant_id, attribute_value_id)
select variant.id, value.id
from public.product_variants variant
join public.products product on product.id = variant.product_id
join public.attributes attribute on attribute.slug = 'size'
join public.attribute_values value
  on value.attribute_id = attribute.id
  and value.value = split_part(variant.title, ' / ', 1)
where product.category_slug in ('t-shirts', 'hoodies', 'pants')
  and variant.title like '% / %'
on conflict do nothing;

insert into public.variant_attribute_values (variant_id, attribute_value_id)
select variant.id, value.id
from public.product_variants variant
join public.products product on product.id = variant.product_id
join public.attributes attribute on attribute.slug = 'color'
join public.attribute_values value
  on value.attribute_id = attribute.id
  and value.value = split_part(variant.title, ' / ', 2)
where product.category_slug in ('t-shirts', 'hoodies', 'pants')
  and variant.title like '% / %'
on conflict do nothing;

create or replace function public.get_demo_marketplace_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_user_id uuid;
  active_cart_id uuid;
begin
  select id into demo_user_id
  from public.users
  where email = 'linh.nguyen@stylehub.demo';

  if demo_user_id is null then
    return jsonb_build_object('cart_count', 0, 'wishlist_product_ids', '[]'::jsonb);
  end if;

  select id into active_cart_id
  from public.carts
  where user_id = demo_user_id and status = 'active'
  limit 1;

  return jsonb_build_object(
    'cart_count',
    coalesce((
      select sum(quantity)
      from public.cart_items
      where cart_id = active_cart_id
    ), 0),
    'wishlist_product_ids',
    coalesce((
      select jsonb_agg(product_id)
      from public.wishlists
      where user_id = demo_user_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.add_demo_cart_item(
  target_product_id uuid,
  target_variant_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_user_id uuid;
  active_cart_id uuid;
  selected_price numeric(12, 2);
  selected_stock integer;
begin
  select id into demo_user_id
  from public.users
  where email = 'linh.nguyen@stylehub.demo';

  if demo_user_id is null then
    raise exception 'Demo buyer is not configured';
  end if;

  select id into active_cart_id
  from public.carts
  where user_id = demo_user_id and status = 'active'
  limit 1;

  if active_cart_id is null then
    insert into public.carts (user_id, status, currency)
    values (demo_user_id, 'active', 'VND')
    returning id into active_cart_id;
  end if;

  if target_variant_id is not null then
    select coalesce(sale_price, price), stock
    into selected_price, selected_stock
    from public.product_variants
    where id = target_variant_id
      and product_id = target_product_id;
  else
    select coalesce(sale_price, price), stock
    into selected_price, selected_stock
    from public.products
    where id = target_product_id
      and status = 'active';
  end if;

  if selected_price is null then
    raise exception 'Product or variant not found';
  end if;

  if selected_stock < 1 then
    raise exception 'Selected variant is out of stock';
  end if;

  insert into public.cart_items (
    cart_id,
    product_id,
    variant_id,
    quantity,
    unit_price
  )
  values (
    active_cart_id,
    target_product_id,
    target_variant_id,
    1,
    selected_price
  )
  on conflict (
    cart_id,
    product_id,
    (coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  )
  do update set
    quantity = public.cart_items.quantity + 1,
    unit_price = excluded.unit_price;

  return public.get_demo_marketplace_state();
end;
$$;

create or replace function public.toggle_demo_wishlist(target_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_user_id uuid;
begin
  select id into demo_user_id
  from public.users
  where email = 'linh.nguyen@stylehub.demo';

  if demo_user_id is null then
    raise exception 'Demo buyer is not configured';
  end if;

  if exists (
    select 1
    from public.wishlists
    where user_id = demo_user_id
      and product_id = target_product_id
  ) then
    delete from public.wishlists
    where user_id = demo_user_id
      and product_id = target_product_id;
  else
    insert into public.wishlists (user_id, product_id)
    values (demo_user_id, target_product_id);
  end if;

  return public.get_demo_marketplace_state();
end;
$$;

revoke all on function public.get_demo_marketplace_state() from public;
revoke all on function public.add_demo_cart_item(uuid, uuid) from public;
revoke all on function public.toggle_demo_wishlist(uuid) from public;

grant execute on function public.get_demo_marketplace_state() to anon, authenticated;
grant execute on function public.add_demo_cart_item(uuid, uuid) to anon, authenticated;
grant execute on function public.toggle_demo_wishlist(uuid) to anon, authenticated;
