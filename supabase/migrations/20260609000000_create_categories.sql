create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists categories_parent_id_idx
  on public.categories(parent_id);

alter table public.categories enable row level security;

drop policy if exists "Categories are publicly readable" on public.categories;
create policy "Categories are publicly readable"
  on public.categories
  for select
  using (is_active = true);

-- Idempotent sample data: these rows are added only when their slug is missing.
insert into public.categories (name, slug, display_order)
values
  ('Laptop', 'laptop', 1),
  ('Phone', 'phone', 2),
  ('Accessories', 'accessories', 3),
  ('Fashion', 'fashion', 4)
on conflict (slug) do nothing;
