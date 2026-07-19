-- Phase 10 — atomic checkout, idempotent order creation, inventory ledger,
-- and exactly-once cancellation restocking.
--
-- The live StyleHub schema intentionally retains the Lab 7 legacy order
-- column names. This migration is additive and targets that committed/live
-- shape without rewriting historical orders.

alter table public.products
  add column if not exists inventory_mode text;

update public.products p
set inventory_mode = case
  when exists (
    select 1 from public.product_variants pv where pv.product_id = p.id
  ) then 'variant'
  else 'simple'
end
where p.inventory_mode is null;

alter table public.products
  alter column inventory_mode set default 'simple',
  alter column inventory_mode set not null;

alter table public.products
  drop constraint if exists products_inventory_mode_check;
alter table public.products
  add constraint products_inventory_mode_check
  check (inventory_mode in ('simple', 'variant'));

alter table public.order_items
  add column if not exists seller_id uuid,
  add column if not exists variant_name text,
  add column if not exists inventory_consumed_at timestamptz,
  add column if not exists inventory_restored_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists product_auto_sold boolean not null default false,
  add column if not exists variant_auto_sold boolean not null default false;

update public.order_items oi
set seller_id = p.seller_id
from public.products p
where oi.product_id = p.id
  and oi.seller_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_seller_id_fkey'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_seller_id_fkey
      foreign key (seller_id) references public.users(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_cancelled_by_fkey'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_cancelled_by_fkey
      foreign key (cancelled_by) references public.users(id) on delete set null;
  end if;
end;
$$;

create index if not exists order_items_seller_id_idx
  on public.order_items(seller_id);
create index if not exists order_items_order_seller_idx
  on public.order_items(order_id, seller_id);

create unique index if not exists orders_order_code_unique_idx
  on public.orders(order_code)
  where order_code is not null;

create table if not exists public.checkout_idempotency (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users(id) on delete restrict,
  idempotency_key uuid not null,
  request_fingerprint text not null,
  order_id uuid references public.orders(id) on delete restrict,
  response_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (buyer_id, idempotency_key),
  check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  check (
    (order_id is null and response_payload is null and completed_at is null)
    or
    (order_id is not null and response_payload is not null and completed_at is not null)
  )
);

create index if not exists checkout_idempotency_order_idx
  on public.checkout_idempotency(order_id);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  movement_kind text not null check (movement_kind in ('sale', 'restock')),
  reason text not null check (reason in (
    'checkout_sale',
    'buyer_cancellation',
    'seller_cancellation',
    'admin_cancellation'
  )),
  quantity_delta integer not null check (quantity_delta <> 0),
  idempotency_key uuid,
  actor_id uuid references public.users(id) on delete set null,
  actor_type text not null check (actor_type in ('buyer', 'seller', 'admin', 'system')),
  created_at timestamptz not null default now(),
  unique (order_item_id, movement_kind)
);

create index if not exists inventory_movements_product_idx
  on public.inventory_movements(product_id, created_at desc);
create index if not exists inventory_movements_variant_idx
  on public.inventory_movements(variant_id, created_at desc)
  where variant_id is not null;
create index if not exists inventory_movements_order_idx
  on public.inventory_movements(order_id, created_at);

alter table public.checkout_idempotency enable row level security;
alter table public.inventory_movements enable row level security;

revoke all on table public.checkout_idempotency from public, anon, authenticated;
revoke all on table public.inventory_movements from public, anon, authenticated;
grant all on table public.checkout_idempotency to service_role;
grant all on table public.inventory_movements to service_role;

create or replace function public.stylehub_checkout_quote(
  p_buyer_id uuid,
  p_items jsonb,
  p_coupon_code text default null,
  p_enforce_expected_prices boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_coupon public.coupons%rowtype;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_expected_price numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_available integer;
  v_variant_name text;
  v_items_out jsonb := '[]'::jsonb;
  v_price_changes jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_shipping_fee numeric := 0;
  v_discount_amount numeric := 0;
  v_total_amount numeric := 0;
  v_normalized_coupon text;
begin
  if p_buyer_id is null then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'AUTH_REQUIRED',
      'message', 'Vui lòng đăng nhập để tiếp tục.'
    )::text;
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 100 then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_CHECKOUT_PAYLOAD',
      'message', 'Giỏ hàng không hợp lệ.'
    )::text;
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'productId')::uuid;
      v_variant_id := nullif(v_item ->> 'variantId', '')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
      v_expected_price := nullif(v_item ->> 'expectedUnitPrice', '')::numeric;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = 'P0001', message = jsonb_build_object(
          'code', 'INVALID_CHECKOUT_PAYLOAD',
          'message', 'Thông tin sản phẩm trong giỏ hàng không hợp lệ.'
        )::text;
    end;

    if v_product_id is null or v_quantity is null or v_quantity < 1 or v_quantity > 999 then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'INVALID_CHECKOUT_PAYLOAD',
        'message', 'Số lượng sản phẩm không hợp lệ.'
      )::text;
    end if;

    select p.*
    into v_product
    from public.products p
    where p.id = v_product_id;

    if not found then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'PRODUCT_UNAVAILABLE',
        'message', 'Sản phẩm không còn khả dụng.',
        'details', jsonb_build_object('productId', v_product_id)
      )::text;
    end if;

    if v_product.status <> 'active' then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'PRODUCT_UNAVAILABLE',
        'message', 'Sản phẩm vừa hết hàng hoặc không còn được bán.',
        'details', jsonb_build_object(
          'productId', v_product.id,
          'productName', v_product.name,
          'status', v_product.status
        )
      )::text;
    end if;

    if v_product.seller_id is null then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'PRODUCT_UNAVAILABLE',
        'message', 'Sản phẩm chưa có thông tin người bán hợp lệ.',
        'details', jsonb_build_object('productId', v_product.id, 'productName', v_product.name)
      )::text;
    end if;

    if v_product.seller_id = p_buyer_id then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'SELF_PURCHASE_NOT_ALLOWED',
        'message', 'Không thể mua sản phẩm do chính bạn đăng bán.',
        'details', jsonb_build_object('productId', v_product.id, 'productName', v_product.name)
      )::text;
    end if;

    v_variant_name := null;

    if v_product.inventory_mode = 'variant' then
      if v_variant_id is null then
        raise exception using errcode = 'P0001', message = jsonb_build_object(
          'code', 'INVALID_VARIANT',
          'message', 'Vui lòng chọn phân loại sản phẩm hợp lệ.',
          'details', jsonb_build_object('productId', v_product.id, 'productName', v_product.name)
        )::text;
      end if;

      select pv.*
      into v_variant
      from public.product_variants pv
      where pv.id = v_variant_id
        and pv.product_id = v_product.id;

      if not found or v_variant.status <> 'active' then
        raise exception using errcode = 'P0001', message = jsonb_build_object(
          'code', 'INVALID_VARIANT',
          'message', 'Phân loại sản phẩm không còn khả dụng.',
          'details', jsonb_build_object(
            'productId', v_product.id,
            'variantId', v_variant_id,
            'productName', v_product.name
          )
        )::text;
      end if;

      v_available := v_variant.stock;
      v_unit_price := case
        when v_variant.sale_price is not null
          and v_variant.sale_price >= 0
          and v_variant.sale_price < v_variant.price
        then v_variant.sale_price
        else v_variant.price
      end;
      v_variant_name := v_variant.title;
    else
      if v_variant_id is not null then
        raise exception using errcode = 'P0001', message = jsonb_build_object(
          'code', 'INVALID_VARIANT',
          'message', 'Phân loại sản phẩm không hợp lệ.',
          'details', jsonb_build_object(
            'productId', v_product.id,
            'variantId', v_variant_id,
            'productName', v_product.name
          )
        )::text;
      end if;

      v_available := v_product.stock;
      v_unit_price := case
        when v_product.sale_price is not null
          and v_product.sale_price >= 0
          and v_product.sale_price < v_product.price
        then v_product.sale_price
        else v_product.price
      end;
    end if;

    if v_available < v_quantity then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'INSUFFICIENT_STOCK',
        'message', 'Sản phẩm vừa hết hàng hoặc không còn đủ số lượng.',
        'details', jsonb_build_object(
          'productId', v_product.id,
          'variantId', v_variant_id,
          'productName', v_product.name,
          'requestedQuantity', v_quantity,
          'availableQuantity', greatest(v_available, 0)
        )
      )::text;
    end if;

    if v_expected_price is not null and v_expected_price <> v_unit_price then
      if p_enforce_expected_prices then
        raise exception using errcode = 'P0001', message = jsonb_build_object(
          'code', 'PRICE_CHANGED',
          'message', 'Giá sản phẩm đã thay đổi. Vui lòng kiểm tra lại đơn hàng.',
          'details', jsonb_build_object(
            'productId', v_product.id,
            'variantId', v_variant_id,
            'productName', v_product.name,
            'expectedUnitPrice', v_expected_price,
            'authoritativeUnitPrice', v_unit_price
          )
        )::text;
      end if;

      v_price_changes := v_price_changes || jsonb_build_array(jsonb_build_object(
        'productId', v_product.id,
        'variantId', v_variant_id,
        'productName', v_product.name,
        'expectedUnitPrice', v_expected_price,
        'authoritativeUnitPrice', v_unit_price
      ));
    end if;

    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'variantId', v_variant_id,
      'sellerId', v_product.seller_id,
      'productName', v_product.name,
      'productSlug', v_product.slug,
      'variantName', v_variant_name,
      'sku', case when v_variant_id is null then null else v_variant.sku end,
      'size', coalesce(v_variant_name, v_product.size),
      'condition', v_product.condition,
      'imageUrl', coalesce(v_product.thumbnail, v_product.image_url),
      'inventoryMode', v_product.inventory_mode,
      'unitPrice', v_unit_price,
      'quantity', v_quantity,
      'lineTotal', v_line_total,
      'availableQuantity', v_available
    ));
  end loop;

  v_shipping_fee := case when v_subtotal > 500000 or v_subtotal = 0 then 0 else 30000 end;
  v_normalized_coupon := upper(nullif(btrim(p_coupon_code), ''));

  if v_normalized_coupon is not null then
    select c.*
    into v_coupon
    from public.coupons c
    where c.code = v_normalized_coupon;

    if not found
      or not v_coupon.is_active
      or v_coupon.starts_at > clock_timestamp()
      or (v_coupon.expires_at is not null and v_coupon.expires_at <= clock_timestamp()) then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'COUPON_INVALID',
        'message', 'Mã giảm giá không hợp lệ hoặc đã hết hạn.'
      )::text;
    end if;

    if v_coupon.minimum_order_amount is not null
       and v_subtotal < v_coupon.minimum_order_amount then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'COUPON_INVALID',
        'message', 'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã giảm giá.',
        'details', jsonb_build_object('minimumOrderAmount', v_coupon.minimum_order_amount)
      )::text;
    end if;

    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'COUPON_LIMIT_REACHED',
        'message', 'Mã giảm giá đã hết lượt sử dụng.'
      )::text;
    end if;

    v_discount_amount := case v_coupon.discount_type
      when 'percentage' then least(
        round(v_subtotal * (v_coupon.discount_value / 100.0), 2),
        coalesce(v_coupon.maximum_discount_amount, round(v_subtotal * (v_coupon.discount_value / 100.0), 2))
      )
      when 'fixed' then least(v_coupon.discount_value, v_subtotal + v_shipping_fee)
      when 'free_shipping' then v_shipping_fee
      else 0
    end;
  end if;

  v_total_amount := greatest(0, v_subtotal + v_shipping_fee - v_discount_amount);

  return jsonb_build_object(
    'items', v_items_out,
    'subtotal', v_subtotal,
    'shippingFee', v_shipping_fee,
    'discountAmount', v_discount_amount,
    'totalAmount', v_total_amount,
    'priceChanges', v_price_changes,
    'requiresReview', jsonb_array_length(v_price_changes) > 0,
    'coupon', case
      when v_normalized_coupon is null then null
      else jsonb_build_object(
        'id', v_coupon.id,
        'code', v_coupon.code,
        'discountType', v_coupon.discount_type,
        'discountValue', v_coupon.discount_value
      )
    end
  );
end;
$$;

create or replace function public.stylehub_checkout_atomic(
  p_buyer_id uuid,
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_customer jsonb,
  p_payment_method text,
  p_notes text,
  p_coupon_code text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_idempotency public.checkout_idempotency%rowtype;
  v_quote jsonb;
  v_item jsonb;
  v_customer_name text := btrim(coalesce(p_customer ->> 'name', ''));
  v_customer_email text := lower(btrim(coalesce(p_customer ->> 'email', '')));
  v_customer_phone text := btrim(coalesce(p_customer ->> 'phone', ''));
  v_customer_address text := btrim(coalesce(p_customer ->> 'address', ''));
  v_customer_city text := btrim(coalesce(p_customer ->> 'city', ''));
  v_order_id uuid := gen_random_uuid();
  v_order_item_id uuid;
  v_order_code text;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_remaining_stock integer;
  v_product_auto_sold boolean;
  v_variant_auto_sold boolean;
  v_coupon_id uuid;
  v_response_items jsonb := '[]'::jsonb;
  v_response jsonb;
begin
  if p_idempotency_key is null
     or p_request_fingerprint is null
     or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_IDEMPOTENCY_KEY',
      'message', 'Khóa chống trùng lặp không hợp lệ.'
    )::text;
  end if;

  insert into public.checkout_idempotency (
    buyer_id,
    idempotency_key,
    request_fingerprint
  ) values (
    p_buyer_id,
    p_idempotency_key,
    p_request_fingerprint
  )
  on conflict (buyer_id, idempotency_key) do nothing;

  select ci.*
  into v_idempotency
  from public.checkout_idempotency ci
  where ci.buyer_id = p_buyer_id
    and ci.idempotency_key = p_idempotency_key
  for update;

  if v_idempotency.request_fingerprint <> p_request_fingerprint then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'CHECKOUT_IDEMPOTENCY_CONFLICT',
      'message', 'Khóa yêu cầu đã được dùng cho một giỏ hàng khác.'
    )::text;
  end if;

  if v_idempotency.order_id is not null then
    return v_idempotency.response_payload || jsonb_build_object(
      'idempotentReplay', true,
      'message', 'Yêu cầu này đã được xử lý trước đó.'
    );
  end if;

  if length(v_customer_name) < 2
     or v_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or v_customer_phone !~ '^0[0-9]{9}$'
     or v_customer_address = ''
     or v_customer_city = '' then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_CHECKOUT_PAYLOAD',
      'message', 'Thông tin giao hàng không hợp lệ.'
    )::text;
  end if;

  if p_payment_method not in ('cod', 'bank_transfer') then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_CHECKOUT_PAYLOAD',
      'message', 'Phương thức thanh toán không hợp lệ.'
    )::text;
  end if;

  -- Lock inventory rows in one deterministic order for every checkout.
  perform p.id
  from public.products p
  join (
    select distinct (value ->> 'productId')::uuid as id
    from jsonb_array_elements(p_items)
  ) requested on requested.id = p.id
  order by p.id
  for update of p;

  perform pv.id
  from public.product_variants pv
  join (
    select distinct nullif(value ->> 'variantId', '')::uuid as id
    from jsonb_array_elements(p_items)
    where nullif(value ->> 'variantId', '') is not null
  ) requested on requested.id = pv.id
  order by pv.id
  for update of pv;

  if nullif(btrim(p_coupon_code), '') is not null then
    perform c.id
    from public.coupons c
    where c.code = upper(btrim(p_coupon_code))
    for update;
  end if;

  v_quote := public.stylehub_checkout_quote(
    p_buyer_id,
    p_items,
    p_coupon_code,
    true
  );

  -- UUID material makes collisions negligible; the unique index remains the
  -- final database guard.
  v_order_code := 'SH'
    || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDD')
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders (
    id,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    customer_city,
    payment_method,
    total_amount,
    status,
    order_code,
    user_id,
    shipping_address,
    city,
    subtotal,
    shipping_fee,
    discount_amount,
    notes
  ) values (
    v_order_id,
    v_customer_name,
    v_customer_email,
    v_customer_phone,
    v_customer_address,
    v_customer_city,
    p_payment_method,
    (v_quote ->> 'totalAmount')::numeric,
    'pending',
    v_order_code,
    p_buyer_id,
    v_customer_address,
    v_customer_city,
    (v_quote ->> 'subtotal')::numeric,
    (v_quote ->> 'shippingFee')::numeric,
    (v_quote ->> 'discountAmount')::numeric,
    nullif(btrim(p_notes), '')
  );

  for v_item in
    select value from jsonb_array_elements(v_quote -> 'items')
  loop
    v_order_item_id := gen_random_uuid();
    v_product_id := (v_item ->> 'productId')::uuid;
    v_variant_id := nullif(v_item ->> 'variantId', '')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_product_auto_sold := false;
    v_variant_auto_sold := false;

    if (v_item ->> 'inventoryMode') = 'variant' then
      update public.product_variants
      set stock = stock - v_quantity,
          status = case when stock - v_quantity = 0 then 'sold_out' else status end,
          updated_at = clock_timestamp()
      where id = v_variant_id
        and product_id = v_product_id
        and status = 'active'
        and stock >= v_quantity
      returning stock into v_remaining_stock;

      if not found then
        raise exception using errcode = 'P0001', message = jsonb_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'message', 'Sản phẩm vừa hết hàng hoặc không còn đủ số lượng.',
          'details', jsonb_build_object('productId', v_product_id, 'variantId', v_variant_id)
        )::text;
      end if;

      v_variant_auto_sold := v_remaining_stock = 0;

      select not exists (
        select 1
        from public.product_variants pv
        where pv.product_id = v_product_id
          and pv.status = 'active'
          and pv.stock > 0
      ) into v_product_auto_sold;

      if v_product_auto_sold then
        update public.products
        set status = 'sold', updated_at = clock_timestamp()
        where id = v_product_id and status = 'active';
      end if;
    else
      update public.products
      set stock = stock - v_quantity,
          status = case when stock - v_quantity = 0 then 'sold' else status end,
          updated_at = clock_timestamp()
      where id = v_product_id
        and status = 'active'
        and stock >= v_quantity
      returning stock into v_remaining_stock;

      if not found then
        raise exception using errcode = 'P0001', message = jsonb_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'message', 'Sản phẩm vừa hết hàng hoặc không còn đủ số lượng.',
          'details', jsonb_build_object('productId', v_product_id)
        )::text;
      end if;

      v_product_auto_sold := v_remaining_stock = 0;
    end if;

    insert into public.order_items (
      id,
      order_id,
      product_id,
      variant_id,
      seller_id,
      product_name,
      product_slug,
      variant_name,
      image_url,
      sku,
      size,
      condition,
      price,
      unit_price,
      quantity,
      line_total,
      fulfillment_status,
      inventory_consumed_at,
      product_auto_sold,
      variant_auto_sold
    ) values (
      v_order_item_id,
      v_order_id,
      v_product_id,
      v_variant_id,
      (v_item ->> 'sellerId')::uuid,
      v_item ->> 'productName',
      v_item ->> 'productSlug',
      nullif(v_item ->> 'variantName', ''),
      nullif(v_item ->> 'imageUrl', ''),
      nullif(v_item ->> 'sku', ''),
      nullif(v_item ->> 'size', ''),
      nullif(v_item ->> 'condition', ''),
      (v_item ->> 'unitPrice')::numeric,
      (v_item ->> 'unitPrice')::numeric,
      v_quantity,
      (v_item ->> 'lineTotal')::numeric,
      'awaiting_confirmation',
      clock_timestamp(),
      v_product_auto_sold,
      v_variant_auto_sold
    );

    insert into public.inventory_movements (
      product_id,
      variant_id,
      order_id,
      order_item_id,
      movement_kind,
      reason,
      quantity_delta,
      idempotency_key,
      actor_id,
      actor_type
    ) values (
      v_product_id,
      v_variant_id,
      v_order_id,
      v_order_item_id,
      'sale',
      'checkout_sale',
      -v_quantity,
      p_idempotency_key,
      p_buyer_id,
      'buyer'
    );

    v_response_items := v_response_items || jsonb_build_array(jsonb_build_object(
      'id', v_order_item_id,
      'productId', v_product_id,
      'variantId', v_variant_id,
      'productName', v_item ->> 'productName',
      'variantName', nullif(v_item ->> 'variantName', ''),
      'imageUrl', nullif(v_item ->> 'imageUrl', ''),
      'unitPrice', (v_item ->> 'unitPrice')::numeric,
      'quantity', v_quantity,
      'lineTotal', (v_item ->> 'lineTotal')::numeric,
      'fulfillmentStatus', 'awaiting_confirmation'
    ));
  end loop;

  if v_quote -> 'coupon' is not null and jsonb_typeof(v_quote -> 'coupon') <> 'null' then
    v_coupon_id := (v_quote -> 'coupon' ->> 'id')::uuid;

    update public.coupons
    set used_count = used_count + 1,
        updated_at = clock_timestamp()
    where id = v_coupon_id
      and (usage_limit is null or used_count < usage_limit);

    if not found then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'COUPON_LIMIT_REACHED',
        'message', 'Mã giảm giá đã hết lượt sử dụng.'
      )::text;
    end if;

    insert into public.order_coupons (order_id, coupon_id, discount_amount)
    values (v_order_id, v_coupon_id, (v_quote ->> 'discountAmount')::numeric);
  end if;

  v_response := jsonb_build_object(
    'id', v_order_id,
    'orderCode', v_order_code,
    'status', 'pending',
    'paymentMethod', p_payment_method,
    'subtotal', (v_quote ->> 'subtotal')::numeric,
    'shippingFee', (v_quote ->> 'shippingFee')::numeric,
    'discountAmount', (v_quote ->> 'discountAmount')::numeric,
    'totalAmount', (v_quote ->> 'totalAmount')::numeric,
    'items', v_response_items,
    'idempotentReplay', false
  );

  update public.checkout_idempotency
  set order_id = v_order_id,
      response_payload = v_response,
      completed_at = clock_timestamp()
  where id = v_idempotency.id;

  return v_response;
end;
$$;

create or replace function public.stylehub_recompute_order_status(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_total integer;
  v_cancelled integer;
  v_completed integer;
  v_in_progress integer;
  v_status text;
begin
  select
    count(*)::integer,
    count(*) filter (where fulfillment_status = 'cancelled')::integer,
    count(*) filter (where fulfillment_status = 'completed')::integer,
    count(*) filter (where fulfillment_status in ('confirmed', 'preparing', 'shipped', 'completed'))::integer
  into v_total, v_cancelled, v_completed, v_in_progress
  from public.order_items
  where order_id = p_order_id;

  v_status := case
    when v_total = 0 then 'pending'
    when v_cancelled = v_total then 'cancelled'
    when v_completed + v_cancelled = v_total and v_completed > 0 then 'completed'
    when v_in_progress > 0 then 'processing'
    else 'pending'
  end;

  update public.orders
  set status = v_status,
      updated_at = clock_timestamp()
  where id = p_order_id;

  return v_status;
end;
$$;

create or replace function public.stylehub_restock_order_item(
  p_order_item_id uuid,
  p_actor_id uuid,
  p_actor_type text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item public.order_items%rowtype;
  v_existing_movement public.inventory_movements%rowtype;
  v_variant_status text;
begin
  select oi.*
  into v_item
  from public.order_items oi
  where oi.id = p_order_item_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ORDER_NOT_FOUND',
      'message', 'Không tìm thấy mục đơn hàng.'
    )::text;
  end if;

  if v_item.inventory_consumed_at is null then
    return jsonb_build_object('restored', false, 'legacyItem', true);
  end if;

  if v_item.inventory_restored_at is not null then
    return jsonb_build_object('restored', false, 'alreadyRestored', true);
  end if;

  select im.*
  into v_existing_movement
  from public.inventory_movements im
  where im.order_item_id = v_item.id
    and im.movement_kind = 'restock'
  for update;

  if found then
    update public.order_items
    set inventory_restored_at = coalesce(inventory_restored_at, v_existing_movement.created_at)
    where id = v_item.id;
    return jsonb_build_object('restored', false, 'alreadyRestored', true);
  end if;

  -- Product then variant lock order matches checkout and prevents deadlocks.
  perform p.id
  from public.products p
  where p.id = v_item.product_id
  for update;

  if v_item.variant_id is not null then
    perform pv.id
    from public.product_variants pv
    where pv.id = v_item.variant_id
    for update;

    update public.product_variants
    set stock = stock + v_item.quantity,
        status = case
          when v_item.variant_auto_sold and status = 'sold_out' then 'active'
          else status
        end,
        updated_at = clock_timestamp()
    where id = v_item.variant_id
      and product_id = v_item.product_id
    returning status into v_variant_status;

    if not found then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'INVENTORY_RESTORE_FAILED',
        'message', 'Không thể hoàn lại tồn kho cho phân loại sản phẩm.'
      )::text;
    end if;

    if v_item.product_auto_sold then
      update public.products
      set status = case when status = 'sold' then 'active' else status end,
          updated_at = clock_timestamp()
      where id = v_item.product_id;
    end if;
  else
    update public.products
    set stock = stock + v_item.quantity,
        status = case
          when v_item.product_auto_sold and status = 'sold' then 'active'
          else status
        end,
        updated_at = clock_timestamp()
    where id = v_item.product_id;

    if not found then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'INVENTORY_RESTORE_FAILED',
        'message', 'Không thể hoàn lại tồn kho cho sản phẩm.'
      )::text;
    end if;
  end if;

  insert into public.inventory_movements (
    product_id,
    variant_id,
    order_id,
    order_item_id,
    movement_kind,
    reason,
    quantity_delta,
    actor_id,
    actor_type
  ) values (
    v_item.product_id,
    v_item.variant_id,
    v_item.order_id,
    v_item.id,
    'restock',
    p_reason,
    v_item.quantity,
    p_actor_id,
    p_actor_type
  );

  update public.order_items
  set inventory_restored_at = clock_timestamp()
  where id = v_item.id;

  return jsonb_build_object('restored', true, 'alreadyRestored', false);
end;
$$;

create or replace function public.stylehub_transition_order_item(
  p_seller_id uuid,
  p_order_item_id uuid,
  p_next_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item public.order_items%rowtype;
  v_order_status text;
  v_restock jsonb := jsonb_build_object('restored', false);
begin
  select oi.*
  into v_item
  from public.order_items oi
  where oi.id = p_order_item_id
  for update;

  if not found or v_item.seller_id is distinct from p_seller_id then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ORDER_NOT_FOUND',
      'message', 'Không tìm thấy mục đơn hàng.'
    )::text;
  end if;

  if p_next_status not in ('awaiting_confirmation', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled') then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_FULFILLMENT_STATUS',
      'message', 'Trạng thái xử lý không hợp lệ.'
    )::text;
  end if;

  if v_item.fulfillment_status = p_next_status then
    if p_next_status = 'cancelled' then
      v_restock := public.stylehub_restock_order_item(
        v_item.id,
        p_seller_id,
        'seller',
        'seller_cancellation'
      );
    end if;
    return jsonb_build_object(
      'id', v_item.id,
      'orderId', v_item.order_id,
      'productId', v_item.product_id,
      'fulfillmentStatus', v_item.fulfillment_status,
      'idempotentReplay', true,
      'inventory', v_restock
    );
  end if;

  if not (
    (v_item.fulfillment_status = 'awaiting_confirmation' and p_next_status in ('confirmed', 'cancelled'))
    or (v_item.fulfillment_status = 'confirmed' and p_next_status in ('preparing', 'cancelled'))
    or (v_item.fulfillment_status = 'preparing' and p_next_status in ('shipped', 'cancelled'))
    or (v_item.fulfillment_status = 'shipped' and p_next_status = 'completed')
  ) then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ORDER_NOT_CANCELLABLE',
      'message', 'Không thể chuyển mục đơn hàng từ trạng thái hiện tại.'
    )::text;
  end if;

  if p_next_status = 'cancelled' then
    v_restock := public.stylehub_restock_order_item(
      v_item.id,
      p_seller_id,
      'seller',
      'seller_cancellation'
    );
  end if;

  update public.order_items
  set fulfillment_status = p_next_status,
      cancelled_at = case when p_next_status = 'cancelled' then clock_timestamp() else cancelled_at end,
      cancelled_by = case when p_next_status = 'cancelled' then p_seller_id else cancelled_by end
  where id = v_item.id;

  v_order_status := public.stylehub_recompute_order_status(v_item.order_id);

  return jsonb_build_object(
    'id', v_item.id,
    'orderId', v_item.order_id,
    'productId', v_item.product_id,
    'fulfillmentStatus', p_next_status,
    'orderStatus', v_order_status,
    'idempotentReplay', false,
    'inventory', v_restock
  );
end;
$$;

create or replace function public.stylehub_cancel_order(
  p_actor_id uuid,
  p_actor_role text,
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_actor_type text;
  v_reason text;
  v_order_status text;
  v_restored_count integer := 0;
  v_cancelled_count integer := 0;
  v_restock jsonb;
begin
  select o.*
  into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found
     or (p_actor_role <> 'admin' and v_order.user_id is distinct from p_actor_id) then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ORDER_NOT_FOUND',
      'message', 'Không tìm thấy đơn hàng.'
    )::text;
  end if;

  if p_actor_role = 'admin' then
    v_actor_type := 'admin';
    v_reason := 'admin_cancellation';
  else
    v_actor_type := 'buyer';
    v_reason := 'buyer_cancellation';
  end if;

  -- Lock every child before checking eligibility so the decision and all
  -- restocks belong to one transaction.
  perform oi.id
  from public.order_items oi
  where oi.order_id = p_order_id
  order by oi.id
  for update of oi;

  if exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.fulfillment_status not in ('awaiting_confirmation', 'confirmed', 'preparing', 'cancelled')
  ) then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ORDER_NOT_CANCELLABLE',
      'message', 'Đơn hàng đã được giao đi hoặc hoàn tất nên không thể hủy.'
    )::text;
  end if;

  for v_item in
    select oi.*
    from public.order_items oi
    where oi.order_id = p_order_id
    order by oi.id
  loop
    if v_item.fulfillment_status = 'cancelled' then
      v_restock := public.stylehub_restock_order_item(
        v_item.id,
        p_actor_id,
        v_actor_type,
        v_reason
      );
    else
      v_restock := public.stylehub_restock_order_item(
        v_item.id,
        p_actor_id,
        v_actor_type,
        v_reason
      );

      update public.order_items
      set fulfillment_status = 'cancelled',
          cancelled_at = clock_timestamp(),
          cancelled_by = p_actor_id
      where id = v_item.id;
      v_cancelled_count := v_cancelled_count + 1;
    end if;

    if coalesce((v_restock ->> 'restored')::boolean, false) then
      v_restored_count := v_restored_count + 1;
    end if;
  end loop;

  v_order_status := public.stylehub_recompute_order_status(p_order_id);

  return jsonb_build_object(
    'id', p_order_id,
    'orderCode', v_order.order_code,
    'status', v_order_status,
    'cancelledItems', v_cancelled_count,
    'restoredItems', v_restored_count,
    'idempotentReplay', v_cancelled_count = 0 and v_restored_count = 0,
    'message', 'Đơn hàng đã được hủy và số lượng sản phẩm đã được hoàn lại.'
  );
end;
$$;

revoke all on function public.stylehub_checkout_quote(uuid, jsonb, text, boolean)
  from public, anon, authenticated;
revoke all on function public.stylehub_checkout_atomic(uuid, uuid, text, jsonb, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.stylehub_recompute_order_status(uuid)
  from public, anon, authenticated;
revoke all on function public.stylehub_restock_order_item(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.stylehub_transition_order_item(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.stylehub_cancel_order(uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public.stylehub_checkout_quote(uuid, jsonb, text, boolean)
  to service_role;
grant execute on function public.stylehub_checkout_atomic(uuid, uuid, text, jsonb, text, text, text, jsonb)
  to service_role;
grant execute on function public.stylehub_recompute_order_status(uuid)
  to service_role;
grant execute on function public.stylehub_restock_order_item(uuid, uuid, text, text)
  to service_role;
grant execute on function public.stylehub_transition_order_item(uuid, uuid, text)
  to service_role;
grant execute on function public.stylehub_cancel_order(uuid, text, uuid)
  to service_role;
