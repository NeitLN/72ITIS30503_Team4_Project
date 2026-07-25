-- Phase 8: Disputes

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  reason text not null,
  status text not null default 'requested' check (status in ('requested', 'awaiting_seller_response', 'evidence_submitted', 'under_admin_review', 'approved', 'rejected', 'resolved', 'cancelled')),
  buyer_evidence text[],
  seller_evidence text[],
  seller_response text,
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.disputes enable row level security;

create policy "Buyers and Sellers can view their own disputes"
  on public.disputes for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Buyers can create disputes"
  on public.disputes for insert
  with check (auth.uid() = buyer_id);

create policy "Participants can update their own disputes"
  on public.disputes for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

grant select, insert, update, delete on public.disputes to service_role;
grant select, insert, update on public.disputes to authenticated;
