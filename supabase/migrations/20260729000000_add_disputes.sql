-- Phase 8: Disputes

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 1 and 1000),
  description text check (description is null or char_length(trim(description)) <= 2000),
  status text not null default 'awaiting_seller_response'
    check (status in ('awaiting_seller_response', 'evidence_submitted', 'under_admin_review', 'approved', 'rejected', 'resolved', 'cancelled')),
  buyer_evidence text[] check (array_length(buyer_evidence, 1) is null or array_length(buyer_evidence, 1) <= 5),
  seller_evidence text[] check (array_length(seller_evidence, 1) is null or array_length(seller_evidence, 1) <= 5),
  seller_response text check (seller_response is null or char_length(trim(seller_response)) <= 2000),
  admin_notes text,
  resolution_type text,
  resolution_reason text,
  resolved_by uuid references public.users(id) on delete set null,
  seller_responded_at timestamptz,
  escalated_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- RLS Hardening
alter table public.disputes enable row level security;

-- Revoke all access from anon and authenticated as the API handles all ops via service_role
revoke all on public.disputes from anon, authenticated;

-- Grant only what is required to service_role
grant select, insert, update, delete on public.disputes to service_role;
