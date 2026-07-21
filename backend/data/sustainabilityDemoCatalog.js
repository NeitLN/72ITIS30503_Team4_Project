/**
 * StyleHub — Phase 15 sustainability dataset (data only).
 * ------------------------------------------------------------------
 * This file has no I/O and makes no Supabase calls — it is the single
 * source of truth imported by the seeder, validator, cleanup script, and
 * the Phase 15 regression suite, the same "manifest" pattern already used
 * by backend/scripts/data/verifiedCatalog.js for the 148-product seed
 * catalog.
 *
 * This is prepared marketplace activity used to populate real, non-zero
 * Circular Impact metrics for a university coursework project — it is not
 * organic third-party customer activity. It is presented to shoppers as
 * ordinary listings from three small resale sellers ("Rewear" in Hà Nội,
 * Sài Gòn, and Đà Nẵng) and one ordinary buyer — there is no "Demo"/"Test"/
 * "Sample" wording anywhere a shopper, seller, or lecturer browsing the
 * live site would see it. The academic disclosure lives centrally on
 * `/sustainability` (see docs/circular-impact-methodology.md) rather than
 * being repeated on every product card or profile.
 *
 * These records ARE still exactly identifiable and safely removable —
 * just not by visible naming. Every account here is created on the
 * reserved, non-routable `example.test` email domain (RFC 2606 reserves
 * the "example." label; ".test" is an IANA-reserved TLD guaranteed to
 * never resolve or accept mail — never shown to other users). Every demo
 * listing/order is identified relationally: by `seller_id`/`user_id`
 * membership in these four accounts, resolved fresh from the database on
 * every run (see backend/scripts/cleanupSustainabilityDemo.js) — never a
 * cached ID file, never a partial-name match.
 *
 * All images are pre-existing, already-committed local static assets from
 * frontend/public/images/products/ (never hotlinked, never AI-generated).
 * See docs/sustainability-demo-data.md for the full image provenance
 * mapping and the reasoning for reusing already-verified catalog images
 * for these additional listings of the same real branded items.
 *
 * Product Journey claims are seller_declared only — not certified, not
 * independently verified. No CO2/water/waste/carbon figure is computed or
 * implied anywhere in this dataset.
 */

const EMAIL_DOMAIN = 'example.test';
const ORDER_NOTE = 'Giao giờ hành chính, vui lòng gọi trước khi giao.';

// ---------------------------------------------------------------------------
// Sellers + buyer. `key` is the internal reference used by DEMO_LISTINGS and
// DEMO_ORDERS below; it is never written to the database. Display
// name/username/bio are ordinary, realistic shop identities — the only
// non-visible technical marker is the email domain above.
// ---------------------------------------------------------------------------
const DEMO_SELLERS = [
  {
    key: 'hanoi',
    username: 'rewear-hanoi',
    email: `rewear.hanoi@${EMAIL_DOMAIN}`,
    displayName: 'Rewear Hà Nội',
    location: 'Hà Nội',
    bio: 'Đồ si và sneaker tuyển tay, ưu tiên tình trạng thật. Nhận ký gửi giày đã qua sử dụng tại Hà Nội.',
  },
  {
    key: 'hcmc',
    username: 'rewear-saigon',
    email: `rewear.saigon@${EMAIL_DOMAIN}`,
    displayName: 'Rewear Sài Gòn',
    location: 'Thành phố Hồ Chí Minh',
    bio: 'Túi xách và phụ kiện da đã qua sử dụng, được kiểm tra kỹ và vệ sinh trước khi lên kệ. Giao nhanh nội thành TP.HCM.',
  },
  {
    key: 'danang',
    username: 'rewear-danang',
    email: `rewear.danang@${EMAIL_DOMAIN}`,
    displayName: 'Rewear Đà Nẵng',
    location: 'Đà Nẵng',
    bio: 'Đồ second-hand tuyển chọn tại Đà Nẵng — quần áo và túi xách còn tốt, giá hợp lý.',
  },
];

const DEMO_BUYER = {
  key: 'buyer',
  username: 'bao-tram',
  email: `bao.tram@${EMAIL_DOMAIN}`,
  displayName: 'Bảo Trâm',
  location: 'Thành phố Hồ Chí Minh',
  bio: 'Yêu thích đồ vintage và thời trang bền vững.',
};

const DEMO_ACCOUNTS = [...DEMO_SELLERS, DEMO_BUYER];

// ---------------------------------------------------------------------------
// Listings. Every `image` file already exists, committed, in
// frontend/public/images/products/ — see docs/sustainability-demo-data.md
// for the per-listing provenance note. Categories/brand slugs match the
// canonical taxonomy already validated by backend/scripts/data/verifiedCatalog.js.
// Product Journey fields follow the exact shape validated by
// backend/constants/sustainability.js. Titles keep the honest lifecycle
// parenthetical (Pre-loved/Deadstock/Repaired/Upcycled) — the same
// convention real resale marketplaces use — but carry no "Demo"/"Test"/
// "Sample" wording and no meta commentary about the dataset itself.
// ---------------------------------------------------------------------------
const DEMO_LISTINGS = [
  {
    key: 'vans-old-skool',
    sellerKey: 'hanoi',
    image: 'vans-old-skool-black.jpg',
    title: 'Vans Old Skool Black (Pre-loved)',
    category_slug: 'shoes',
    brand_slug: 'vans',
    condition: 'good',
    size: 'EU 40',
    price: 950000,
    sale_price: null,
    stock: 3,
    is_featured: true,
    description: 'Vans Old Skool Black đã qua sử dụng, được vệ sinh kỹ và còn giữ phom dáng tốt. Phù hợp phối đồ streetwear hằng ngày.',
    lifecycle_type: 'pre_loved',
    material: 'Vải canvas và da lộn (suede)',
    product_story: 'Đôi giày đã qua một chủ sở hữu, được bảo quản trong hộp gốc và không sửa chữa gì thêm.',
    reuse_packaging: true,
  },
  {
    key: 'nike-af1',
    sellerKey: 'hanoi',
    image: 'nike-air-force-1-white.jpg',
    title: 'Nike Air Force 1 Low White (Pre-loved)',
    category_slug: 'shoes',
    brand_slug: 'nike',
    condition: 'good',
    size: 'EU 42',
    price: 2200000,
    sale_price: 1980000,
    stock: 2,
    is_featured: false,
    description: 'Nike Air Force 1 Low White đã qua sử dụng, ảnh chụp thực tế ngoài trời, đế và thân giày còn sạch.',
    lifecycle_type: 'pre_loved',
    material: 'Da tổng hợp và cao su',
    product_story: 'Đôi giày đã mang vài lần ngoài trời, được vệ sinh trước khi đăng bán.',
    reuse_packaging: true,
  },
  {
    key: 'adidas-stansmith',
    sellerKey: 'hanoi',
    image: 'adidas-stan-smith.jpg',
    title: 'Adidas Stan Smith (Deadstock)',
    category_slug: 'shoes',
    brand_slug: 'adidas',
    condition: 'new_with_tags',
    size: 'EU 41',
    price: 1150000,
    sale_price: null,
    stock: 1,
    is_featured: false,
    description: 'Adidas Stan Smith hàng tồn kho chưa qua sử dụng, ảnh thực tế còn nguyên thẻ bài (hangtag) đính kèm.',
    lifecycle_type: 'deadstock',
    material: 'Da thật và cao su',
    product_story: 'Giày là hàng lưu kho cũ chưa từng bán ra, còn nguyên thẻ bài như trong ảnh.',
    reuse_packaging: false,
  },
  {
    key: 'drmartens-1460',
    sellerKey: 'hanoi',
    image: 'dr-martens-1460-boots.jpg',
    title: 'Dr. Martens 1460 Oxblood Boots (Repaired)',
    category_slug: 'boots',
    brand_slug: 'dr-martens',
    condition: 'fair',
    size: 'EU 39',
    price: 1850000,
    sale_price: null,
    stock: 1,
    is_featured: false,
    description: 'Đôi Dr. Martens 1460 Oxblood đã được sửa chữa: thay đế ngoài và gia cố đường chỉ mũi giày, vẫn còn form dáng tốt để dùng tiếp.',
    lifecycle_type: 'repaired',
    material: 'Da thật (leather) AirWair',
    repair_history: 'Đã thay đế ngoài (resole) và khâu lại đường chỉ mũi giày tại một thợ đóng giày địa phương vào đầu năm nay.',
    product_story: 'Đôi boots được giữ dùng lâu dài thay vì bỏ đi khi mòn đế, nên đã mang đi sửa.',
    reuse_packaging: false,
  },
  {
    key: 'nb-550',
    sellerKey: 'hcmc',
    image: 'new-balance-550-burgundy.jpg',
    title: 'New Balance 550 Burgundy (Deadstock)',
    category_slug: 'shoes',
    brand_slug: 'new-balance',
    condition: 'new_with_tags',
    size: 'EU 42',
    price: 2450000,
    sale_price: null,
    stock: 2,
    is_featured: false,
    description: 'New Balance 550 Burgundy hàng tồn kho chưa qua sử dụng, còn nguyên hộp.',
    lifecycle_type: 'deadstock',
    material: 'Da và vải mesh',
    product_story: 'Giày là hàng mẫu cửa hàng cũ chưa từng bán ra, được thanh lý nguyên trạng.',
    reuse_packaging: true,
  },
  {
    key: 'birkenstock-arizona',
    sellerKey: 'hcmc',
    image: 'birkenstock-arizona-esd.jpg',
    title: 'Birkenstock Arizona ESD (Pre-loved)',
    category_slug: 'slides',
    brand_slug: 'birkenstock',
    condition: 'like_new',
    size: 'EU 40',
    price: 850000,
    sale_price: null,
    stock: 1,
    is_featured: false,
    description: 'Dép Birkenstock Arizona ESD đã qua sử dụng, đế lie (cork) còn form tốt.',
    lifecycle_type: 'pre_loved',
    material: 'Đế lie (cork) và da',
    product_story: 'Dép được dùng trong nhà, ít tiếp xúc nước, còn giữ phom đế.',
    reuse_packaging: false,
  },
  {
    key: 'coach-tabby',
    sellerKey: 'hcmc',
    image: 'coach-tabby-shoulder-bag.jpg',
    title: 'Coach Tabby Quilted Shoulder Bag (Repaired)',
    category_slug: 'bags',
    brand_slug: 'coach',
    condition: 'good',
    size: 'One Size',
    price: 3200000,
    sale_price: 2850000,
    stock: 3,
    is_featured: true,
    description: 'Túi Coach Tabby đã được sửa: thay móc khóa kim loại và khâu lại quai đeo, vẫn dùng tốt như mới.',
    lifecycle_type: 'repaired',
    material: 'Da quilted (chần bông)',
    repair_history: 'Đã thay móc khóa kim loại bị gãy và khâu lại quai đeo bị bung chỉ tại thợ sửa đồ da.',
    product_story: 'Túi được sửa để tiếp tục sử dụng thay vì bỏ đi khi phụ kiện hỏng.',
    reuse_packaging: true,
  },
  {
    key: 'loop-mend-bag',
    sellerKey: 'hcmc',
    image: 'loen-shoulder-bag.jpg',
    title: 'Loop & Mend Shoulder Bag (Upcycled)',
    category_slug: 'crossbody-bags',
    brand_slug: null,
    customBrandName: 'Loop & Mend Studio',
    condition: 'good',
    size: 'One Size',
    price: 480000,
    sale_price: null,
    stock: 3,
    is_featured: false,
    description: 'Túi đeo vai da được làm lại (upcycled) bởi xưởng Loop & Mend Studio từ da thuộc còn dư sau sản xuất, thay khoá kéo và dây quai mới.',
    lifecycle_type: 'upcycled',
    material: 'Da thuộc tái sử dụng',
    upcycle_details: 'Túi được làm lại từ các mảnh da thuộc còn dư sau sản xuất, thay khoá kéo và dây quai da mới để kéo dài vòng đời sử dụng.',
    product_story: 'Đây là sản phẩm của một xưởng nhỏ độc lập chuyên tái thiết kế đồ da cũ.',
    reuse_packaging: true,
  },
  {
    key: 'levi-tote',
    sellerKey: 'danang',
    image: 'levi-tote-bag.jpg',
    title: "Levi's Canvas Carry-All Tote (Upcycled)",
    category_slug: 'bags',
    brand_slug: 'levis',
    condition: 'good',
    size: 'One Size',
    price: 420000,
    sale_price: null,
    stock: 5,
    is_featured: false,
    description: "Túi tote canvas Levi's được phối lại từ vải jeans cũ, thêm patch thêu tay thủ công.",
    lifecycle_type: 'upcycled',
    material: 'Vải canvas và denim tái chế',
    upcycle_details: "Túi tote canvas gốc được phối thêm mảnh vải jeans cũ và một patch thêu tay thủ công để kéo dài vòng đời sử dụng.",
    product_story: 'Đây là một lô nhỏ được làm lại thủ công từ vải denim còn dư, không phải sản xuất hàng loạt.',
    reuse_packaging: true,
  },
  {
    key: 'ck-gabine',
    sellerKey: 'danang',
    image: 'charles-keith-gabine-bag.jpg',
    title: 'Charles & Keith Gabine Saddle Bag (Pre-loved)',
    category_slug: 'crossbody-bags',
    brand_slug: 'charles-keith',
    condition: 'excellent',
    size: 'One Size',
    price: 990000,
    sale_price: null,
    stock: 1,
    is_featured: false,
    description: 'Túi đeo chéo Charles & Keith Gabine đã qua sử dụng, tình trạng rất tốt, ít dấu hiệu sử dụng.',
    lifecycle_type: 'pre_loved',
    material: 'Da tổng hợp (vegan leather)',
    product_story: 'Túi được dùng khoảng 6 tháng, bảo quản trong túi vải kèm theo.',
    reuse_packaging: false,
  },
  {
    key: 'uniqlo-tee',
    sellerKey: 'danang',
    image: 'uniqlo-u-crew-neck-tee.jpg',
    title: 'Uniqlo U Crew Neck Tee (New)',
    category_slug: 't-shirts',
    brand_slug: 'uniqlo',
    condition: 'new_with_tags',
    size: 'L',
    price: 199000,
    sale_price: null,
    stock: 4,
    is_featured: false,
    description: 'Áo thun Uniqlo U Crew Neck còn mới nguyên tem mác.',
    lifecycle_type: 'new',
    material: 'Cotton 100%',
    product_story: 'Sản phẩm mới, chưa qua sử dụng.',
    reuse_packaging: false,
  },
  {
    key: 'ader-error-tee',
    sellerKey: 'danang',
    image: 'ader-error-tetris-logo-tee.jpg',
    title: 'Ader Error Tetris Logo Tee',
    category_slug: 't-shirts',
    brand_slug: 'ader-error',
    condition: 'good',
    size: 'M',
    price: 750000,
    sale_price: null,
    stock: 2,
    is_featured: false,
    description: 'Áo thun Ader Error Tetris Logo, form rộng, phù hợp phối đồ streetwear.',
    lifecycle_type: 'not_specified',
    reuse_packaging: false,
  },
];

// ---------------------------------------------------------------------------
// Orders, expressed as references to DEMO_LISTINGS[].key. The seeder drives
// these through the REAL checkout (POST /api/orders — atomic RPC), the SAME
// per-item fulfillment API used by real sellers, and the REAL cancel
// endpoint. No impact number is ever written directly.
// ---------------------------------------------------------------------------
const DEMO_ORDERS = [
  {
    key: 'completed-multiseller',
    buyerKey: 'buyer',
    // Deliberately spans all three sellers in one order, and one line has
    // quantity 2 — covers the multi-seller + quantity > 1 requirements in a
    // single completed order.
    lines: [
      { listingKey: 'vans-old-skool', quantity: 1 },
      { listingKey: 'coach-tabby', quantity: 1 },
      { listingKey: 'levi-tote', quantity: 2 },
    ],
    outcome: 'completed',
  },
  {
    key: 'cancelled-exclusion',
    buyerKey: 'buyer',
    lines: [
      { listingKey: 'adidas-stansmith', quantity: 1 },
    ],
    outcome: 'cancelled',
  },
];

const NAMESPACE = {
  EMAIL_DOMAIN,
  ORDER_NOTE,
};

module.exports = {
  NAMESPACE,
  DEMO_SELLERS,
  DEMO_BUYER,
  DEMO_ACCOUNTS,
  DEMO_LISTINGS,
  DEMO_ORDERS,
};
