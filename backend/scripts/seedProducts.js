const { faker } = require('@faker-js/faker');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' }); // Load root .env
require('dotenv').config(); // Load backend .env if it exists

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL are required to run the product seeder.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const CATEGORY_SLUGS = [
  't-shirts',
  'jerseys',
  'shirts',
  'hoodies',
  'pants',
  'shorts',
  'shoes',
  'slides',
  'caps-hats',
  'accessories',
  'backpacks',
  'crossbody-bags',
  'bowler-bags'
];

const CONDITIONS = [
  'New with Tags',
  'Like New',
  'Excellent',
  'Good',
  'Gently Used'
];

const IMAGES = [
  '/images/products/accessories-extra1.jpg',
  '/images/products/adidas-samba-og.jpg',
  '/images/products/adidas-trefoil-cap.jpg',
  '/images/products/adidas-trefoil-tee.jpg',
  '/images/products/backpack-1.jpg',
  '/images/products/backpack-2.jpg',
  '/images/products/backpack-3.jpg',
  '/images/products/backpack-4.jpg',
  '/images/products/bad-habits-cargo-pants.jpg',
  '/images/products/bags-extra1.jpg',
  '/images/products/bowler-bag-1.jpg',
  '/images/products/bowler-bag-2.jpg',
  '/images/products/bowler-bag-3.jpg',
  '/images/products/bowler-bag-4.jpg',
  '/images/products/cap-1.jpg',
  '/images/products/cap-2.jpg',
  '/images/products/cap-3.jpg',
  '/images/products/cap-4.jpg',
  '/images/products/charles-keith-gabine-bag.jpg',
  '/images/products/coach-tabby-shoulder-bag.jpg',
  '/images/products/converse-chuck-70.jpg',
  '/images/products/coolmate-jogger-pants.jpg',
  '/images/products/crossbody-1.jpg',
  '/images/products/crossbody-2.jpg',
  '/images/products/crossbody-3.jpg',
  '/images/products/crossbody-4.jpg',
  '/images/products/davies-mini-shoulder-bag.jpg',
  '/images/products/degrey-chain-necklace.jpg',
  '/images/products/degrey-varsity-hoodie.jpg',
  '/images/products/dirtycoins-logo-cap.jpg',
  '/images/products/dirtycoins-oversized-tee.jpg',
  '/images/products/grimm-dc-hoodie.jpg',
  '/images/products/hades-logo-beanie.jpg',
  '/images/products/hm-relaxed-fit-hoodie.jpg',
  '/images/products/hoodie-extra1.jpg',
  '/images/products/jacket-1.jpg',
  '/images/products/jacket-2.jpg',
  '/images/products/jacket-3.jpg',
  '/images/products/jacket-4.jpg',
  '/images/products/jersey-1.jpg',
  '/images/products/jersey-2.jpg',
  '/images/products/jersey-3.jpg',
  '/images/products/jersey-4.jpg',
  '/images/products/levents-popular-logo-tee.jpg',
  '/images/products/levents-tote-bag.jpg',
  '/images/products/levis-501-original-jeans.jpg',
  '/images/products/michael-kors-jet-set-tote.jpg',
  '/images/products/new-balance-550.jpg',
  '/images/products/nike-air-force-1.jpg',
  '/images/products/nike-everyday-socks.jpg',
  '/images/products/nike-sportswear-club-tee.jpg',
  '/images/products/pants-extra1.jpg',
  '/images/products/phone-case-1.jpg',
  '/images/products/phone-case-2.jpg',
  '/images/products/phone-case-3.jpg',
  '/images/products/phone-case-4.jpg',
  '/images/products/puma-essentials-hoodie.jpg',
  '/images/products/routine-smart-chinos.jpg',
  '/images/products/shirt-1.jpg',
  '/images/products/shirt-2.jpg',
  '/images/products/shirt-3.jpg',
  '/images/products/shirt-4.jpg',
  '/images/products/shoes-extra1.jpg',
  '/images/products/shorts-1.jpg',
  '/images/products/shorts-2.jpg',
  '/images/products/shorts-3.jpg',
  '/images/products/shorts-4.jpg',
  '/images/products/slides-1.jpg',
  '/images/products/slides-2.jpg',
  '/images/products/slides-3.jpg',
  '/images/products/slides-4.jpg',
  '/images/products/swe-hoodie.jpg',
  '/images/products/sweater-1.jpg',
  '/images/products/sweater-2.jpg',
  '/images/products/sweater-3.jpg',
  '/images/products/sweater-4.jpg',
  '/images/products/tshirt-extra1.jpg',
  '/images/products/underwear-1.jpg',
  '/images/products/underwear-2.jpg',
  '/images/products/underwear-3.jpg',
  '/images/products/underwear-4.jpg',
  '/images/products/uniqlo-u-crew-neck-tee.jpg',
  '/images/products/vans-old-skool.jpg',
  '/images/products/wallet-1.jpg',
  '/images/products/wallet-2.jpg',
  '/images/products/wallet-3.jpg',
  '/images/products/wallet-4.jpg',
  '/images/products/zara-wide-leg-trousers.jpg'
];

async function seed() {
  faker.seed(20260714);

  const products = [];
  const TOTAL_PRODUCTS = 32;

  // Track distribution
  const categoriesUsed = new Set();
  let saleCount = 0;

  for (let i = 1; i <= TOTAL_PRODUCTS; i++) {
    const rawName = faker.commerce.productName();
    const name = `Lab 8 ${rawName}`;
    const slug = `lab8-seed-${String(i).padStart(2, '0')}-${faker.helpers.slugify(rawName).toLowerCase()}`;
    
    // Balanced category distribution
    const category_slug = CATEGORY_SLUGS[i % CATEGORY_SLUGS.length];
    categoriesUsed.add(category_slug);

    const price = faker.number.int({ min: 90000, max: 900000 });
    
    // At least 8 items on sale, let's make it ~10-11
    let sale_price = null;
    if (i % 3 === 0) {
      sale_price = Math.round(price * faker.number.float({ min: 0.65, max: 0.9 }));
      saleCount++;
    }

    // Stable image
    const image_url = IMAGES[i % IMAGES.length];

    const condition = faker.helpers.arrayElement(CONDITIONS);
    const size = faker.helpers.arrayElement(['S', 'M', 'L', 'XL', 'One Size', 'EU 40', 'EU 41']);
    
    const description = `${condition} condition. Size ${size}. ${faker.commerce.productDescription()}`;
    
    // Distribute created_at over the last 32 days
    // i=1 is newest (now), i=32 is oldest (32 days ago)
    const daysAgo = i - 1;
    const created_at = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    products.push({
      name,
      slug,
      price,
      sale_price,
      category_slug,
      image_url,
      thumbnail: image_url,
      description,
      stock: faker.number.int({ min: 1, max: 10 }),
      is_negotiable: faker.datatype.boolean(),
      status: 'active',
      condition,
      size,
      location: `${faker.location.city()}, Vietnam`,
      seller_name: faker.person.fullName(),
      brand: faker.company.name(),
      created_at,
      updated_at: created_at
    });
  }

  // Validation
  if (products.length !== 32) throw new Error("Must generate exactly 32 products.");
  const slugs = new Set(products.map(p => p.slug));
  if (slugs.size !== 32) throw new Error("Slugs are not unique.");
  for (const p of products) {
    if (!CATEGORY_SLUGS.includes(p.category_slug)) throw new Error(`Invalid category_slug: ${p.category_slug}`);
    if (p.price < 0) throw new Error("Price must be >= 0");
    if (p.sale_price !== null && p.sale_price >= p.price) throw new Error("Sale price must be lower than price");
    if (!p.image_url) throw new Error("Missing image_url");
    if (!p.description) throw new Error("Missing description");
    if (p.status !== 'active') throw new Error("Status must be active");
  }

  console.log("Validation passed. Upserting products...");

  const { data, error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'slug' })
    .select();

  if (error) {
    console.error("Failed to upsert products:");
    console.error(error);
    process.exit(1);
  }

  // Query back to verify
  const { data: verifyData, error: verifyError } = await supabase
    .from('products')
    .select('*')
    .ilike('slug', 'lab8-seed-%');

  if (verifyError) {
    console.error("Failed to fetch verified products:", verifyError);
    process.exit(1);
  }

  const activeProducts = verifyData.filter(p => p.status === 'active').length;
  const saleProducts = verifyData.filter(p => p.sale_price !== null).length;
  const distinctCategories = new Set(verifyData.map(p => p.category_slug));
  
  const newest = new Date(Math.max(...verifyData.map(p => new Date(p.created_at).getTime())));
  const oldest = new Date(Math.min(...verifyData.map(p => new Date(p.created_at).getTime())));

  console.log("-----------------------------------------");
  console.log("Lab 8 Product Seeder Summary");
  console.log("-----------------------------------------");
  console.log(`Total Lab 8 rows found: ${verifyData.length}`);
  console.log(`Active products: ${activeProducts}`);
  console.log(`Sale products: ${saleProducts}`);
  console.log(`Distinct categories: ${distinctCategories.size}`);
  console.log(`Category distribution:`);
  
  const dist = verifyData.reduce((acc, p) => {
    acc[p.category_slug] = (acc[p.category_slug] || 0) + 1;
    return acc;
  }, {});
  for (const [cat, count] of Object.entries(dist)) {
    console.log(`  - ${cat}: ${count}`);
  }

  console.log(`Newest created_at: ${newest.toISOString()}`);
  console.log(`Oldest created_at: ${oldest.toISOString()}`);
}

seed().catch(err => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
