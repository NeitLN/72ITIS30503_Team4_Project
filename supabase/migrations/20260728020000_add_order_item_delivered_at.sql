-- Add canonical delivery timestamp to support Phase 8 dispute eligibility.
-- This records the exact moment an item first transitions to 'completed'.
-- Legacy rows lacking this timestamp are deemed to have an unknown delivery time
-- and cannot automatically qualify for buyer self-service disputes.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz NULL;

COMMENT ON COLUMN public.order_items.delivered_at IS 'Canonical delivery/completion timestamp. Marks the exact start of the dispute window.';

CREATE OR REPLACE FUNCTION public.order_items_set_delivered_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.fulfillment_status = 'completed' THEN
      NEW.delivered_at := clock_timestamp();
    ELSE
      NEW.delivered_at := NULL;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Transitioning into completed for the first time
    IF OLD.fulfillment_status IS DISTINCT FROM 'completed' AND NEW.fulfillment_status = 'completed' THEN
      NEW.delivered_at := clock_timestamp();
    -- Keep the existing delivered_at if already set, rejecting any direct client modification
    ELSIF OLD.delivered_at IS NOT NULL THEN
      NEW.delivered_at := OLD.delivered_at;
    ELSE
      NEW.delivered_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_delivered_at_trigger ON public.order_items;
CREATE TRIGGER order_items_delivered_at_trigger
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_items_set_delivered_at();
