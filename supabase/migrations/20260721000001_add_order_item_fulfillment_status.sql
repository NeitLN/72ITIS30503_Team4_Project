-- Phase 9 — per-seller order fulfillment.
--
-- `orders.status` is a single value for the whole order, but a real order
-- can contain items from more than one seller (verified against live data:
-- several existing orders mix products owned by two different real
-- sellers). A seller must be able to progress only their own line items
-- without touching the shared `orders.status`, which stays exactly as-is —
-- still the buyer-facing/admin-controlled aggregate, untouched by this
-- migration and by Phase 9's seller-facing endpoints.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'awaiting_confirmation';

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_fulfillment_status_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_fulfillment_status_check
  CHECK (fulfillment_status IN ('awaiting_confirmation', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'));

-- Backfill existing rows from their parent order's current status, so
-- historical items land on a sensible fulfillment state instead of
-- uniformly resetting to 'awaiting_confirmation'.
UPDATE order_items oi
SET fulfillment_status = CASE o.status
  WHEN 'completed' THEN 'completed'
  WHEN 'processing' THEN 'preparing'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE 'awaiting_confirmation'
END
FROM orders o
WHERE oi.order_id = o.id;
