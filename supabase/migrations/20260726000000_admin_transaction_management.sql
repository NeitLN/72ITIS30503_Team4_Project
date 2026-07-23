-- Phase 3 — local admin transaction management.
-- Additive only: this migration reuses orders, payments, allocations and the
-- append-only payment event ledger introduced by Phase 2.

alter table public.payments
  add column if not exists released_at timestamptz;

-- The application and seller-fulfilment aggregate already use `completed`,
-- while the foundational Lab schema predates that state. Preserve every
-- legacy value and add the application state before admin transitions use it.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status in (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered',
    'completed', 'cancelled', 'refunded'
  )
);

create unique index if not exists payment_events_one_release_event_idx
  on public.payment_events(payment_id)
  where event_type = 'payment_released';

create table if not exists public.admin_transaction_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  actor_id uuid not null references public.users(id) on delete restrict,
  action text not null check (action in ('processing', 'completed', 'cancelled')),
  reason text not null check (length(btrim(reason)) between 1 and 1000),
  previous_order_status text not null,
  new_order_status text not null,
  previous_payment_state text,
  new_payment_state text,
  idempotency_key text not null check (length(idempotency_key) between 1 and 100),
  created_at timestamptz not null default clock_timestamp(),
  unique (order_id, idempotency_key)
);

create index if not exists admin_transaction_events_order_created_idx
  on public.admin_transaction_events(order_id, created_at, id);
create index if not exists admin_transaction_events_actor_created_idx
  on public.admin_transaction_events(actor_id, created_at desc);

alter table public.admin_transaction_events enable row level security;
revoke all on table public.admin_transaction_events from public, anon, authenticated;
revoke all on table public.admin_transaction_events from service_role;
grant select, insert on table public.admin_transaction_events to service_role;

create or replace function public.stylehub_admin_transaction_events_append_only()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using errcode = 'P0001', message = jsonb_build_object(
    'code', 'ADMIN_TRANSACTION_EVENT_IMMUTABLE',
    'message', 'Lịch sử thao tác quản trị chỉ được phép ghi thêm.'
  )::text;
end;
$$;

drop trigger if exists admin_transaction_events_append_only on public.admin_transaction_events;
create trigger admin_transaction_events_append_only
before update or delete on public.admin_transaction_events
for each row execute function public.stylehub_admin_transaction_events_append_only();

create or replace function public.stylehub_admin_transition_transaction(
  p_actor_id uuid,
  p_order_id uuid,
  p_next_status text,
  p_expected_order_updated_at timestamptz,
  p_expected_payment_version integer,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_existing public.admin_transaction_events%rowtype;
  v_admin_role text;
  v_previous_order_status text;
  v_previous_payment_state text;
  v_new_order_status text;
  v_new_payment_state text;
  v_reason text;
  v_cancel_result jsonb;
begin
  select u.role into v_admin_role
  from public.users u
  where u.id = p_actor_id and u.role = 'admin';

  if v_admin_role is distinct from 'admin' then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ADMIN_REQUIRED', 'message', 'Yêu cầu quyền quản trị viên.'
    )::text;
  end if;

  if p_next_status not in ('processing', 'completed', 'cancelled') then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_ADMIN_TRANSACTION_ACTION',
      'message', 'Thao tác quản trị giao dịch không hợp lệ.'
    )::text;
  end if;

  if p_idempotency_key is null or length(p_idempotency_key) not between 1 and 100 then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_IDEMPOTENCY_KEY', 'message', 'Idempotency key không hợp lệ.'
    )::text;
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if p_next_status in ('completed', 'cancelled') and v_reason is null then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ADMIN_REASON_REQUIRED', 'message', 'Vui lòng nhập lý do cho thao tác này.'
    )::text;
  end if;
  if v_reason is null then
    v_reason := 'Administrator moved the order to processing.';
  end if;
  if length(v_reason) > 1000 then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ADMIN_REASON_REQUIRED', 'message', 'Lý do không được vượt quá 1000 ký tự.'
    )::text;
  end if;

  select e.* into v_existing
  from public.admin_transaction_events e
  where e.order_id = p_order_id and e.idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'orderId', v_existing.order_id,
      'paymentId', v_existing.payment_id,
      'orderStatus', v_existing.new_order_status,
      'paymentState', v_existing.new_payment_state,
      'idempotentReplay', true,
      'eventId', v_existing.id,
      'message', 'Thao tác quản trị đã được xử lý trước đó.'
    );
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'TRANSACTION_NOT_FOUND', 'message', 'Không tìm thấy giao dịch.'
    )::text;
  end if;

  if p_expected_order_updated_at is null
     or v_order.updated_at is distinct from p_expected_order_updated_at then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'TRANSACTION_STATE_CONFLICT',
      'message', 'Giao dịch vừa thay đổi. Vui lòng tải lại trước khi thao tác.'
    )::text;
  end if;

  if not (
    (v_order.status = 'pending' and p_next_status in ('processing', 'cancelled'))
    or (v_order.status = 'processing' and p_next_status in ('completed', 'cancelled'))
  ) then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_ADMIN_TRANSACTION_ACTION',
      'message', 'Không thể chuyển giao dịch từ trạng thái hiện tại.'
    )::text;
  end if;

  select p.* into v_payment
  from public.payments p
  where p.order_id = p_order_id and p.payment_method = 'simulated_card'
  for update;

  if v_payment.id is not null and (
    p_expected_payment_version is null
    or p_expected_payment_version <> v_payment.version
  ) then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'TRANSACTION_STATE_CONFLICT',
      'message', 'Thanh toán vừa thay đổi. Vui lòng tải lại trước khi thao tác.'
    )::text;
  end if;

  v_previous_order_status := v_order.status;
  v_previous_payment_state := v_payment.state;

  if p_next_status = 'cancelled' then
    v_cancel_result := public.stylehub_cancel_order(p_actor_id, 'admin', p_order_id);
    v_new_order_status := coalesce(v_cancel_result ->> 'status', 'cancelled');
  else
    if p_next_status = 'completed' and v_payment.id is not null then
      if v_payment.state <> 'held' then
        raise exception using errcode = 'P0001', message = jsonb_build_object(
          'code', 'INVALID_PAYMENT_TRANSITION',
          'message', 'Thanh toán không ở trạng thái ký quỹ để hoàn tất.'
        )::text;
      end if;

      update public.payments
      set state = 'released', released_at = clock_timestamp(),
          version = version + 1, updated_at = clock_timestamp()
      where id = v_payment.id and state = 'held' and version = v_payment.version;
      if not found then
        raise exception using errcode = 'P0001', message = jsonb_build_object(
          'code', 'TRANSACTION_STATE_CONFLICT',
          'message', 'Thanh toán vừa thay đổi. Vui lòng tải lại trước khi thao tác.'
        )::text;
      end if;

      update public.payment_allocations
      set state = 'released'
      where payment_id = v_payment.id and state = 'held';

      insert into public.payment_events (
        payment_id, previous_state, new_state, event_type, actor_type, actor_id,
        reason, safe_metadata, idempotency_key
      ) values (
        v_payment.id, 'held', 'released', 'payment_released', 'admin', p_actor_id,
        v_reason, jsonb_build_object('simulation', true, 'orderId', p_order_id),
        'admin-transition:' || p_idempotency_key
      );
    end if;

    update public.orders
    set status = p_next_status
    where id = p_order_id and status = v_previous_order_status;
    if not found then
      raise exception using errcode = 'P0001', message = jsonb_build_object(
        'code', 'TRANSACTION_STATE_CONFLICT',
        'message', 'Giao dịch vừa thay đổi. Vui lòng tải lại trước khi thao tác.'
      )::text;
    end if;
    v_new_order_status := p_next_status;
  end if;

  select o.* into v_order from public.orders o where o.id = p_order_id;
  select p.* into v_payment
  from public.payments p
  where p.order_id = p_order_id and p.payment_method = 'simulated_card';
  v_new_order_status := coalesce(v_order.status, v_new_order_status);
  v_new_payment_state := v_payment.state;

  insert into public.admin_transaction_events (
    order_id, payment_id, actor_id, action, reason,
    previous_order_status, new_order_status,
    previous_payment_state, new_payment_state, idempotency_key
  ) values (
    p_order_id, v_payment.id, p_actor_id, p_next_status, v_reason,
    v_previous_order_status, v_new_order_status,
    v_previous_payment_state, v_new_payment_state, p_idempotency_key
  ) returning * into v_existing;

  return jsonb_build_object(
    'orderId', p_order_id,
    'paymentId', v_payment.id,
    'orderStatus', v_new_order_status,
    'orderUpdatedAt', v_order.updated_at,
    'paymentState', v_new_payment_state,
    'paymentVersion', v_payment.version,
    'idempotentReplay', false,
    'eventId', v_existing.id,
    'message', 'Cập nhật giao dịch thành công.'
  );
end;
$$;

create or replace function public.stylehub_admin_transaction_summary(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  v_is_admin boolean;
  v_result jsonb;
begin
  select exists (
    select 1 from public.users u where u.id = p_actor_id and u.role = 'admin'
  ) into v_is_admin;
  if not v_is_admin then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'ADMIN_REQUIRED', 'message', 'Yêu cầu quyền quản trị viên.'
    )::text;
  end if;

  select jsonb_build_object(
    'totalTransactions', count(*),
    'pendingOrders', count(*) filter (where o.status = 'pending'),
    'processingOrders', count(*) filter (where o.status = 'processing'),
    'completedOrders', count(*) filter (where o.status = 'completed'),
    'cancelledOrders', count(*) filter (where o.status = 'cancelled')
  ) into v_result
  from public.orders o;

  return v_result || (
    select jsonb_build_object(
      'heldPayments', count(*) filter (where p.state = 'held'),
      'heldAmount', coalesce(sum(p.gross_amount) filter (where p.state = 'held'), 0),
      'releasedPayments', count(*) filter (where p.state = 'released'),
      'refundedPayments', count(*) filter (where p.state = 'refunded'),
      'failedPayments', count(*) filter (where p.state = 'failed')
    )
    from public.payments p
    where p.payment_method = 'simulated_card'
  );
end;
$$;

revoke all on function public.stylehub_admin_transaction_events_append_only() from public;
revoke all on function public.stylehub_admin_transition_transaction(uuid, uuid, text, timestamptz, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.stylehub_admin_transaction_summary(uuid)
  from public, anon, authenticated;
grant execute on function public.stylehub_admin_transition_transaction(uuid, uuid, text, timestamptz, integer, text, text)
  to service_role;
grant execute on function public.stylehub_admin_transaction_summary(uuid)
  to service_role;
