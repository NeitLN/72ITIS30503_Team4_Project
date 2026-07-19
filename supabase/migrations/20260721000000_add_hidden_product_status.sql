-- Phase 9 — seller dashboard needs a "temporarily unavailable but retained"
-- state distinct from 'draft' (never published) and 'archived' (retired).
-- The existing `products_status_check` constraint (from
-- 20260609040000_expand_full_ecommerce_schema.sql) already allows
-- 'draft' | 'active' | 'sold' | 'archived' — this migration only adds
-- 'hidden' to that set. Purely additive: no existing row's status value is
-- touched, so every current row (all 'active' or 'archived') stays valid
-- under the new constraint without any UPDATE.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check
  CHECK (status IN ('draft', 'active', 'hidden', 'sold', 'archived'));
