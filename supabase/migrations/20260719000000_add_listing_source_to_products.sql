-- Phase 7: distinguish Phase 6 seed-managed catalog rows from real
-- user-created listings (/sell), so the Phase 6 seeder can never archive or
-- overwrite a real user's listing. Additive only — no drops, no data loss.
--
-- Default is 'user' (the safer, protected value) so any row this migration
-- doesn't explicitly touch is treated as protected by default. The Phase 6
-- seeder is responsible for explicitly stamping its own managed rows as
-- 'seed' on its next run (see seedVerifiedCatalog.js).

alter table public.products
  add column if not exists listing_source text not null default 'user';

alter table public.products
  drop constraint if exists products_listing_source_check;
alter table public.products
  add constraint products_listing_source_check
  check (listing_source in ('seed', 'user'));

create index if not exists idx_products_listing_source on public.products (listing_source);
