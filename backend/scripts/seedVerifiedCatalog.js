/**
 * StyleHub — Verified catalog seeder (Phase 6 expansion)
 * ---------------------------------------------------------
 * Repeatable, idempotent seeder driven entirely by
 * backend/scripts/data/verifiedCatalog.js (the manifest). Never touches a
 * product that isn't in the manifest's slug set, and never touches
 * users/orders/carts/reviews/coupons.
 *
 * Modes:
 *   node scripts/seedVerifiedCatalog.js --dry-run   validates + diffs, no writes
 *   node scripts/seedVerifiedCatalog.js --apply      performs the upsert
 *
 * Behaviour on --apply:
 *   - Upserts brands (keyed by slug), reusing canonical categories (never
 *     overwriting existing display names).
 *   - Upserts manifest products keyed by slug. When an existing DB row
 *     already references the same image file under a *different* slug, that
 *     row is reused (preserves product_id -> order/order_item FKs) instead of
 *     creating a duplicate.
 *   - Every manifest product gets a valid seller_id from the real
 *     @stylehub.demo accounts (never a randomly-created auth user).
 *   - Soft-deactivates (status='archived') any currently-active product NOT
 *     in the manifest's managed set. Nothing is deleted.
 *   - Syncs exactly one primary product_images row per managed product.
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in backend/.env
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const {
  P, BRANDS, CANONICAL_CATEGORIES, SELLERS, LOCATIONS, BASE_DATE, DAY, imgPath, assertData,
} = require('./data/verifiedCatalog');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in backend/.env');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const MODE = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--dry-run') ? 'dry-run' : null;
if (!MODE) {
  console.error('Usage: node scripts/seedVerifiedCatalog.js --dry-run | --apply');
  process.exit(1);
}

function buildDescription(p) {
  const condText = {
    new_with_tags: 'Brand new with tags', like_new: 'Like new, barely worn',
    excellent: 'Excellent pre-loved condition', good: 'Good used condition', fair: 'Fair, honest wear',
  }[p.cond] || 'Pre-loved';
  const brandText = p.brand ? BRANDS.find(b => b.slug === p.brand).name : 'independent';
  return `${p.name}. ${condText}. Size ${p.size}. Authentic ${brandText} listing from a StyleHub community seller — great addition to a streetwear or everyday wardrobe.`;
}

function buildManagedRows(brandId) {
  const rows = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    const seller = SELLERS[i % SELLERS.length];
    const url = imgPath(p.img);
    const created = new Date(BASE_DATE - i * DAY).toISOString();
    rows.push({
      _slug_key: p.slug,
      _img: p.img,
      name: p.name,
      slug: p.slug,
      price: p.price,
      sale_price: p.sale ?? null,
      category_slug: p.cat,
      image_url: url,
      thumbnail: url,
      description: buildDescription(p),
      stock: p.sale != null ? 3 : 5,
      condition: p.cond,
      size: p.size,
      location: LOCATIONS[i % LOCATIONS.length],
      seller_name: seller.name,
      seller_id: seller.id,
      brand: p.brand ? BRANDS.find(b => b.slug === p.brand).name : 'No Brand',
      brand_id: p.brand ? brandId[p.brand] : null,
      is_negotiable: i % 4 === 1,
      is_featured: !!p.feat,
      status: 'active',
      created_at: created,
      updated_at: created,
    });
  }
  return rows;
}

const TRACKED_FIELDS = [
  'name', 'price', 'sale_price', 'category_slug', 'image_url', 'thumbnail',
  'description', 'stock', 'condition', 'size', 'location', 'seller_name',
  'seller_id', 'brand', 'brand_id', 'is_negotiable', 'is_featured', 'status',
];

function rowsDiffer(existing, incoming) {
  return TRACKED_FIELDS.some((f) => {
    const a = existing[f];
    const b = incoming[f];
    if (a == null && b == null) return false;
    if (typeof a === 'number' || typeof b === 'number') return Number(a) !== Number(b);
    return String(a ?? '') !== String(b ?? '');
  });
}

async function ensureCategories(apply) {
  const { data: existing } = await sb.from('categories').select('slug');
  const have = new Set((existing || []).map((c) => c.slug));
  const missing = CANONICAL_CATEGORIES.filter((s) => !have.has(s));
  if (missing.length && apply) {
    const rows = missing.map((slug) => ({
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), slug, is_active: true,
    }));
    const { error } = await sb.from('categories').insert(rows);
    if (error) throw new Error('category insert: ' + error.message);
  }
  return missing.length;
}

async function upsertBrands(apply) {
  const { data: sample } = await sb.from('brands').select('*').limit(1);
  const cols = new Set(sample && sample[0] ? Object.keys(sample[0]) : ['name', 'slug']);
  const rows = BRANDS.map((b) => {
    const r = { name: b.name, slug: b.slug };
    if (cols.has('is_local')) r.is_local = b.is_local;
    if (cols.has('is_active')) r.is_active = true;
    if (cols.has('country')) r.country = b.is_local ? 'Vietnam' : null;
    return r;
  });
  if (apply) {
    const { error } = await sb.from('brands').upsert(rows, { onConflict: 'slug' });
    if (error) throw new Error('brand upsert: ' + error.message);
  }
  const { data } = await sb.from('brands').select('id,slug');
  return Object.fromEntries((data || []).map((b) => [b.slug, b.id]));
}

function printDistribution(rows) {
  const catDist = {};
  const brandDist = {};
  rows.forEach((r) => {
    catDist[r.category_slug] = (catDist[r.category_slug] || 0) + 1;
    brandDist[r.brand] = (brandDist[r.brand] || 0) + 1;
  });
  console.log('\nPer category:');
  Object.entries(catDist).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nPer brand:');
  Object.entries(brandDist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

async function run() {
  console.log(`StyleHub verified-catalog seeder — mode: ${MODE}\n`);
  assertData();
  console.log(`Manifest validated: ${P.length} products, ${BRANDS.length} brands, ${CANONICAL_CATEGORIES.length} categories, ${SELLERS.length} sellers.`);

  const apply = MODE === 'apply';
  const catsInserted = await ensureCategories(apply);
  const brandId = await upsertBrands(apply);
  const managedRows = buildManagedRows(brandId);

  // Map existing products by slug AND by image filename (to reuse rows that
  // already reference the same image under a legacy/different slug).
  const { data: existing, error: exErr } = await sb.from('products').select('*');
  if (exErr) throw exErr;
  const bySlug = Object.fromEntries((existing || []).map((r) => [r.slug, r]));
  const byImage = {};
  for (const row of existing || []) {
    for (const u of [row.thumbnail, row.image_url]) {
      const f = (u || '').startsWith('/images/products/') ? u.split('/').pop() : null;
      if (f && !byImage[f]) byImage[f] = row;
    }
  }

  let toInsert = 0;
  let toUpdate = 0;
  let unchanged = 0;
  const finalRows = [];
  for (const row of managedRows) {
    const reuse = bySlug[row._slug_key] || byImage[row._img];
    const finalSlug = reuse ? reuse.slug : row._slug_key;
    const { _slug_key, _img, ...payload } = row;
    payload.slug = finalSlug;
    finalRows.push(payload);
    if (!reuse) toInsert++;
    else if (rowsDiffer(reuse, payload)) toUpdate++;
    else unchanged++;
  }

  console.log(`\nPlanned: ${toInsert} insert, ${toUpdate} update, ${unchanged} unchanged, 0 skipped.`);
  printDistribution(finalRows);

  const managedSlugs = new Set(finalRows.map((r) => r.slug));
  const leftoverActive = (existing || []).filter((r) => r.status === 'active' && !managedSlugs.has(r.slug));
  console.log(`\nLeftover active products outside manifest (will be archived on apply): ${leftoverActive.length}`);

  if (!apply) {
    console.log('\nDRY RUN — no database writes performed.');
    return;
  }

  const { data: upserted, error: upErr } = await sb
    .from('products')
    .upsert(finalRows, { onConflict: 'slug' })
    .select('id,slug');
  if (upErr) throw new Error('product upsert: ' + upErr.message);

  const managedIds = (upserted || []).map((r) => r.id);
  const idBySlug = Object.fromEntries((upserted || []).map((r) => [r.slug, r.id]));

  let deactivated = 0;
  if (leftoverActive.length) {
    const ids = leftoverActive.map((r) => r.id);
    const { error: dErr } = await sb.from('products').update({ status: 'archived' }).in('id', ids);
    if (dErr) throw new Error('deactivate: ' + dErr.message);
    deactivated = ids.length;
  }

  await sb.from('product_images').delete().in('product_id', managedIds);
  const imageRows = finalRows
    .map((r) => ({ product_id: idBySlug[r.slug], url: r.image_url, alt_text: r.name, sort_order: 0, is_primary: true }))
    .filter((r) => r.product_id);
  if (imageRows.length) {
    const { error: iErr } = await sb.from('product_images').insert(imageRows);
    if (iErr) throw new Error('product_images insert: ' + iErr.message);
  }

  console.log('\n---------------------------------------------');
  console.log('APPLY complete');
  console.log('---------------------------------------------');
  console.log('Categories inserted (missing canonical):', catsInserted);
  console.log('Products upserted (active, verified):', finalRows.length);
  console.log('  inserted:', toInsert, '| updated:', toUpdate, '| unchanged:', unchanged);
  console.log('Leftover products archived:', deactivated);
  console.log('Primary product_images synced:', imageRows.length);
}

run().catch((err) => { console.error('SEED FAILED:', err.message); process.exit(1); });
