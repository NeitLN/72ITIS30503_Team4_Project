-- ==============================================================================
-- StyleHub Catalog Seed Data
-- ==============================================================================

-- 1. Roles
INSERT INTO roles (id, name, description) VALUES
('11111111-0000-0000-0000-000000000001', 'admin', 'System Administrator'),
('11111111-0000-0000-0000-000000000002', 'customer', 'Standard Buyer'),
('11111111-0000-0000-0000-000000000003', 'seller', 'Verified Marketplace Seller')
ON CONFLICT (name) DO NOTHING;

-- 2. Users (Sellers)
INSERT INTO users (id, role_id, email, full_name, username, location, seller_rating, sold_count, is_verified_seller) VALUES
('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'tien@stylehub.vn', 'Tien Nguyen', 'tienstreet', 'Ho Chi Minh City, VN', 4.9, 152, true),
('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', 'minh@stylehub.vn', 'Minh Tran', 'minhstreetwear', 'Hanoi, VN', 4.8, 89, true),
('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'archive@stylehub.vn', 'Local Archive', 'localarchive', 'Da Nang, VN', 5.0, 204, true),
('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 'saigon@stylehub.vn', 'Saigon Vintage', 'saigonvintage', 'Ho Chi Minh City, VN', 4.7, 45, true)
ON CONFLICT (email) DO NOTHING;

-- 3. Brands
INSERT INTO brands (id, name, slug, country, is_local) VALUES
('33333333-0000-0000-0000-000000000001', 'Nike', 'nike', 'USA', false),
('33333333-0000-0000-0000-000000000002', 'Adidas', 'adidas', 'Germany', false),
('33333333-0000-0000-0000-000000000003', 'Uniqlo', 'uniqlo', 'Japan', false),
('33333333-0000-0000-0000-000000000004', 'Zara', 'zara', 'Spain', false),
('33333333-0000-0000-0000-000000000005', 'Levi''s', 'levis', 'USA', false),
('33333333-0000-0000-0000-000000000006', 'DirtyCoins', 'dirtycoins', 'Vietnam', true),
('33333333-0000-0000-0000-000000000007', 'Levents', 'levents', 'Vietnam', true),
('33333333-0000-0000-0000-000000000008', 'Degrey', 'degrey', 'Vietnam', true),
('33333333-0000-0000-0000-000000000009', 'Coolmate', 'coolmate', 'Vietnam', true),
('33333333-0000-0000-0000-000000000010', 'Biti''s', 'bitis', 'Vietnam', true),
('33333333-0000-0000-0000-000000000011', 'Ananas', 'ananas', 'Vietnam', true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Categories (Root)
INSERT INTO categories (id, name, slug) VALUES
('44444444-0000-0000-0000-000000000001', 'Men', 'men'),
('44444444-0000-0000-0000-000000000002', 'Women', 'women'),
('44444444-0000-0000-0000-000000000003', 'Streetwear', 'streetwear'),
('44444444-0000-0000-0000-000000000004', 'Shoes', 'shoes'),
('44444444-0000-0000-0000-000000000005', 'Bags', 'bags'),
('44444444-0000-0000-0000-000000000006', 'Accessories', 'accessories')
ON CONFLICT (slug) DO NOTHING;

-- 5. Categories (Children)
INSERT INTO categories (id, parent_id, name, slug) VALUES
-- Men's
('44444444-1111-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'T-Shirts', 'men-t-shirts'),
('44444444-1111-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 'Jackets', 'men-jackets'),
('44444444-1111-0000-0000-000000000003', '44444444-0000-0000-0000-000000000001', 'Pants', 'men-pants'),
-- Women's
('44444444-1111-0000-0000-000000000004', '44444444-0000-0000-0000-000000000002', 'Dresses', 'women-dresses'),
('44444444-1111-0000-0000-000000000005', '44444444-0000-0000-0000-000000000002', 'Tops', 'women-tops'),
('44444444-1111-0000-0000-000000000006', '44444444-0000-0000-0000-000000000002', 'Skirts', 'women-skirts'),
-- Streetwear
('44444444-1111-0000-0000-000000000007', '44444444-0000-0000-0000-000000000003', 'Hoodies', 'streetwear-hoodies'),
('44444444-1111-0000-0000-000000000008', '44444444-0000-0000-0000-000000000003', 'Oversized Tees', 'streetwear-oversized-tees'),
('44444444-1111-0000-0000-000000000009', '44444444-0000-0000-0000-000000000003', 'Varsity Jackets', 'streetwear-varsity-jackets'),
-- Shoes
('44444444-1111-0000-0000-000000000010', '44444444-0000-0000-0000-000000000004', 'Sneakers', 'shoes-sneakers'),
('44444444-1111-0000-0000-000000000011', '44444444-0000-0000-0000-000000000004', 'Boots', 'shoes-boots'),
-- Bags
('44444444-1111-0000-0000-000000000012', '44444444-0000-0000-0000-000000000005', 'Tote Bags', 'bags-tote'),
('44444444-1111-0000-0000-000000000013', '44444444-0000-0000-0000-000000000005', 'Crossbody Bags', 'bags-crossbody'),
-- Accessories
('44444444-1111-0000-0000-000000000014', '44444444-0000-0000-0000-000000000006', 'Hats', 'accessories-hats'),
('44444444-1111-0000-0000-000000000015', '44444444-0000-0000-0000-000000000006', 'Jewelry', 'accessories-jewelry'),
('44444444-1111-0000-0000-000000000016', '44444444-0000-0000-0000-000000000006', 'Belts', 'accessories-belts')
ON CONFLICT (slug) DO NOTHING;

-- 6. Attributes & Attribute Values
INSERT INTO attributes (id, name, slug) VALUES 
('55555555-0000-0000-0000-000000000001', 'Size', 'size'),
('55555555-0000-0000-0000-000000000002', 'Color', 'color')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO attribute_values (id, attribute_id, value, slug, sort_order) VALUES 
-- Sizes
('55555555-1111-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'S', 'size-s', 1),
('55555555-1111-0000-0000-000000000002', '55555555-0000-0000-0000-000000000001', 'M', 'size-m', 2),
('55555555-1111-0000-0000-000000000003', '55555555-0000-0000-0000-000000000001', 'L', 'size-l', 3),
('55555555-1111-0000-0000-000000000004', '55555555-0000-0000-0000-000000000001', 'XL', 'size-xl', 4),
-- Colors
('55555555-1111-0000-0000-000000000005', '55555555-0000-0000-0000-000000000002', 'White', 'color-white', 1),
('55555555-1111-0000-0000-000000000006', '55555555-0000-0000-0000-000000000002', 'Black', 'color-black', 2),
('55555555-1111-0000-0000-000000000007', '55555555-0000-0000-0000-000000000002', 'Navy', 'color-navy', 3)
ON CONFLICT (slug) DO NOTHING;

-- 7. Simple Products
INSERT INTO products (id, seller_id, category_id, brand_id, name, slug, product_type, condition, price, sale_price, sku, stock_quantity, stock_status, status) VALUES
-- 1. Vintage Levi's 501 Denim Jacket (Lab 5)
('66666666-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', '44444444-1111-0000-0000-000000000002', '33333333-0000-0000-0000-000000000005', 'Vintage Levi’s 501 Denim Jacket — Size M', 'vintage-levis-501-denim-jacket-m', 'simple', 'like_new', 850000, 720000, 'STH-DJ-LEVIS-M-001', 1, 'in_stock', 'active'),
-- 2. Nike Air Force 1 Low (Lab 5)
('66666666-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', '44444444-1111-0000-0000-000000000010', '33333333-0000-0000-0000-000000000001', 'Nike Air Force 1 Low — White/White', 'nike-air-force-1-low-white', 'simple', 'used', 1200000, null, 'STH-AF1-WHT-42-001', 1, 'in_stock', 'active'),
-- 3. DirtyCoins Hoodie
('66666666-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', '44444444-1111-0000-0000-000000000007', '33333333-0000-0000-0000-000000000006', 'DirtyCoins Hoodie Black', 'dirtycoins-hoodie-black', 'simple', 'new', 650000, null, 'STH-DC-HD-BLK-001', 5, 'in_stock', 'active'),
-- 4. Ananas Canvas Tote
('66666666-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000003', '44444444-1111-0000-0000-000000000012', '33333333-0000-0000-0000-000000000011', 'Ananas Canvas Tote Cream', 'ananas-canvas-tote-cream', 'simple', 'new', 200000, null, 'STH-ANA-TOTE-CRM-001', 10, 'in_stock', 'active'),
-- 5. Levents Oversized Tee
('66666666-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000002', '44444444-1111-0000-0000-000000000008', '33333333-0000-0000-0000-000000000007', 'Levents Oversized Tee', 'levents-oversized-tee', 'simple', 'used', 350000, 250000, 'STH-LEV-TEE-001', 1, 'in_stock', 'active'),
-- 6. Coolmate Jogger
('66666666-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', '44444444-1111-0000-0000-000000000003', '33333333-0000-0000-0000-000000000009', 'Coolmate Jogger Black', 'coolmate-jogger-black', 'simple', 'like_new', 300000, null, 'STH-COOL-JOG-BLK-001', 2, 'in_stock', 'active')
ON CONFLICT (slug) DO NOTHING;

-- 8. Variable Product (Uniqlo Basic Oversize Tee)
INSERT INTO products (id, seller_id, category_id, brand_id, name, slug, product_type, condition, price, sale_price, stock_quantity, status) VALUES
('66666666-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000001', '44444444-1111-0000-0000-000000000008', '33333333-0000-0000-0000-000000000003', 'Uniqlo Basic Oversize Tee', 'uniqlo-basic-oversize-tee', 'variable', 'new', 320000, null, 0, 'active')
ON CONFLICT (slug) DO NOTHING;

-- 9. Map Attributes for the Variable Product
INSERT INTO product_attributes (product_id, attribute_id, is_variation) VALUES
('66666666-0000-0000-0000-000000000007', '55555555-0000-0000-0000-000000000001', true), -- Size
('66666666-0000-0000-0000-000000000007', '55555555-0000-0000-0000-000000000002', true)  -- Color
ON CONFLICT DO NOTHING;

-- 10. Product Variants
INSERT INTO product_variants (id, product_id, sku, price, sale_price, stock_quantity, stock_status, is_active) VALUES
-- S + White
('77777777-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000007', 'STH-UOT-S-WHT-001', 320000, 280000, 5, 'in_stock', true),
-- M + White
('77777777-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000007', 'STH-UOT-M-WHT-001', 320000, 280000, 8, 'in_stock', true),
-- L + Black
('77777777-0000-0000-0000-000000000003', '66666666-0000-0000-0000-000000000007', 'STH-UOT-L-BLK-001', 320000, null, 4, 'in_stock', true),
-- XL + Black
('77777777-0000-0000-0000-000000000004', '66666666-0000-0000-0000-000000000007', 'STH-UOT-XL-BLK-001', 350000, null, 0, 'out_of_stock', true),
-- M + Navy
('77777777-0000-0000-0000-000000000005', '66666666-0000-0000-0000-000000000007', 'STH-UOT-M-NAV-001', 320000, 280000, 6, 'in_stock', true),
-- L + Navy
('77777777-0000-0000-0000-000000000006', '66666666-0000-0000-0000-000000000007', 'STH-UOT-L-NAV-001', 320000, null, 3, 'in_stock', true)
ON CONFLICT (sku) DO NOTHING;

-- 11. Variant Attribute Values Mapping
INSERT INTO variant_attribute_values (variant_id, attribute_value_id) VALUES
-- S + White
('77777777-0000-0000-0000-000000000001', '55555555-1111-0000-0000-000000000001'), -- Size S
('77777777-0000-0000-0000-000000000001', '55555555-1111-0000-0000-000000000005'), -- Color White
-- M + White
('77777777-0000-0000-0000-000000000002', '55555555-1111-0000-0000-000000000002'), -- Size M
('77777777-0000-0000-0000-000000000002', '55555555-1111-0000-0000-000000000005'), -- Color White
-- L + Black
('77777777-0000-0000-0000-000000000003', '55555555-1111-0000-0000-000000000003'), -- Size L
('77777777-0000-0000-0000-000000000003', '55555555-1111-0000-0000-000000000006'), -- Color Black
-- XL + Black
('77777777-0000-0000-0000-000000000004', '55555555-1111-0000-0000-000000000004'), -- Size XL
('77777777-0000-0000-0000-000000000004', '55555555-1111-0000-0000-000000000006'), -- Color Black
-- M + Navy
('77777777-0000-0000-0000-000000000005', '55555555-1111-0000-0000-000000000002'), -- Size M
('77777777-0000-0000-0000-000000000005', '55555555-1111-0000-0000-000000000007'), -- Color Navy
-- L + Navy
('77777777-0000-0000-0000-000000000006', '55555555-1111-0000-0000-000000000003'), -- Size L
('77777777-0000-0000-0000-000000000006', '55555555-1111-0000-0000-000000000007')  -- Color Navy
ON CONFLICT DO NOTHING;

