-- ==============================================================================
-- StyleHub Orders and Order Items Relational Schema (Lab 4 & Lab 5)
-- ==============================================================================

-- 1. Create Parent Table: orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    customer_city VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cod',
    total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Child Table: order_items (Parent-Child Relationship)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(15,2) NOT NULL CHECK (price >= 0),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    size VARCHAR(50),
    condition VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Enable Row Level Security (RLS) for public inserts during demo
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read and insert orders/order_items for ease of demonstration in class labs
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public update orders" ON public.orders FOR UPDATE USING (true);

CREATE POLICY "Public insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read order items" ON public.order_items FOR SELECT USING (true);
