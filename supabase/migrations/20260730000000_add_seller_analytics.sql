-- Phase 9: Seller Analytics

create table if not exists public.product_views (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  viewer_id uuid references public.users(id) on delete set null,
  viewed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists product_views_product_id_idx on public.product_views(product_id);
create index if not exists product_views_viewed_at_idx on public.product_views(viewed_at);

-- RLS
alter table public.product_views enable row level security;

create policy "Sellers can view analytics for their products"
  on public.product_views for select
  using (exists (select 1 from public.products p where p.id = product_views.product_id and p.seller_id = auth.uid()));

create policy "Anyone can insert views"
  on public.product_views for insert
  with check (true);

grant select, insert on public.product_views to authenticated, anon;
grant select, insert, update, delete on public.product_views to service_role;
