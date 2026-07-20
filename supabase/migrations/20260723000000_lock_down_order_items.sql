-- Phase 13 impact aggregates must be served by the backend's allowlisted
-- endpoints. Raw order-item rows contain buyer/seller transaction context and
-- must never be available to a browser using the public Supabase key.
alter table public.order_items enable row level security;

revoke all on table public.order_items from public, anon, authenticated;
grant select, insert, update, delete on table public.order_items to service_role;
