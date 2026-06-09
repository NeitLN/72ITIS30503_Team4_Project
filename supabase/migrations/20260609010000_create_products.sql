create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price numeric(10, 2) not null check (price >= 0),
  category_slug text not null,
  image_url text not null,
  description text not null,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

create index if not exists products_category_slug_idx
  on public.products(category_slug);

alter table public.products enable row level security;

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products
  for select
  using (true);

insert into public.products (
  name,
  slug,
  price,
  category_slug,
  image_url,
  description,
  stock
)
values
  ('Classic Linen Shirt', 'classic-linen-shirt', 49.90, 'fashion', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80', 'A breathable linen-blend shirt with a relaxed everyday fit.', 24),
  ('Essential Cotton Tee', 'essential-cotton-tee', 24.90, 'fashion', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80', 'A soft heavyweight cotton T-shirt made for daily wear.', 42),
  ('Relaxed Denim Jacket', 'relaxed-denim-jacket', 79.90, 'fashion', 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=900&q=80', 'A timeless denim layer with a comfortable relaxed silhouette.', 16),
  ('Tailored Wide-Leg Trousers', 'tailored-wide-leg-trousers', 64.90, 'fashion', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80', 'Polished wide-leg trousers with a clean tailored drape.', 18),
  ('Everyday Knit Sweater', 'everyday-knit-sweater', 58.00, 'fashion', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80', 'A lightweight knit sweater for easy seasonal layering.', 21),
  ('Pleated Midi Skirt', 'pleated-midi-skirt', 54.90, 'fashion', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=80', 'A flowing pleated skirt with an elegant mid-length hem.', 14),
  ('Structured Blazer', 'structured-blazer', 99.00, 'fashion', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=900&q=80', 'A versatile single-breasted blazer with a modern shape.', 11),
  ('Utility Cargo Pants', 'utility-cargo-pants', 69.00, 'fashion', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80', 'Durable cargo pants with practical pockets and a tapered leg.', 19),
  ('Minimal Slip Dress', 'minimal-slip-dress', 72.00, 'fashion', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80', 'A fluid slip dress designed for effortless day-to-night styling.', 13),
  ('Modern Trench Coat', 'modern-trench-coat', 129.00, 'fashion', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80', 'A clean-lined trench coat with a removable waist belt.', 8),
  ('Leather Crossbody Bag', 'leather-crossbody-bag', 89.00, 'accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', 'A compact leather crossbody with an adjustable shoulder strap.', 17),
  ('Classic Aviator Sunglasses', 'classic-aviator-sunglasses', 45.00, 'accessories', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80', 'Lightweight aviator sunglasses with UV-protective lenses.', 30),
  ('Minimal Steel Watch', 'minimal-steel-watch', 119.00, 'accessories', 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80', 'A refined stainless steel watch with a minimal dial.', 12),
  ('Canvas Everyday Backpack', 'canvas-everyday-backpack', 69.00, 'accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', 'A spacious canvas backpack with a padded device sleeve.', 20),
  ('Woven Leather Belt', 'woven-leather-belt', 39.00, 'accessories', 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=80', 'A flexible woven leather belt finished with a brushed buckle.', 28),
  ('Silk Pattern Scarf', 'silk-pattern-scarf', 34.00, 'accessories', 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=900&q=80', 'A lightweight silk scarf with a colorful geometric print.', 25),
  ('Wireless Earbuds Case', 'wireless-earbuds-case', 19.90, 'accessories', 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80', 'A protective charging-case cover with a secure clip.', 36),
  ('Slim Card Holder', 'slim-card-holder', 29.00, 'accessories', 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80', 'A slim leather card holder with six easy-access slots.', 31),
  ('Sterling Silver Necklace', 'sterling-silver-necklace', 55.00, 'accessories', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80', 'A delicate sterling silver necklace for understated shine.', 15),
  ('Travel Organizer Pouch', 'travel-organizer-pouch', 32.00, 'accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', 'A zippered organizer for cables, chargers, and travel essentials.', 22),
  ('NovaBook Air 13', 'novabook-air-13', 999.00, 'laptop', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80', 'A thin 13-inch laptop built for mobile work and study.', 9),
  ('Vertex Pro 15', 'vertex-pro-15', 1499.00, 'laptop', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80', 'A high-performance 15-inch laptop for demanding creative work.', 6),
  ('OrbitBook Flex', 'orbitbook-flex', 1199.00, 'laptop', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=900&q=80', 'A flexible touchscreen laptop with a 360-degree hinge.', 7),
  ('PixelForge Gaming 16', 'pixelforge-gaming-16', 1799.00, 'laptop', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80', 'A powerful gaming laptop with fast graphics and cooling.', 5),
  ('SlateBook Work 14', 'slatebook-work-14', 1299.00, 'laptop', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=80', 'A durable business laptop with all-day battery life.', 10),
  ('Aster Phone X', 'aster-phone-x', 899.00, 'phone', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80', 'A flagship smartphone with a vivid display and pro camera.', 18),
  ('Aster Phone Mini', 'aster-phone-mini', 649.00, 'phone', 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=80', 'A compact smartphone that keeps flagship performance.', 23),
  ('Nova Phone Pro', 'nova-phone-pro', 1099.00, 'phone', 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=80', 'A premium phone with advanced zoom and a bright OLED screen.', 12),
  ('Orbit Fold', 'orbit-fold', 1399.00, 'phone', 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=900&q=80', 'A foldable phone that opens into a generous multitasking display.', 7),
  ('Pulse Phone 5G', 'pulse-phone-5g', 549.00, 'phone', 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=900&q=80', 'A fast 5G smartphone with dependable battery life.', 27)
on conflict (slug) do update
set
  name = excluded.name,
  price = excluded.price,
  category_slug = excluded.category_slug,
  image_url = excluded.image_url,
  description = excluded.description,
  stock = excluded.stock;
