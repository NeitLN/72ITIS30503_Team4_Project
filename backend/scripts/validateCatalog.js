/**
 * StyleHub — Catalog integrity validator (Phase 6)
 * -------------------------------------------------
 * Checks the live/active catalog for data-integrity violations and exits with a
 * non-zero code if any are found (CI-friendly). Prints no secrets or absolute
 * host paths.
 *
 * Checks:
 *   1. Every active product image_url + thumbnail resolves to a real file on disk.
 *   2. No active product_images row points at a missing file.
 *   3. All active product slugs are unique (no duplicates).
 *   4. Every active category_slug exists in the categories table.
 *   5. Every brand_id on an active product resolves to a brand row.
 *   6. Every sale_price is null OR (0 < sale_price < price).
 *   7. No two active products share the same image file.
 *   8. Active product count and distinct-brand count meet the Phase-6 targets.
 *
 * Usage:  node scripts/validateCatalog.js   (from backend/)
 */
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!URL || !KEY) { console.error('Supabase env missing.'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const IMG_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'products');
const MIN_PRODUCTS = 140;
const MIN_BRANDS = 25;
const MAX_BRAND_SHARE = 0.12;

const onDisk = new Set(fs.readdirSync(IMG_DIR));
const fileOf = (u) => (u && u.startsWith('/images/products/')) ? u.split('/').pop() : null;
const exists = (u) => { const f = fileOf(u); return f ? onDisk.has(f) : false; };

const failures = [];
const fail = (m) => failures.push(m);

(async () => {
  // Phase 7: scope validation to the seed-managed catalog only. Real /sell
  // listings (listing_source='user') grow independently and must never
  // affect — or be affected by — these seed-catalog integrity checks.
  const { data: products, error } = await sb.from('products').select('*').eq('status', 'active').eq('listing_source', 'seed');
  if (error) { console.error('query error:', error.message); process.exit(2); }
  const { data: cats } = await sb.from('categories').select('slug');
  const catSet = new Set((cats || []).map(c => c.slug));
  const { data: brands } = await sb.from('brands').select('id');
  const brandIds = new Set((brands || []).map(b => b.id));

  // 1 + 6 + 4 + 5, per-product
  const slugSeen = new Map();
  const imageOwner = new Map();
  for (const p of products) {
    if (!exists(p.image_url)) fail(`image_url missing on disk: ${p.slug} -> ${p.image_url}`);
    if (!exists(p.thumbnail)) fail(`thumbnail missing on disk: ${p.slug} -> ${p.thumbnail}`);
    if (!catSet.has(p.category_slug)) fail(`unknown category_slug '${p.category_slug}' on ${p.slug}`);
    if (p.brand_id && !brandIds.has(p.brand_id)) fail(`unresolved brand_id on ${p.slug}`);
    if (p.sale_price != null && !(Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price)))
      fail(`invalid sale_price on ${p.slug}: sale=${p.sale_price} price=${p.price}`);
    if (!(Number(p.price) > 0)) fail(`invalid price on ${p.slug}: ${p.price}`);

    // 3 duplicate slug
    if (slugSeen.has(p.slug)) fail(`duplicate active slug: ${p.slug}`);
    slugSeen.set(p.slug, true);

    // 7 shared image
    const f = fileOf(p.thumbnail) || fileOf(p.image_url);
    if (f) {
      if (imageOwner.has(f)) fail(`image '${f}' shared by ${imageOwner.get(f)} and ${p.slug}`);
      else imageOwner.set(f, p.slug);
    }
  }

  // 2 product_images for active products
  const activeIds = products.map(p => p.id);
  if (activeIds.length) {
    const { data: pimgs } = await sb.from('product_images').select('product_id,url').in('product_id', activeIds);
    for (const im of pimgs || []) {
      if (im.url && im.url.startsWith('/images/products/') && !exists(im.url))
        fail(`active product_images missing on disk: ${im.url}`);
    }
  }

  // 8 targets
  const distinctBrands = new Set(products.filter(p => p.brand_id).map(p => p.brand_id));
  if (products.length < MIN_PRODUCTS) fail(`active product count ${products.length} < target ${MIN_PRODUCTS}`);
  if (distinctBrands.size < MIN_BRANDS) fail(`distinct brand count ${distinctBrands.size} < target ${MIN_BRANDS}`);

  // 9 brand concentration — no single brand should dominate the catalog
  const brandShare = {};
  products.forEach(p => { if (p.brand_id) brandShare[p.brand_id] = (brandShare[p.brand_id] || 0) + 1; });
  for (const [bid, count] of Object.entries(brandShare)) {
    const share = count / products.length;
    if (share > MAX_BRAND_SHARE) fail(`brand ${bid} share ${(share * 100).toFixed(1)}% exceeds ${MAX_BRAND_SHARE * 100}% cap (${count}/${products.length})`);
  }

  // 10 distribution ranges
  const saleCount = products.filter(p => p.sale_price != null).length;
  const featCount = products.filter(p => p.is_featured).length;
  const negCount = products.filter(p => p.is_negotiable).length;
  const sellerCount = new Set(products.filter(p => p.seller_id).map(p => p.seller_id)).size;
  if (sellerCount < 2) fail(`only ${sellerCount} distinct seller(s) used across active catalog`);
  if (saleCount < 50 || saleCount > 70) fail(`on-sale count ${saleCount} outside target range 50-70`);
  if (featCount < 20 || featCount > 30) fail(`featured count ${featCount} outside target range 20-30`);
  if (negCount < 40 || negCount > 60) fail(`negotiable count ${negCount} outside target range 40-60`);

  // Report
  console.log('StyleHub catalog validation');
  console.log('---------------------------');
  console.log('Active products     :', products.length);
  console.log('Distinct brands used:', distinctBrands.size);
  console.log('Distinct sellers used:', sellerCount);
  console.log('On-sale products    :', saleCount);
  console.log('Featured products   :', featCount);
  console.log('Negotiable products :', negCount);
  console.log('Categories in use   :', new Set(products.map(p => p.category_slug)).size);
  console.log('');
  if (failures.length) {
    console.error(`FAILED — ${failures.length} integrity violation(s):`);
    failures.forEach(f => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('PASSED — no integrity violations.');
})().catch(e => { console.error('validator error:', e.message); process.exit(2); });
