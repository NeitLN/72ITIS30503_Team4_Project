-- Phase 11 — immutable, authoritative Product Journey snapshots for every
-- order item created by the Phase 10 atomic checkout transaction.

alter table public.order_items
  add column if not exists lifecycle_type_snapshot text not null default 'not_specified',
  add column if not exists claim_source_snapshot text;

alter table public.order_items
  drop constraint if exists order_items_lifecycle_type_snapshot_check;
alter table public.order_items
  add constraint order_items_lifecycle_type_snapshot_check
  check (lifecycle_type_snapshot in ('new', 'deadstock', 'pre_loved', 'repaired', 'upcycled', 'not_specified'));

alter table public.order_items
  drop constraint if exists order_items_claim_source_snapshot_check;
alter table public.order_items
  add constraint order_items_claim_source_snapshot_check
  check (claim_source_snapshot is null or claim_source_snapshot = 'seller_declared');

create index if not exists order_items_lifecycle_snapshot_idx
  on public.order_items(lifecycle_type_snapshot, created_at desc);

-- The checkout RPC remains the sole order-creation boundary. This trigger is
-- deliberately inside the same PostgreSQL transaction: it reads the locked
-- product's authoritative sustainability row and overwrites any supplied
-- snapshot values before the order item becomes visible. A legacy product
-- with no row snapshots as not_specified with a null claim source.
create or replace function public.stylehub_capture_sustainability_snapshot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  select ps.lifecycle_type, ps.claim_source
  into new.lifecycle_type_snapshot, new.claim_source_snapshot
  from public.product_sustainability ps
  where ps.product_id = new.product_id;

  if not found then
    new.lifecycle_type_snapshot := 'not_specified';
    new.claim_source_snapshot := null;
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_capture_sustainability_snapshot on public.order_items;
create trigger order_items_capture_sustainability_snapshot
before insert on public.order_items
for each row execute function public.stylehub_capture_sustainability_snapshot();

create or replace function public.stylehub_preserve_sustainability_snapshot()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.lifecycle_type_snapshot is distinct from old.lifecycle_type_snapshot
     or new.claim_source_snapshot is distinct from old.claim_source_snapshot then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'IMMUTABLE_SUSTAINABILITY_SNAPSHOT',
      'message', 'Thông tin Product Journey của đơn hàng không thể thay đổi.'
    )::text;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_preserve_sustainability_snapshot on public.order_items;
create trigger order_items_preserve_sustainability_snapshot
before update on public.order_items
for each row execute function public.stylehub_preserve_sustainability_snapshot();

revoke all on function public.stylehub_capture_sustainability_snapshot() from public, anon, authenticated;
revoke all on function public.stylehub_preserve_sustainability_snapshot() from public, anon, authenticated;
