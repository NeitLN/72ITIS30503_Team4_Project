alter table public.products
  add column if not exists seller_name text,
  add column if not exists condition text,
  add column if not exists size text,
  add column if not exists location text,
  add column if not exists is_negotiable boolean not null default false;

alter table public.categories
  add column if not exists sort_order integer not null default 0;

delete from public.products;
delete from public.categories;

insert into public.categories (name, slug, sort_order, is_active)
values
  ('T-Shirts', 't-shirts', 1, true),
  ('Hoodies', 'hoodies', 2, true),
  ('Pants', 'pants', 3, true),
  ('Shoes', 'shoes', 4, true),
  ('Bags', 'bags', 5, true),
  ('Accessories', 'accessories', 6, true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.products (
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
  ('DirtyCoins Oversized Tee', 'dirtycoins-oversized-tee', 420000, 't-shirts', '/images/products/dirtycoins-oversized-tee.jpg', 'Áo form rộng, logo in còn đẹp, mặc khoảng ba lần.', 1, 'Minh Khang', 'Như mới', 'L', 'Quận 3, TP.HCM', true),
  ('Degrey Graphic T-Shirt', 'degrey-graphic-tshirt', 280000, 't-shirts', '/images/products/degrey-graphic-tshirt.jpg', 'Áo graphic Degrey form unisex, không lỗi vải.', 1, 'Ngọc Anh', 'Tốt', 'M', 'Cầu Giấy, Hà Nội', false),
  ('Coolmate Basic Tee', 'coolmate-basic-tee', 150000, 't-shirts', '/images/products/coolmate-basic-tee.jpg', 'Áo thun basic dễ phối, vải mềm và ít nhăn.', 1, 'Tuấn Phát', 'Tốt', 'XL', 'Thủ Đức, TP.HCM', true),
  ('Levents Popular Logo Tee', 'levents-popular-logo-tee', 350000, 't-shirts', '/images/products/levents-popular-logo-tee.jpg', 'Áo logo Levents form rộng, màu còn mới.', 1, 'Hoài Thương', 'Như mới', 'L', 'Hải Châu, Đà Nẵng', false),
  ('Local Brand Washed Tee', 'local-brand-washed-tee', 220000, 't-shirts', '/images/products/local-brand-washed-tee.jpg', 'Áo washed phong cách streetwear, hiệu ứng bạc màu nguyên bản.', 1, 'Đức Huy', 'Đã qua sử dụng', 'M', 'Biên Hòa, Đồng Nai', true),
  ('Grimm DC Hoodie', 'grimm-dc-hoodie', 650000, 'hoodies', '/images/products/grimm-dc-hoodie.jpg', 'Hoodie Grimm DC dày dặn, hình in không bong tróc.', 1, 'Gia Bảo', 'Như mới', 'L', 'Bình Thạnh, TP.HCM', true),
  ('SWE Hoodie', 'swe-hoodie', 520000, 'hoodies', '/images/products/swe-hoodie.jpg', 'Hoodie SWE form boxy, giữ ấm tốt.', 1, 'Khánh Linh', 'Tốt', 'M', 'Đống Đa, Hà Nội', false),
  ('DirtyCoins Zip Hoodie', 'dirtycoins-zip-hoodie', 590000, 'hoodies', '/images/products/dirtycoins-zip-hoodie.jpg', 'Áo khoác nỉ khóa kéo, phụ kiện hoạt động tốt.', 1, 'Quốc Việt', 'Tốt', 'XL', 'Quận 10, TP.HCM', true),
  ('Degrey Varsity Hoodie', 'degrey-varsity-hoodie', 480000, 'hoodies', '/images/products/degrey-varsity-hoodie.jpg', 'Hoodie varsity phối màu dễ mặc, bo tay còn chắc.', 1, 'Mai Chi', 'Đã qua sử dụng', 'L', 'Ninh Kiều, Cần Thơ', true),
  ('Davies Denim Jacket', 'davies-denim-jacket', 720000, 'hoodies', '/images/products/davies-denim-jacket.jpg', 'Áo khoác denim Davies form rộng, chất denim đứng dáng.', 1, 'Thanh Tùng', 'Như mới', 'M', 'Hai Bà Trưng, Hà Nội', false),
  ('Bad Habits Cargo Pants', 'bad-habits-cargo-pants', 550000, 'pants', '/images/products/bad-habits-cargo-pants.jpg', 'Quần cargo nhiều túi, khóa và dây rút đầy đủ.', 1, 'Nhật Nam', 'Tốt', 'L', 'Quận 7, TP.HCM', true),
  ('Davies Straight Jeans', 'davies-straight-jeans', 450000, 'pants', '/images/products/davies-straight-jeans.jpg', 'Quần jeans ống suông, wash xanh cổ điển.', 1, 'Phương Nhi', 'Như mới', 'M', 'Thanh Xuân, Hà Nội', false),
  ('Degrey Wide-Leg Pants', 'degrey-wide-leg-pants', 390000, 'pants', '/images/products/degrey-wide-leg-pants.jpg', 'Quần ống rộng unisex, cạp và đường may còn tốt.', 1, 'Bảo Trân', 'Tốt', 'S', 'Gò Vấp, TP.HCM', true),
  ('SWE Nylon Pants', 'swe-nylon-pants', 420000, 'pants', '/images/products/swe-nylon-pants.jpg', 'Quần nylon nhẹ, hợp phong cách sporty street.', 1, 'Anh Duy', 'Tốt', 'L', 'Sơn Trà, Đà Nẵng', false),
  ('Coolmate Jogger Pants', 'coolmate-jogger-pants', 250000, 'pants', '/images/products/coolmate-jogger-pants.jpg', 'Jogger co giãn thoải mái, phù hợp mặc hằng ngày.', 1, 'Hữu Đạt', 'Đã qua sử dụng', 'XL', 'Tân Bình, TP.HCM', true),
  ('Biti''s Hunter Street', 'bitis-hunter-street', 890000, 'shoes', '/images/products/bitis-hunter-street.jpg', 'Giày Hunter Street chính hãng, đế còn rất mới.', 1, 'Quang Minh', 'Như mới', '42', 'Quận 1, TP.HCM', true),
  ('Ananas Basas Sneakers', 'ananas-basas', 450000, 'shoes', '/images/products/ananas-basas.jpg', 'Ananas Basas màu trung tính, đã vệ sinh sạch.', 1, 'Thu Hà', 'Tốt', '38', 'Ba Đình, Hà Nội', false),
  ('Ananas Vintas Low', 'ananas-vintas-low', 520000, 'shoes', '/images/products/ananas-vintas.jpg', 'Vintas Low dễ phối đồ, hộp và dây giày đầy đủ.', 1, 'Trọng Nhân', 'Như mới', '41', 'Quận 5, TP.HCM', true),
  ('Biti''s Hunter Core', 'bitis-hunter-core', 680000, 'shoes', '/images/products/bitis-hunter-core.jpg', 'Hunter Core nhẹ chân, phần upper không rách.', 1, 'Yến Nhi', 'Tốt', '37', 'Hoàn Kiếm, Hà Nội', false),
  ('Rie Nevada Sneakers', 'rie-nevada-sneakers', 1200000, 'shoes', '/images/products/rie-nevada-sneakers.jpg', 'Rie Nevada bản phối giới hạn, mang thử trong nhà.', 1, 'Lâm Hoàng', 'Như mới', '43', 'Phú Nhuận, TP.HCM', true),
  ('Levents Tote Bag', 'levents-tote-bag', 250000, 'bags', '/images/products/levents-tote-bag.jpg', 'Tote Levents rộng, quai chắc, không dính bẩn.', 1, 'Thảo Vy', 'Tốt', 'Freesize', 'Quận 4, TP.HCM', true),
  ('Degrey Canvas Bag', 'degrey-canvas-bag', 320000, 'bags', '/images/products/degrey-canvas-bag.jpg', 'Túi canvas Degrey nhiều ngăn, phù hợp đi học.', 1, 'Minh Thư', 'Như mới', 'Freesize', 'Cầu Giấy, Hà Nội', false),
  ('DirtyCoins Crossbody Bag', 'dirtycoins-crossbody-bag', 390000, 'bags', '/images/products/dirtycoins-crossbody-bag.jpg', 'Túi đeo chéo nhỏ gọn, khóa kéo mượt.', 1, 'Đình Long', 'Tốt', 'Freesize', 'Bình Thạnh, TP.HCM', true),
  ('Davies Mini Shoulder Bag', 'davies-mini-shoulder-bag', 340000, 'bags', '/images/products/davies-mini-shoulder-bag.jpg', 'Túi vai mini phong cách Y2K, dây đeo điều chỉnh được.', 1, 'Kim Ngân', 'Như mới', 'Freesize', 'Hải Châu, Đà Nẵng', false),
  ('SWE Utility Bag', 'swe-utility-bag', 430000, 'bags', '/images/products/swe-utility-bag.jpg', 'Utility bag nhiều ngăn, chất liệu chống bám nước nhẹ.', 1, 'Văn Toàn', 'Đã qua sử dụng', 'Freesize', 'Thủ Đức, TP.HCM', true),
  ('DirtyCoins Logo Cap', 'dirtycoins-logo-cap', 280000, 'accessories', '/images/products/dirtycoins-logo-cap.jpg', 'Nón logo DirtyCoins, khóa tăng giảm còn tốt.', 1, 'Mạnh Hùng', 'Tốt', 'Freesize', 'Quận 11, TP.HCM', true),
  ('Degrey Beanie', 'degrey-beanie', 180000, 'accessories', '/images/products/degrey-beanie.jpg', 'Mũ len Degrey mềm, ít sử dụng.', 1, 'Hồng Nhung', 'Như mới', 'Freesize', 'Đống Đa, Hà Nội', false),
  ('Levents Chain Necklace', 'levents-chain-necklace', 260000, 'accessories', '/images/products/levents-chain-necklace.jpg', 'Dây chuyền phong cách streetwear, không xỉn màu.', 1, 'Thiên Phúc', 'Tốt', 'Freesize', 'Quận 8, TP.HCM', true),
  ('Local Brand Silver Ring', 'local-brand-silver-ring', 150000, 'accessories', '/images/products/local-brand-silver-ring.jpg', 'Nhẫn bạc bản nhỏ, hợp phối nhiều phong cách.', 1, 'Lan Anh', 'Đã qua sử dụng', 'Size 9', 'Hà Đông, Hà Nội', true),
  ('SWE Logo Socks Set', 'swe-logo-socks', 120000, 'accessories', '/images/products/swe-logo-socks.jpg', 'Set vớ logo SWE hai đôi, chưa qua sử dụng.', 1, 'Hoàng Sơn', 'Mới', 'Freesize', 'Nha Trang, Khánh Hòa', false);

alter table public.products
  alter column seller_name set not null,
  alter column condition set not null,
  alter column size set not null,
  alter column location set not null;
