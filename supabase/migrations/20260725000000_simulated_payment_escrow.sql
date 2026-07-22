-- Phase 2 — simulated-card payment and escrow foundation.
--
-- Academic simulation only: no bank authorization, transfer, payout, or real
-- refund occurs. All VND values introduced here are integer bigint amounts.
-- The platform fee is a single database-owned policy of 1,000 basis points
-- (10%). Seller gross and fee remainders are assigned by largest fractional
-- remainder, then seller UUID ascending, so multi-seller allocation is exact
-- and deterministic without losing or creating one VND.

alter table public.payments
  add column if not exists buyer_id uuid references public.users(id) on delete restrict,
  add column if not exists payment_method text,
  add column if not exists state text,
  add column if not exists gross_amount bigint,
  add column if not exists platform_fee_total bigint,
  add column if not exists seller_amount_total bigint,
  add column if not exists card_brand text,
  add column if not exists card_last_four text,
  add column if not exists checkout_idempotency_id uuid references public.checkout_idempotency(id) on delete restrict,
  add column if not exists version integer not null default 1,
  add column if not exists held_at timestamptz,
  add column if not exists refunded_at timestamptz;

update public.payments p
set buyer_id = o.user_id
from public.orders o
where o.id = p.order_id
  and p.buyer_id is null;

alter table public.payments drop constraint if exists payments_state_check;
alter table public.payments add constraint payments_state_check
  check (state is null or state in ('pending', 'held', 'failed', 'refunded', 'released', 'disputed'));
alter table public.payments drop constraint if exists payments_payment_method_check;
alter table public.payments add constraint payments_payment_method_check
  check (payment_method is null or payment_method = 'simulated_card');
alter table public.payments drop constraint if exists payments_integer_amounts_check;
alter table public.payments add constraint payments_integer_amounts_check check (
  payment_method is distinct from 'simulated_card'
  or (
    gross_amount >= 0
    and platform_fee_total >= 0
    and seller_amount_total >= 0
    and amount = gross_amount
    and trunc(amount) = amount
  )
);
alter table public.payments drop constraint if exists payments_amount_reconciliation_check;
alter table public.payments add constraint payments_amount_reconciliation_check
  check (payment_method is distinct from 'simulated_card' or gross_amount = platform_fee_total + seller_amount_total);
alter table public.payments drop constraint if exists payments_safe_card_check;
alter table public.payments add constraint payments_safe_card_check check (
  payment_method is distinct from 'simulated_card'
  or (
    provider = 'stylehub_simulation'
    and buyer_id is not null
    and state is not null
    and currency = 'VND'
    and card_brand in ('visa', 'mastercard', 'amex')
    and card_last_four ~ '^[0-9]{4}$'
    and checkout_idempotency_id is not null
    and metadata = '{}'::jsonb
  )
);
alter table public.payments drop constraint if exists payments_version_check;
alter table public.payments add constraint payments_version_check check (version >= 1);
alter table public.payments drop constraint if exists payments_state_timestamps_check;
alter table public.payments add constraint payments_state_timestamps_check check (
  payment_method is distinct from 'simulated_card'
  or (
    (state <> 'held' or held_at is not null)
    and (state <> 'refunded' or refunded_at is not null)
  )
);

-- Abort rather than silently rewriting legacy duplicates. The active project
-- was inspected before this migration and had no duplicate payment order IDs.
create unique index if not exists payments_one_per_order_idx
  on public.payments(order_id);
create unique index if not exists payments_checkout_idempotency_unique_idx
  on public.payments(checkout_idempotency_id)
  where checkout_idempotency_id is not null;
create index if not exists payments_buyer_created_idx
  on public.payments(buyer_id, created_at desc)
  where buyer_id is not null;
create index if not exists payments_state_created_idx
  on public.payments(state, created_at desc)
  where state is not null;

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete restrict,
  gross_amount bigint not null check (gross_amount >= 0),
  platform_fee bigint not null check (platform_fee >= 0),
  seller_net_amount bigint not null check (seller_net_amount >= 0),
  state text not null check (state in ('held', 'refunded', 'released', 'disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payment_id, seller_id),
  check (gross_amount = platform_fee + seller_net_amount)
);

create index if not exists payment_allocations_order_idx
  on public.payment_allocations(order_id);
create index if not exists payment_allocations_seller_state_idx
  on public.payment_allocations(seller_id, state, created_at desc);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  previous_state text check (previous_state is null or previous_state in ('pending', 'held', 'failed', 'refunded', 'released', 'disputed')),
  new_state text not null check (new_state in ('pending', 'held', 'failed', 'refunded', 'released', 'disputed')),
  event_type text not null check (event_type in ('payment_held', 'payment_failed', 'payment_refunded', 'payment_released', 'payment_disputed')),
  actor_type text not null check (actor_type in ('buyer', 'admin', 'system')),
  actor_id uuid references public.users(id) on delete set null,
  reason text,
  safe_metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (payment_id, idempotency_key),
  check (jsonb_typeof(safe_metadata) = 'object'),
  check (length(idempotency_key) between 1 and 200)
);

create unique index if not exists payment_events_one_held_event_idx
  on public.payment_events(payment_id)
  where event_type = 'payment_held';
create unique index if not exists payment_events_one_refund_event_idx
  on public.payment_events(payment_id)
  where event_type = 'payment_refunded';
create index if not exists payment_events_payment_created_idx
  on public.payment_events(payment_id, created_at);

alter table public.payment_allocations enable row level security;
alter table public.payment_events enable row level security;
alter table public.payments enable row level security;
revoke all on table public.payments from public, anon, authenticated;
revoke all on table public.payment_allocations from public, anon, authenticated;
revoke all on table public.payment_events from public, anon, authenticated;
revoke all on table public.payments from service_role;
revoke all on table public.payment_allocations from service_role;
revoke all on table public.payment_events from service_role;
grant select on table public.payments to authenticated;
grant select, insert, update, delete on table public.payments to service_role;
grant select, insert, update, delete on table public.payment_allocations to service_role;
grant select, insert on table public.payment_events to service_role;

create or replace function public.stylehub_payment_events_append_only()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using errcode = 'P0001', message = jsonb_build_object(
    'code', 'PAYMENT_EVENT_IMMUTABLE',
    'message', 'Lịch sử thanh toán chỉ được phép ghi thêm.'
  )::text;
end;
$$;

drop trigger if exists payment_events_append_only on public.payment_events;
create trigger payment_events_append_only
before update or delete on public.payment_events
for each row execute function public.stylehub_payment_events_append_only();

create or replace function public.stylehub_guard_payment_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.payment_method is distinct from 'simulated_card' then
    return new;
  end if;

  if new.order_id is distinct from old.order_id
     or new.buyer_id is distinct from old.buyer_id
     or new.payment_method is distinct from old.payment_method
     or new.gross_amount is distinct from old.gross_amount
     or new.platform_fee_total is distinct from old.platform_fee_total
     or new.seller_amount_total is distinct from old.seller_amount_total
     or new.card_brand is distinct from old.card_brand
     or new.card_last_four is distinct from old.card_last_four
     or new.checkout_idempotency_id is distinct from old.checkout_idempotency_id
     or new.metadata is distinct from old.metadata then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'PAYMENT_FINANCIALS_IMMUTABLE',
      'message', 'Thông tin tài chính của thanh toán không thể thay đổi.'
    )::text;
  end if;

  if new.state is distinct from old.state then
    if not (
      (old.state = 'pending' and new.state in ('held', 'failed'))
      or (old.state = 'held' and new.state in ('refunded', 'released', 'disputed'))
      or (old.state = 'disputed' and new.state in ('held', 'refunded', 'released'))
    ) then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'INVALID_PAYMENT_TRANSITION',
        'message', 'Không thể chuyển trạng thái thanh toán.'
      )::text;
    end if;
    if new.version <> old.version + 1 then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'PAYMENT_VERSION_CONFLICT',
        'message', 'Phiên bản thanh toán không hợp lệ.'
      )::text;
    end if;
  elsif new.version <> old.version then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'PAYMENT_VERSION_CONFLICT',
      'message', 'Phiên bản thanh toán không hợp lệ.'
    )::text;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_guard_transition on public.payments;
create trigger payments_guard_transition
before update on public.payments
for each row execute function public.stylehub_guard_payment_transition();

create or replace function public.stylehub_guard_allocation_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.payment_id is distinct from old.payment_id
     or new.order_id is distinct from old.order_id
     or new.seller_id is distinct from old.seller_id
     or new.gross_amount is distinct from old.gross_amount
     or new.platform_fee is distinct from old.platform_fee
     or new.seller_net_amount is distinct from old.seller_net_amount then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'PAYMENT_ALLOCATION_IMMUTABLE',
      'message', 'Phân bổ thanh toán không thể thay đổi.'
    )::text;
  end if;
  if new.state is distinct from old.state and not (
    (old.state = 'held' and new.state in ('refunded', 'released', 'disputed'))
    or (old.state = 'disputed' and new.state in ('held', 'refunded', 'released'))
  ) then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_PAYMENT_TRANSITION',
      'message', 'Không thể chuyển trạng thái phân bổ thanh toán.'
    )::text;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists payment_allocations_guard_transition on public.payment_allocations;
create trigger payment_allocations_guard_transition
before update on public.payment_allocations
for each row execute function public.stylehub_guard_allocation_transition();

create or replace function public.stylehub_checkout_atomic_v2(
  p_buyer_id uuid,
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_customer jsonb,
  p_payment_method text,
  p_payment_details jsonb,
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
  v_result jsonb;
  v_order_id uuid;
  v_payment_id uuid;
  v_checkout_id uuid;
  v_gross bigint;
  v_fee bigint;
  v_seller_total bigint;
  v_allocation_count integer;
  v_gross_sum bigint;
  v_fee_sum bigint;
  v_net_sum bigint;
  v_payment jsonb;
  v_allocations jsonb;
  v_outcome text;
begin
  if p_payment_method <> 'simulated_card'
     or p_payment_details is null
     or jsonb_typeof(p_payment_details) <> 'object'
     or not (p_payment_details ? 'cardBrand')
     or not (p_payment_details ? 'lastFour')
     or exists (
       select 1
       from jsonb_object_keys(p_payment_details) as payment_key(key_name)
       where key_name not in ('cardBrand', 'lastFour', 'simulationOutcome')
     )
     or lower(p_payment_details ->> 'cardBrand') not in ('visa', 'mastercard', 'amex')
     or coalesce(p_payment_details ->> 'lastFour', '') !~ '^[0-9]{4}$'
     or lower(coalesce(p_payment_details ->> 'simulationOutcome', 'approved')) not in ('approved', 'declined') then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_PAYMENT_DETAILS',
      'message', 'Thông tin thẻ mô phỏng không hợp lệ.'
    )::text;
  end if;

  v_outcome := lower(coalesce(p_payment_details ->> 'simulationOutcome', 'approved'));

  -- The Phase 10 function owns order, price, coupon, inventory, and ledger
  -- behavior. Its legacy payment-method guard is satisfied internally, then
  -- the order is changed to simulated_card before this transaction commits.
  v_result := public.stylehub_checkout_atomic(
    p_buyer_id,
    p_idempotency_key,
    p_request_fingerprint,
    p_customer,
    'bank_transfer',
    p_notes,
    p_coupon_code,
    p_items
  );
  v_order_id := (v_result ->> 'id')::uuid;

  if coalesce((v_result ->> 'idempotentReplay')::boolean, false) then
    select p.id into v_payment_id
    from public.payments p
    where p.order_id = v_order_id and p.payment_method = 'simulated_card';
    if not found then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'PAYMENT_STATE_CONFLICT',
        'message', 'Không thể khôi phục thanh toán mô phỏng.'
      )::text;
    end if;
  else
    -- Controlled test declines occur after the Phase 10 work, proving that an
    -- exception here rolls order, items, inventory, ledger, and coupon back.
    if v_outcome = 'declined' then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'SIMULATED_PAYMENT_FAILED',
        'message', 'Thanh toán mô phỏng không thành công.'
      )::text;
    end if;

    if (v_result ->> 'totalAmount')::numeric <> trunc((v_result ->> 'totalAmount')::numeric)
       or exists (
         select 1 from public.order_items oi
         where oi.order_id = v_order_id
           and (oi.unit_price <> trunc(oi.unit_price) or oi.line_total <> trunc(oi.line_total))
       ) then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'PAYMENT_AMOUNT_INVALID',
        'message', 'Thanh toán mô phỏng chỉ hỗ trợ số tiền VND nguyên.'
      )::text;
    end if;

    v_gross := (v_result ->> 'totalAmount')::numeric::bigint;
    v_fee := (v_gross * 1000) / 10000;
    v_seller_total := v_gross - v_fee;

    select ci.id into v_checkout_id
    from public.checkout_idempotency ci
    where ci.buyer_id = p_buyer_id and ci.idempotency_key = p_idempotency_key;

    update public.orders
    set payment_method = 'simulated_card', updated_at = clock_timestamp()
    where id = v_order_id;

    v_payment_id := gen_random_uuid();
    insert into public.payments (
      id, order_id, buyer_id, provider, transaction_id, amount, currency, status,
      payment_method, state, gross_amount, platform_fee_total, seller_amount_total,
      card_brand, card_last_four, checkout_idempotency_id, version, held_at, metadata
    ) values (
      v_payment_id, v_order_id, p_buyer_id, 'stylehub_simulation',
      'SIM-' || upper(replace(v_payment_id::text, '-', '')), v_gross, 'VND', 'authorized',
      'simulated_card', 'held', v_gross, v_fee, v_seller_total,
      lower(p_payment_details ->> 'cardBrand'), p_payment_details ->> 'lastFour',
      v_checkout_id, 1, clock_timestamp(), '{}'::jsonb
    );

    with seller_base as (
      select oi.seller_id, sum(oi.line_total)::bigint as basis_amount
      from public.order_items oi
      where oi.order_id = v_order_id
      group by oi.seller_id
    ), basis_total as (
      select coalesce(sum(basis_amount), 0)::bigint as amount from seller_base
    ), gross_floor as (
      select sb.seller_id,
        case when bt.amount = 0 then 0 else (v_gross * sb.basis_amount) / bt.amount end::bigint as floor_amount,
        case when bt.amount = 0 then 0 else (v_gross * sb.basis_amount) % bt.amount end::bigint as fractional_remainder
      from seller_base sb cross join basis_total bt
    ), gross_ranked as (
      select gf.*,
        row_number() over (order by fractional_remainder desc, seller_id asc) as remainder_rank,
        v_gross - sum(floor_amount) over () as remainder_count
      from gross_floor gf
    ), gross_allocated as (
      select seller_id, floor_amount + case when remainder_rank <= remainder_count then 1 else 0 end as gross_amount
      from gross_ranked
    ), fee_floor as (
      select ga.*,
        case when v_gross = 0 then 0 else (v_fee * ga.gross_amount) / v_gross end::bigint as fee_floor_amount,
        case when v_gross = 0 then 0 else (v_fee * ga.gross_amount) % v_gross end::bigint as fee_fractional_remainder
      from gross_allocated ga
    ), fee_ranked as (
      select ff.*,
        row_number() over (order by fee_fractional_remainder desc, seller_id asc) as fee_remainder_rank,
        v_fee - sum(fee_floor_amount) over () as fee_remainder_count
      from fee_floor ff
    )
    insert into public.payment_allocations (
      payment_id, order_id, seller_id, gross_amount, platform_fee, seller_net_amount, state
    )
    select v_payment_id, v_order_id, seller_id, gross_amount,
      fee_floor_amount + case when fee_remainder_rank <= fee_remainder_count then 1 else 0 end,
      gross_amount - fee_floor_amount - case when fee_remainder_rank <= fee_remainder_count then 1 else 0 end,
      'held'
    from fee_ranked
    order by seller_id;

    select count(*)::integer, coalesce(sum(gross_amount), 0),
      coalesce(sum(platform_fee), 0), coalesce(sum(seller_net_amount), 0)
    into v_allocation_count, v_gross_sum, v_fee_sum, v_net_sum
    from public.payment_allocations
    where payment_id = v_payment_id;

    if v_allocation_count = 0
       or v_gross_sum <> v_gross
       or v_fee_sum <> v_fee
       or v_net_sum <> v_seller_total then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'PAYMENT_ALLOCATION_FAILED',
        'message', 'Không thể phân bổ thanh toán mô phỏng.'
      )::text;
    end if;

    insert into public.payment_events (
      payment_id, previous_state, new_state, event_type, actor_type, actor_id,
      reason, safe_metadata, idempotency_key
    ) values (
      v_payment_id, 'pending', 'held', 'payment_held', 'buyer', p_buyer_id,
      'Simulated card authorized and held for academic demonstration.',
      jsonb_build_object('simulation', true), 'checkout:' || p_idempotency_key::text
    );
  end if;

  select jsonb_build_object(
    'id', p.id, 'state', p.state, 'method', p.payment_method, 'currency', p.currency,
    'grossAmount', p.gross_amount, 'platformFeeTotal', p.platform_fee_total,
    'sellerAmountTotal', p.seller_amount_total, 'cardBrand', p.card_brand,
    'lastFour', p.card_last_four, 'heldAt', p.held_at, 'refundedAt', p.refunded_at
  ) into v_payment
  from public.payments p where p.id = v_payment_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', pa.id, 'sellerId', pa.seller_id, 'state', pa.state,
    'grossAmount', pa.gross_amount, 'platformFee', pa.platform_fee,
    'sellerNetAmount', pa.seller_net_amount
  ) order by pa.seller_id), '[]'::jsonb)
  into v_allocations
  from public.payment_allocations pa where pa.payment_id = v_payment_id;

  v_result := v_result || jsonb_build_object(
    'paymentMethod', 'simulated_card',
    'payment', v_payment || jsonb_build_object('allocations', v_allocations)
  );
  update public.checkout_idempotency
  set response_payload = v_result
  where buyer_id = p_buyer_id and idempotency_key = p_idempotency_key;
  return v_result;
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
  v_payment public.payments%rowtype;
  v_actor_type text;
  v_reason text;
  v_order_status text;
  v_restored_count integer := 0;
  v_cancelled_count integer := 0;
  v_restock jsonb;
  v_payment_state text;
begin
  select o.* into v_order
  from public.orders o where o.id = p_order_id for update;

  if not found or (p_actor_role <> 'admin' and v_order.user_id is distinct from p_actor_id) then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ORDER_NOT_FOUND', 'message', 'Không tìm thấy đơn hàng.'
    )::text;
  end if;

  if p_actor_role = 'admin' then
    v_actor_type := 'admin';
    v_reason := 'admin_cancellation';
  else
    v_actor_type := 'buyer';
    v_reason := 'buyer_cancellation';
  end if;

  perform oi.id from public.order_items oi
  where oi.order_id = p_order_id order by oi.id for update of oi;

  if exists (
    select 1 from public.order_items oi
    where oi.order_id = p_order_id
      and oi.fulfillment_status not in ('awaiting_confirmation', 'confirmed', 'preparing', 'cancelled')
  ) then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ORDER_NOT_CANCELLABLE',
      'message', 'Đơn hàng đã được giao đi hoặc hoàn tất nên không thể hủy.'
    )::text;
  end if;

  select p.* into v_payment
  from public.payments p
  where p.order_id = p_order_id and p.payment_method = 'simulated_card'
  for update;
  if found and v_payment.state not in ('held', 'refunded') then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'PAYMENT_STATE_CONFLICT',
      'message', 'Trạng thái thanh toán không cho phép hủy đơn.'
    )::text;
  end if;

  for v_item in
    select oi.* from public.order_items oi where oi.order_id = p_order_id order by oi.id
  loop
    v_restock := public.stylehub_restock_order_item(
      v_item.id, p_actor_id, v_actor_type, v_reason
    );
    if v_item.fulfillment_status <> 'cancelled' then
      update public.order_items
      set fulfillment_status = 'cancelled', cancelled_at = clock_timestamp(), cancelled_by = p_actor_id
      where id = v_item.id;
      v_cancelled_count := v_cancelled_count + 1;
    end if;
    if coalesce((v_restock ->> 'restored')::boolean, false) then
      v_restored_count := v_restored_count + 1;
    end if;
  end loop;

  v_order_status := public.stylehub_recompute_order_status(p_order_id);

  if v_payment.id is not null and v_payment.state = 'held' then
    update public.payments
    set state = 'refunded', status = 'refunded', refunded_at = clock_timestamp(),
        version = version + 1, updated_at = clock_timestamp()
    where id = v_payment.id and state = 'held' and version = v_payment.version;
    if not found then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'PAYMENT_VERSION_CONFLICT', 'message', 'Trạng thái thanh toán vừa thay đổi.'
      )::text;
    end if;
    update public.payment_allocations set state = 'refunded'
    where payment_id = v_payment.id and state = 'held';
    insert into public.payment_events (
      payment_id, previous_state, new_state, event_type, actor_type, actor_id,
      reason, safe_metadata, idempotency_key
    ) values (
      v_payment.id, 'held', 'refunded', 'payment_refunded', v_actor_type, p_actor_id,
      'Simulated refund recorded because the eligible order was cancelled.',
      jsonb_build_object('simulation', true, 'orderId', p_order_id),
      'cancel-order:' || p_order_id::text
    ) on conflict (payment_id, idempotency_key) do nothing;
    v_payment_state := 'refunded';
  elsif v_payment.id is not null then
    v_payment_state := v_payment.state;
  end if;

  return jsonb_build_object(
    'id', p_order_id, 'orderCode', v_order.order_code, 'status', v_order_status,
    'cancelledItems', v_cancelled_count, 'restoredItems', v_restored_count,
    'paymentState', v_payment_state,
    'idempotentReplay', v_cancelled_count = 0 and v_restored_count = 0,
    'message', 'Đơn hàng đã được hủy và số lượng sản phẩm đã được hoàn lại.'
  );
end;
$$;

revoke all on function public.stylehub_checkout_atomic_v2(uuid, uuid, text, jsonb, text, jsonb, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.stylehub_cancel_order(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.stylehub_payment_events_append_only() from public;
revoke all on function public.stylehub_guard_payment_transition() from public;
revoke all on function public.stylehub_guard_allocation_transition() from public;
grant execute on function public.stylehub_checkout_atomic_v2(uuid, uuid, text, jsonb, text, jsonb, text, text, jsonb)
  to service_role;
grant execute on function public.stylehub_cancel_order(uuid, text, uuid)
  to service_role;
