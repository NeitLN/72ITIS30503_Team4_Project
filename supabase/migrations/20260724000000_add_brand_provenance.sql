-- Seller-declared brand creation — brand provenance/verification metadata.
--
-- Distinguishes the curated catalog brands (seeded by
-- backend/scripts/seedVerifiedCatalog.js) from brands a seller declares
-- through free-text input at listing time
-- (backend/services/brandService.js resolveOrCreateBrand), without
-- changing the meaning, identity, or FK relationships of any existing
-- brand row. `products.brand_id` and every existing brand's `name`/`slug`
-- are untouched.
--
-- Backward compatibility: every existing brand row defaults to
-- source='catalog', verification_status='verified' — the exact status
-- quo those rows already had in practice, so no existing catalog brand
-- suddenly appears unverified. `created_by` defaults to null for rows
-- that predate this column (their true author, if a seller originally
-- typed them via resolveOrCreateBrand pre-Phase-16, was never recorded
-- and cannot be reconstructed from this migration alone).
--
-- Rollback: `alter table public.brands drop column if exists source,
-- drop column if exists verification_status, drop column if exists
-- created_by;` is non-destructive — it only removes the provenance labels
-- added here, not any brand, product, or FK relationship.

alter table public.brands
  add column if not exists source text not null default 'catalog',
  add column if not exists verification_status text not null default 'verified',
  add column if not exists created_by uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'brands_source_check'
  ) then
    alter table public.brands
      add constraint brands_source_check check (source in ('catalog', 'seller_declared'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'brands_verification_status_check'
  ) then
    alter table public.brands
      add constraint brands_verification_status_check check (verification_status in ('verified', 'pending', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'brands_created_by_fkey'
  ) then
    alter table public.brands
      add constraint brands_created_by_fkey
      foreign key (created_by) references public.users(id) on delete set null;
  end if;
end;
$$;

create index if not exists brands_source_idx on public.brands (source);

-- Existing rows already default to catalog/verified above. This backfill
-- exists only to correct the one brand already created through the
-- pre-existing free-text resolveOrCreateBrand path during Phase 15
-- (Loop & Mend Studio, added to demonstrate an independent-brand demo
-- listing — see docs/sustainability-demo-data.md) so it is honestly
-- labeled once this feature can express that distinction. It is a
-- one-time, exact-slug data correction, not a broad update: it does not
-- touch any of the 49 curated catalog brand slugs, and it changes
-- metadata only — never the brand's name, slug, or id, and never any
-- product's brand_id.
update public.brands
set source = 'seller_declared', verification_status = 'pending'
where slug = 'loop-mend-studio';
