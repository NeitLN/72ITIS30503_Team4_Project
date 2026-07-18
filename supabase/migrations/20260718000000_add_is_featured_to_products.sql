-- Phase 6 catalog expansion: backend/services/productService.js already reads
-- is_featured (with a silent fallback to unfiltered when the column is missing).
-- Add the real column so featured=true actually filters instead of no-op'ing.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_is_featured_idx
  ON public.products (is_featured)
  WHERE is_featured = true;
