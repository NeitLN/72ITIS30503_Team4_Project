-- Lab 7 coupon support: store order-level discount amount
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_discount_amount_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_discount_amount_check
CHECK (discount_amount >= 0);
