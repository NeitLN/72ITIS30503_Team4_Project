-- Phase 8: Disputes

CREATE OR REPLACE FUNCTION public.is_valid_evidence_path(p_path text)
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT p_path IS NOT NULL
    AND trim(p_path) <> ''
    AND p_path !~ '^[[:space:]]*$'
    AND p_path !~ '[[:cntrl:]]'
    AND p_path !~* '^(https?://|//)'
    AND char_length(p_path) <= 1000;
$$;

CREATE OR REPLACE FUNCTION public.are_evidence_paths_valid(p_paths text[])
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT p_paths IS NULL OR (
    array_position(p_paths, NULL) IS NULL
    AND array_length(p_paths, 1) <= 5
    AND array_length(p_paths, 1) = (SELECT count(*) FROM unnest(p_paths) AS path WHERE public.is_valid_evidence_path(path))
    AND array_length(p_paths, 1) = (SELECT count(DISTINCT path) FROM unnest(p_paths) AS path)
  );
$$;

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  buyer_id uuid not null references public.users(id) on delete restrict,
  seller_id uuid not null references public.users(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) between 1 and 1000),
  description text check (description is null or char_length(trim(description)) between 1 and 2000),
  status text not null default 'awaiting_seller_response'
    check (status in ('awaiting_seller_response', 'evidence_submitted', 'under_admin_review', 'approved', 'rejected', 'resolved', 'cancelled')),
  buyer_evidence text[] check (public.are_evidence_paths_valid(buyer_evidence)),
  seller_evidence text[] check (public.are_evidence_paths_valid(seller_evidence)),
  seller_response text check (seller_response is null or char_length(trim(seller_response)) between 1 and 2000),
  admin_notes text check (admin_notes is null or char_length(trim(admin_notes)) <= 5000),
  resolution_type text check (resolution_type is null or resolution_type in ('refund', 'reject_claim', 'mutual_resolution')),
  resolution_reason text check (resolution_reason is null or char_length(trim(resolution_reason)) between 1 and 2000),
  resolved_by uuid references public.users(id) on delete set null,
  seller_responded_at timestamptz,
  escalated_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (buyer_id <> seller_id),

  -- Status consistency
  check (
    (status in ('approved', 'rejected', 'resolved') AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL AND resolution_reason IS NOT NULL AND resolution_type IS NOT NULL) OR
    (status not in ('approved', 'rejected', 'resolved') AND resolved_at IS NULL AND resolved_by IS NULL AND resolution_type IS NULL)
  ),
  check (
    (status = 'cancelled' AND resolved_by IS NULL AND resolution_type IS NULL AND resolution_reason IS NULL AND resolved_at IS NULL) OR (status <> 'cancelled')
  ),
  check (
    (status = 'under_admin_review' AND escalated_at IS NOT NULL) OR (status <> 'under_admin_review')
  ),
  check (
    (status = 'evidence_submitted' AND seller_responded_at IS NOT NULL) OR (status <> 'evidence_submitted')
  )
);

-- Ensure only one active dispute per order item
create unique index if not exists active_dispute_unique_idx
  on public.disputes (order_item_id)
  where status in ('awaiting_seller_response', 'evidence_submitted', 'under_admin_review');

create index if not exists disputes_order_id_idx on public.disputes(order_id);
create index if not exists disputes_buyer_id_idx on public.disputes(buyer_id);
create index if not exists disputes_seller_id_idx on public.disputes(seller_id);
create index if not exists disputes_status_idx on public.disputes(status);
create index if not exists disputes_created_at_idx on public.disputes(created_at);

-- Update timestamp trigger
drop trigger if exists disputes_set_updated_at on public.disputes;
create trigger disputes_set_updated_at before update on public.disputes
  for each row execute function public.set_updated_at();

-- Ownership consistency trigger
CREATE OR REPLACE FUNCTION public.disputes_ownership_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_order_user_id uuid;
  v_item_seller_id uuid;
  v_item_order_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.order_id <> OLD.order_id OR NEW.order_item_id <> OLD.order_item_id OR NEW.buyer_id <> OLD.buyer_id OR NEW.seller_id <> OLD.seller_id THEN
      RAISE EXCEPTION 'Ownership fields cannot be modified after insertion';
    END IF;
  END IF;

  SELECT user_id INTO v_order_user_id FROM public.orders WHERE id = NEW.order_id;
  SELECT order_id, seller_id INTO v_item_order_id, v_item_seller_id FROM public.order_items WHERE id = NEW.order_item_id;

  IF v_item_order_id <> NEW.order_id THEN
    RAISE EXCEPTION 'Order item does not belong to the specified order';
  END IF;
  IF v_order_user_id <> NEW.buyer_id THEN
    RAISE EXCEPTION 'Buyer ID does not match the order owner';
  END IF;
  IF v_item_seller_id <> NEW.seller_id THEN
    RAISE EXCEPTION 'Seller ID does not match the order item seller';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS disputes_ownership_check_trigger ON public.disputes;
CREATE TRIGGER disputes_ownership_check_trigger
  BEFORE INSERT OR UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.disputes_ownership_check();

-- Dispute Events Table
create table if not exists public.dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete restrict,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text not null,
  event_type text not null,
  from_status text,
  to_status text,
  public_message text,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dispute_events_dispute_id_idx on public.dispute_events(dispute_id);
create index if not exists dispute_events_created_at_idx on public.dispute_events(created_at);

alter table public.dispute_events enable row level security;
revoke all on public.dispute_events from anon, authenticated;
grant select, insert on public.dispute_events to service_role;

-- RLS Hardening
alter table public.disputes enable row level security;
revoke all on public.disputes from anon, authenticated;
grant select, insert, update, delete on public.disputes to service_role;

-- Secure Create-Dispute RPC
CREATE OR REPLACE FUNCTION public.stylehub_create_dispute(
  p_buyer_id uuid,
  p_order_item_id uuid,
  p_reason text,
  p_description text DEFAULT NULL,
  p_buyer_evidence text[] DEFAULT NULL
)
RETURNS public.disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.order_items%rowtype;
  v_order_buyer_id uuid;
  v_dispute public.disputes;
BEGIN
  -- Verify the item
  SELECT * INTO v_item FROM public.order_items WHERE id = p_order_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  SELECT user_id INTO v_order_buyer_id FROM public.orders WHERE id = v_item.order_id;

  IF v_order_buyer_id <> p_buyer_id THEN
    RAISE EXCEPTION 'Not authorized to dispute this item';
  END IF;

  IF v_item.seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'Cannot dispute your own item';
  END IF;

  IF v_item.fulfillment_status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed items can be disputed';
  END IF;

  IF v_item.delivered_at IS NULL THEN
    RAISE EXCEPTION 'Legacy completed items with unknown delivery times cannot be automatically disputed';
  END IF;

  IF clock_timestamp() > v_item.delivered_at + interval '72 hours' THEN
    RAISE EXCEPTION 'Dispute window of 72 hours has expired';
  END IF;

  -- Ensure no active dispute
  IF EXISTS (
    SELECT 1 FROM public.disputes
    WHERE order_item_id = p_order_item_id
    AND status IN ('awaiting_seller_response', 'evidence_submitted', 'under_admin_review')
  ) THEN
    RAISE EXCEPTION 'An active dispute already exists for this item';
  END IF;

  -- Insert the dispute
  INSERT INTO public.disputes (
    order_id,
    order_item_id,
    buyer_id,
    seller_id,
    reason,
    description,
    buyer_evidence
  ) VALUES (
    v_item.order_id,
    p_order_item_id,
    p_buyer_id,
    v_item.seller_id,
    p_reason,
    p_description,
    p_buyer_evidence
  ) RETURNING * INTO v_dispute;

  -- Append audit event
  INSERT INTO public.dispute_events (
    dispute_id,
    actor_id,
    actor_role,
    event_type,
    to_status
  ) VALUES (
    v_dispute.id,
    p_buyer_id,
    'buyer',
    'dispute_opened',
    v_dispute.status
  );

  RETURN v_dispute;
END;
$$;

REVOKE ALL ON FUNCTION public.stylehub_create_dispute FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stylehub_create_dispute TO service_role;
