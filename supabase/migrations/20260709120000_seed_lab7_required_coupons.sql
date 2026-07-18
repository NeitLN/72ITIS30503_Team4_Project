-- Lab 7 required coupons
-- XUAN2026: 10% percentage discount on subtotal
-- LOGISTICFREE: free shipping / shipping fee discount

-- Ensure optional description column exists before using it in seed data
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS description text;

-- Allow Lab 7 coupon discount types
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_type_check;

ALTER TABLE public.coupons
ADD CONSTRAINT coupons_discount_type_check
CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping'));

-- Allow discount_value = 0 for free_shipping coupons
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_value_check;

ALTER TABLE public.coupons
ADD CONSTRAINT coupons_discount_value_check
CHECK (discount_value >= 0);

-- Seed or update required Lab 7 coupons
INSERT INTO public.coupons (
  code,
  description,
  discount_type,
  discount_value,
  minimum_order_amount,
  starts_at,
  expires_at,
  is_active
) VALUES (
  'XUAN2026',
  '10% off subtotal.',
  'percentage',
  10,
  0,
  now() - interval '1 day',
  now() + interval '365 days',
  true
), (
  'LOGISTICFREE',
  'Free shipping on your order.',
  'free_shipping',
  0,
  0,
  now() - interval '1 day',
  now() + interval '365 days',
  true
)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  minimum_order_amount = EXCLUDED.minimum_order_amount,
  starts_at = EXCLUDED.starts_at,
  expires_at = EXCLUDED.expires_at,
  is_active = EXCLUDED.is_active;s