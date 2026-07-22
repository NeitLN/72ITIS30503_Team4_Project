-- Phase 2.2 Compatibility Bridge
-- Ensures legacy Lab 6/7 schema objects expected by atomic checkout and payment migrations exist.
-- Safely adds missing columns to orders and order_items without breaking existing data.

-- 1. Add missing auth columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'seller'));

ALTER TABLE public.users
  ALTER COLUMN role_id DROP NOT NULL;

-- 2. Add missing columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0 CHECK (total_amount >= 0);

ALTER TABLE public.orders
  ALTER COLUMN order_number DROP NOT NULL;

-- Make order_code unique where it exists
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_code_key_idx ON public.orders (order_code) WHERE order_code IS NOT NULL;

-- 2. Add missing columns to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_slug TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) DEFAULT 0 CHECK (price >= 0),
  ADD COLUMN IF NOT EXISTS line_total NUMERIC(12,2) DEFAULT 0 CHECK (line_total >= 0);

ALTER TABLE public.order_items
  ALTER COLUMN total_price DROP NOT NULL;

-- 3. Restore missing default privileges for foundational tables
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.order_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_variants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.coupons TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.payments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.shipments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.addresses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.carts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cart_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_images TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.reviews TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attributes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attribute_values TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.variant_attribute_values TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.roles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.brands TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
