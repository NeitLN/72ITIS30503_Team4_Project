alter table public.products
  add column if not exists brand text;

delete from public.products;

insert into public.products (
  brand,
  name,
  slug,
  price,
  category_slug,
  image_url,
  description,
  stock,
  seller_name,
  condition,
  size,
  location,
  is_negotiable
)
values
  ('Nike', 'Sportswear Club T-Shirt', 'nike-sportswear-club-tee', 380000, 't-shirts', '/images/products/nike-sportswear-club-tee.jpg', 'Classic cotton Nike tee with a clean embroidered logo.', 1, 'Minh Tran', 'Excellent', 'L', 'District 3, Ho Chi Minh City', true),
  ('Adidas', 'Trefoil Essentials T-Shirt', 'adidas-trefoil-tee', 320000, 't-shirts', '/images/products/adidas-trefoil-tee.jpg', 'Soft Adidas jersey tee with the signature Trefoil graphic.', 1, 'Linh Nguyen', 'Like New', 'M', 'Cau Giay, Hanoi', false),
  ('Uniqlo', 'U Crew Neck T-Shirt', 'uniqlo-u-crew-neck-tee', 250000, 't-shirts', '/images/products/uniqlo-u-crew-neck-tee.jpg', 'Heavyweight Uniqlo U cotton tee in an easy relaxed cut.', 1, 'Khoa Le', 'Good', 'XL', 'Thu Duc, Ho Chi Minh City', true),
  ('DirtyCoins', 'Oversized Logo T-Shirt', 'dirtycoins-oversized-tee-v2', 420000, 't-shirts', '/images/products/dirtycoins-oversized-tee.jpg', 'Oversized DirtyCoins tee with a crisp front logo print.', 1, 'Bao Anh', 'Like New', 'L', 'Hai Chau, Da Nang', false),
  ('Levents', 'Popular Logo T-Shirt', 'levents-popular-logo-tee-v2', 350000, 't-shirts', '/images/products/levents-popular-logo-tee.jpg', 'Popular Levents boxy tee with minimal logo detailing.', 1, 'Duc Huy', 'Excellent', 'M', 'Bien Hoa, Dong Nai', true),
  ('Puma', 'Essentials Fleece Hoodie', 'puma-essentials-hoodie', 650000, 'hoodies', '/images/products/puma-essentials-hoodie.jpg', 'Warm Puma fleece hoodie with a comfortable regular fit.', 1, 'Gia Bao', 'Like New', 'L', 'Binh Thanh, Ho Chi Minh City', true),
  ('H&M', 'Relaxed Fit Hoodie', 'hm-relaxed-fit-hoodie', 480000, 'hoodies', '/images/products/hm-relaxed-fit-hoodie.jpg', 'Relaxed cotton-blend hoodie in a versatile neutral tone.', 1, 'Khanh Linh', 'Excellent', 'M', 'Dong Da, Hanoi', false),
  ('SWE', 'Boxy Logo Hoodie', 'swe-boxy-logo-hoodie', 520000, 'hoodies', '/images/products/swe-hoodie.jpg', 'Boxy SWE hoodie with heavyweight fabric and ribbed trims.', 1, 'Quoc Viet', 'Good', 'XL', 'District 10, Ho Chi Minh City', true),
  ('Hades', 'Fallen Angel Graphic Hoodie', 'hades-fallen-angel-hoodie', 590000, 'hoodies', '/images/products/grimm-dc-hoodie.jpg', 'Statement Hades hoodie with a large back graphic.', 1, 'Mai Chi', 'Excellent', 'L', 'Ninh Kieu, Can Tho', true),
  ('Degrey', 'Varsity Patch Hoodie', 'degrey-varsity-patch-hoodie', 480000, 'hoodies', '/images/products/degrey-varsity-hoodie.jpg', 'Varsity-inspired Degrey hoodie with embroidered patches.', 1, 'Thanh Tung', 'Gently Used', 'M', 'Hai Ba Trung, Hanoi', false),
  ('Levi''s', '501 Original Fit Jeans', 'levis-501-original-jeans', 900000, 'pants', '/images/products/levis-501-original-jeans.jpg', 'Iconic straight-leg Levi''s 501 jeans in a medium wash.', 1, 'Nhat Nam', 'Excellent', 'W31 L30', 'District 7, Ho Chi Minh City', true),
  ('Zara', 'High-Waist Wide-Leg Trousers', 'zara-wide-leg-trousers', 550000, 'pants', '/images/products/zara-wide-leg-trousers.jpg', 'Flowing Zara trousers with a flattering high-rise waist.', 1, 'Phuong Nhi', 'Like New', 'M', 'Thanh Xuan, Hanoi', false),
  ('Bad Habits', 'Utility Cargo Pants', 'bad-habits-utility-cargo-pants', 550000, 'pants', '/images/products/bad-habits-cargo-pants.jpg', 'Streetwear cargo pants with adjustable hems and utility pockets.', 1, 'Bao Tran', 'Excellent', 'S', 'Go Vap, Ho Chi Minh City', true),
  ('Routine', 'Smart Tapered Chinos', 'routine-smart-tapered-chinos', 390000, 'pants', '/images/products/routine-smart-chinos.jpg', 'Clean tapered Routine chinos suitable for work or weekends.', 1, 'Anh Duy', 'Good', 'L', 'Son Tra, Da Nang', false),
  ('Coolmate', 'Daily Jogger Pants', 'coolmate-daily-jogger-pants', 250000, 'pants', '/images/products/coolmate-jogger-pants.jpg', 'Stretchy Coolmate joggers designed for everyday comfort.', 1, 'Huu Dat', 'Gently Used', 'XL', 'Tan Binh, Ho Chi Minh City', true),
  ('Nike', 'Free RN Flyknit Running Shoes', 'nike-free-rn-flyknit', 1400000, 'shoes', '/images/products/nike-air-force-1.jpg', 'Lightweight Nike Flyknit running shoes with a flexible Free sole.', 1, 'Quang Minh', 'Excellent', 'EU 42', 'District 1, Ho Chi Minh City', true),
  ('Adidas', 'Samba OG Cloud White', 'adidas-samba-og-cloud-white', 2200000, 'shoes', '/images/products/adidas-samba-og.jpg', 'Adidas Samba OG with leather upper and gum sole.', 1, 'Thu Ha', 'Like New', 'EU 38', 'Ba Dinh, Hanoi', false),
  ('New Balance', '550 White Green', 'new-balance-550-white-green', 2400000, 'shoes', '/images/products/new-balance-550.jpg', 'Retro New Balance 550 basketball sneaker in white and green.', 1, 'Trong Nhan', 'Excellent', 'EU 41', 'District 5, Ho Chi Minh City', true),
  ('Converse', 'Chuck 70 High Top', 'converse-chuck-70-high-top', 1300000, 'shoes', '/images/products/converse-chuck-70.jpg', 'Canvas Chuck 70 high tops with vintage-style rubber foxing.', 1, 'Yen Nhi', 'Good', 'EU 37', 'Hoan Kiem, Hanoi', false),
  ('Vans', 'Old Skool Black White', 'vans-old-skool-black-white', 1100000, 'shoes', '/images/products/vans-old-skool.jpg', 'Classic Vans Old Skool with suede panels and side stripe.', 1, 'Lam Hoang', 'Like New', 'EU 43', 'Phu Nhuan, Ho Chi Minh City', true),
  ('Coach', 'Tabby Shoulder Bag 26', 'coach-tabby-shoulder-bag-26', 4800000, 'bags', '/images/products/coach-tabby-shoulder-bag.jpg', 'Structured Coach Tabby shoulder bag with polished hardware.', 1, 'Thao Vy', 'Excellent', 'Medium', 'District 4, Ho Chi Minh City', true),
  ('Charles & Keith', 'Gabine Saddle Bag', 'charles-keith-gabine-saddle-bag', 1900000, 'bags', '/images/products/charles-keith-gabine-bag.jpg', 'Elegant Gabine saddle bag with adjustable shoulder strap.', 1, 'Minh Thu', 'Like New', 'Medium', 'Cau Giay, Hanoi', false),
  ('Michael Kors', 'Jet Set Travel Tote', 'michael-kors-jet-set-travel-tote', 3900000, 'bags', '/images/products/michael-kors-jet-set-tote.jpg', 'Spacious Michael Kors tote with signature coated canvas.', 1, 'Dinh Long', 'Excellent', 'Large', 'Binh Thanh, Ho Chi Minh City', true),
  ('Levents', 'Classic Canvas Tote Bag', 'levents-classic-canvas-tote', 250000, 'bags', '/images/products/levents-tote-bag.jpg', 'Roomy Levents canvas tote with strong handles and clean print.', 1, 'Kim Ngan', 'Good', 'One Size', 'Hai Chau, Da Nang', false),
  ('Davies', 'Mini Shoulder Bag', 'davies-mini-shoulder-bag-v2', 340000, 'bags', '/images/products/davies-mini-shoulder-bag.jpg', 'Compact Davies shoulder bag with an adjustable strap.', 1, 'Van Toan', 'Like New', 'Small', 'Thu Duc, Ho Chi Minh City', true),
  ('Adidas', 'Trefoil Baseball Cap', 'adidas-trefoil-baseball-cap', 350000, 'accessories', '/images/products/adidas-trefoil-cap.jpg', 'Cotton Adidas cap with embroidered Trefoil logo.', 1, 'Manh Hung', 'Excellent', 'Adjustable', 'District 11, Ho Chi Minh City', true),
  ('Nike', 'Everyday Crew Socks 3-Pack', 'nike-everyday-crew-socks', 180000, 'accessories', '/images/products/nike-everyday-socks.jpg', 'Three-pair Nike crew sock set in clean white.', 1, 'Hong Nhung', 'New with Tags', 'M', 'Dong Da, Hanoi', false),
  ('Hades', 'Logo Knit Beanie', 'hades-logo-knit-beanie', 220000, 'accessories', '/images/products/hades-logo-beanie.jpg', 'Soft Hades knit beanie with a small woven logo patch.', 1, 'Thien Phuc', 'Like New', 'One Size', 'District 8, Ho Chi Minh City', true),
  ('Degrey', 'Layered Chain Necklace', 'degrey-layered-chain-necklace', 260000, 'accessories', '/images/products/degrey-chain-necklace.jpg', 'Silver-tone layered Degrey chain for a streetwear finish.', 1, 'Lan Anh', 'Excellent', 'One Size', 'Ha Dong, Hanoi', true),
  ('DirtyCoins', 'Embroidered Logo Cap', 'dirtycoins-embroidered-logo-cap', 280000, 'accessories', '/images/products/dirtycoins-logo-cap.jpg', 'Adjustable DirtyCoins cap with embroidered front branding.', 1, 'Hoang Son', 'Good', 'Adjustable', 'Nha Trang, Khanh Hoa', false);

alter table public.products
  alter column brand set not null;
