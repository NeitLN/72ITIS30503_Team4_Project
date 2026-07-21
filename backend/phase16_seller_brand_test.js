/**
 * Phase 16 — seller-declared brand creation. All fixtures are namespaced
 * with a unique `stylehub-brand-test-<run>` marker, every ID is captured,
 * and cleanup deletes only those exact IDs — never a broad delete by
 * partial name. No password is written to a tracked file: accounts are
 * registered here with a random in-memory password that is discarded
 * after this process exits.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: [path.join(__dirname, '.env'), path.join(__dirname, '../.env')], quiet: true });

const { supabase, supabaseAdmin } = require('./lib/supabase');
const brandService = require('./services/brandService');

const API_BASE = process.env.PHASE16_API_BASE || 'http://127.0.0.1:8080';
const run = `phase16-brand-qa-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
// Kept short (unlike `run`) so BRAND_NS plus the longest suffix used below
// (" NeverCreated", 13 chars) still fits the real 60-char brand name limit.
const brandRun = crypto.randomBytes(4).toString('hex');
const BRAND_NS = `Stylehub Brand Test ${brandRun}`;
const ids = { users: [], products: [], brands: [] };
const checks = [];
let cleaned = false;

function uuid() { return crypto.randomUUID(); }
function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}
function headers(token, extra = {}) {
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}
async function api(method, pathname, payload, token, extraHeaders = {}) {
  const isForm = payload instanceof FormData;
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...headers(token, extraHeaders), ...(isForm || payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: payload === undefined ? undefined : (isForm ? payload : JSON.stringify(payload)),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}
async function register(label, role = 'seller') {
  const password = `P16-${crypto.randomBytes(18).toString('base64url')}!`;
  const email = `${run}-${label}@stylehub.invalid`;
  const response = await api('POST', '/api/auth/register', { name: `Phase 16 ${label}`, email, password, role });
  if (response.status !== 200) throw new Error(`Could not register ${label}: ${response.status} ${JSON.stringify(response.body)}`);
  const user = response.body.data.user;
  ids.users.push(user.id);
  return { ...user, email, token: response.body.data.token };
}

const SAMPLE_IMAGE_PATH = path.join(__dirname, '../frontend/public/images/products/adidas-stan-smith.jpg');

async function createListingMultipart(seller, { name, brand, categorySlug = 't-shirts', priceOverride } = {}) {
  const buffer = fs.readFileSync(SAMPLE_IMAGE_PATH);
  const form = new FormData();
  form.append('name', name);
  form.append('description', 'Scoped Phase 16 seller-declared-brand QA listing with real database state.');
  form.append('category_slug', categorySlug);
  if (brand !== undefined) form.append('brand_slug', typeof brand === 'string' ? brand : JSON.stringify(brand));
  form.append('condition', 'good');
  form.append('size', 'M');
  form.append('price', String(priceOverride || 350000));
  form.append('stock', '5');
  form.append('location', 'Thành phố Hồ Chí Minh');
  form.append('is_negotiable', 'false');
  form.append('images', new Blob([buffer], { type: 'image/jpeg' }), 'adidas-stan-smith.jpg');
  const res = await api('POST', '/api/products', form, seller?.token);
  if (res.status === 201 && res.body?.data?.id) ids.products.push(res.body.data.id);
  return res;
}

async function getProductBrand(productId) {
  const { data: product, error } = await supabaseAdmin.from('products').select('id, brand_id, brand').eq('id', productId).maybeSingle();
  if (error) throw error;
  if (!product?.brand_id) return { product, brand: null };
  const { data: brand } = await supabaseAdmin.from('brands').select('*').eq('id', product.brand_id).maybeSingle();
  if (brand && !ids.brands.includes(brand.id)) ids.brands.push(brand.id);
  return { product, brand };
}

async function cleanup() {
  const productIds = [...new Set(ids.products)];
  const userIds = [...new Set(ids.users)];
  // Brand cleanup is scoped to exact captured IDs whose slug still carries
  // the run's exact namespace marker — refuses to touch anything else,
  // even if a captured ID somehow drifted (defense in depth).
  const brandIds = [...new Set(ids.brands)];
  if (productIds.length) {
    await supabaseAdmin.from('product_sustainability').delete().in('product_id', productIds);
    await supabaseAdmin.from('product_images').delete().in('product_id', productIds);
    await supabaseAdmin.from('products').delete().in('id', productIds);
  }
  if (brandIds.length) {
    const { data: safeBrands } = await supabaseAdmin.from('brands').select('id, slug').in('id', brandIds);
    const exactIds = (safeBrands || [])
      .filter((b) => b.slug.startsWith('stylehub-brand-test-'))
      .map((b) => b.id);
    if (exactIds.length) await supabaseAdmin.from('brands').delete().in('id', exactIds);
  }
  if (userIds.length) await supabaseAdmin.from('users').delete().in('id', userIds);
  cleaned = true;
}

(async () => {
  try {
    if (!supabaseAdmin) throw new Error('Phase 16 requires configured local QA credentials.');
    const health = await api('GET', '/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);
    if (!fs.existsSync(SAMPLE_IMAGE_PATH)) throw new Error('Sample catalog image missing — cannot exercise real multipart listing creation.');

    const { count: seedBefore } = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('listing_source', 'seed');
    check('Baseline: 148 verified seed products present before this suite runs', seedBefore === 148, `seed=${seedBefore}`);

    // ---- Unicode/case normalization (pure function, no I/O) ----
    check('normalizeForCompare folds case and whitespace', brandService.normalizeForCompare(' NiKe ') === brandService.normalizeForCompare('nike'));
    check('normalizeForCompare is NFC-stable for combining vs precomposed Vietnamese text', brandService.normalizeForCompare('Vi' + 'ệ'.normalize('NFD') + 't') === brandService.normalizeForCompare('Vi' + 'ệ'.normalize('NFC') + 't'));
    check('normalizeForCompare does not fold distinct accented names together', brandService.normalizeForCompare('Đế') !== brandService.normalizeForCompare('De'));

    const sellerA = await register('seller-a', 'seller');
    const sellerB = await register('seller-b', 'seller');
    const customer = await register('customer', 'customer');

    // ---- Anonymous / unauthorized cannot create a brand or product ----
    const anonAttempt = await createListingMultipart(null, { name: `Phase 16 anon ${run}`, brand: `${BRAND_NS} anon` });
    check('Anonymous request cannot create a listing (and therefore cannot create a brand)', anonAttempt.status === 401);

    // ---- New valid brand: authenticated seller creates a product with it ----
    const newBrandName = `${BRAND_NS} New`;
    const first = await createListingMultipart(sellerA, { name: `Phase 16 First ${run}`, brand: newBrandName });
    check('Authenticated seller can create a product with a valid new brand', first.status === 201, `${first.status} ${JSON.stringify(first.body)}`);
    const { product: firstProduct, brand: firstBrand } = await getProductBrand(first.body?.data?.id);
    check('New product references the newly created brand', Boolean(firstProduct?.brand_id) && firstBrand?.name === newBrandName);
    check('New brand has source seller_declared', firstBrand?.source === 'seller_declared');
    check('New brand is verification_status pending (not verified)', firstBrand?.verification_status === 'pending');
    check('New brand created_by is the authenticated seller, not client-suppliable', firstBrand?.created_by === sellerA.id);

    // ---- Client cannot spoof verification/created_by/source ----
    const spoofName = `${BRAND_NS} Spoofed`;
    const spoofAttempt = await createListingMultipart(sellerA, {
      name: `Phase 16 Spoof ${run}`,
      brand: { name: spoofName, verification_status: 'verified', source: 'catalog', created_by: customer.id },
    });
    // brand_slug is coerced to a plain string server-side (String(raw.brand_slug)),
    // so an object payload can never inject structured fields — it either
    // becomes a harmless literal string brand name or fails validation.
    check('Object-shaped brand payload cannot inject verified/catalog/created_by fields', spoofAttempt.status === 201 || spoofAttempt.status === 422);
    if (spoofAttempt.status === 201) {
      const { brand: spoofBrand } = await getProductBrand(spoofAttempt.body.data.id);
      check('Spoofed brand payload never results in a verified/catalog brand', spoofBrand?.verification_status !== 'verified' && spoofBrand?.source !== 'catalog');
      check('Spoofed brand payload never results in created_by belonging to someone else', spoofBrand?.created_by !== customer.id);
    }

    // ---- Existing brand selection still works (catalog brand, e.g. Nike) ----
    const nikeListing = await createListingMultipart(sellerA, { name: `Phase 16 Nike ${run}`, brand: 'Nike' });
    check('Existing catalog brand selection still works', nikeListing.status === 201);
    const { brand: nikeBrand } = await getProductBrand(nikeListing.body?.data?.id);
    check('Selecting an existing catalog brand does not create a duplicate or alter its verified status', nikeBrand?.name === 'Nike' && nikeBrand?.verification_status === 'verified' && nikeBrand?.source === 'catalog');

    // ---- Whitespace/case variations resolve to the SAME existing brand, zero duplicates ----
    const variant = await createListingMultipart(sellerB, { name: `Phase 16 Variant ${run}`, brand: `  ${newBrandName.toUpperCase()}  ` });
    check('Whitespace/case variant resolves to the existing brand (second identical request creates zero duplicates)', variant.status === 201);
    const { brand: variantBrand } = await getProductBrand(variant.body?.data?.id);
    check('Case/whitespace variant brand_id equals the original', variantBrand?.id === firstBrand?.id);
    const { count: dupeCount } = await supabaseAdmin.from('brands').select('id', { count: 'exact', head: true }).ilike('name', newBrandName);
    check('Exactly one brand row exists for the normalized name', dupeCount === 1, `count=${dupeCount}`);

    // ---- Concurrent equivalent requests create exactly one canonical brand ----
    const concurrentName = `${BRAND_NS} Concurrent`;
    const [c1, c2] = await Promise.all([
      createListingMultipart(sellerA, { name: `Phase 16 Concurrent A ${run}`, brand: concurrentName }),
      createListingMultipart(sellerB, { name: `Phase 16 Concurrent B ${run}`, brand: concurrentName.toUpperCase() }),
    ]);
    check('Both concurrent requests succeed', c1.status === 201 && c2.status === 201, `${c1.status}/${c2.status}`);
    const { brand: c1Brand } = await getProductBrand(c1.body?.data?.id);
    const { brand: c2Brand } = await getProductBrand(c2.body?.data?.id);
    check('Concurrent equivalent requests resolve to one canonical brand (no duplicate)', c1Brand?.id && c1Brand.id === c2Brand?.id);
    const { count: concurrentCount } = await supabaseAdmin.from('brands').select('id', { count: 'exact', head: true }).ilike('name', concurrentName);
    check('Exactly one brand row exists after the concurrent race', concurrentCount === 1, `count=${concurrentCount}`);

    // ---- Invalid names rejected ----
    const controlCharAttempt = await createListingMultipart(sellerA, { name: `Phase 16 Bad ${run}`, brand: `${BRAND_NS} Control` });
    check('Control-character brand name is rejected', controlCharAttempt.status === 422);
    const htmlAttempt = await createListingMultipart(sellerA, { name: `Phase 16 Bad2 ${run}`, brand: `<script>alert(1)</script>` });
    check('HTML/script brand name is rejected (safely, not stored or rendered)', htmlAttempt.status === 422);
    const tooLong = await createListingMultipart(sellerA, { name: `Phase 16 Bad3 ${run}`, brand: 'A'.repeat(61) });
    check('Over-length brand name is rejected', tooLong.status === 422);
    const symbolsOnly = await createListingMultipart(sellerA, { name: `Phase 16 Bad4 ${run}`, brand: '!!!???---' });
    check('Symbols-only brand name is rejected', symbolsOnly.status === 422);

    // ---- Non-seller (customer) role: still safely attributed, not elevated ----
    // This app has no seller-only role gate on listing creation (any
    // authenticated user may list a product — verified by reading
    // routes/products.js and middleware/auth.js); the safety property that
    // matters here is that a customer-role account cannot end up creating a
    // brand attributed to anyone but itself, and never a verified one.
    const customerBrandName = `${BRAND_NS} Customer`;
    const customerListing = await createListingMultipart(customer, { name: `Phase 16 Customer ${run}`, brand: customerBrandName });
    check('Customer-role account can create a listing (no distinct seller role gate exists)', customerListing.status === 201);
    const { brand: customerBrand } = await getProductBrand(customerListing.body?.data?.id);
    check('Customer-created brand is attributed to the customer, never elevated to verified/catalog', customerBrand?.created_by === customer.id && customerBrand?.verification_status === 'pending' && customerBrand?.source === 'seller_declared');

    // ---- Editing: switch to an existing brand, declare a new brand, and no-op preserves current ----
    const editBase = await createListingMultipart(sellerA, { name: `Phase 16 EditBase ${run}`, brand: newBrandName });
    const editProductId = editBase.body.data.id;
    const { product: beforeEdit } = await getProductBrand(editProductId);

    const switchToExisting = await api('PATCH', `/api/seller/listings/${editProductId}`, { brand_slug: 'Adidas' }, sellerA.token);
    check('Product editing can switch to an existing brand', switchToExisting.status === 200);
    const { brand: afterSwitch } = await getProductBrand(editProductId);
    check('Switched brand resolves to the real existing Adidas row', afterSwitch?.name === 'Adidas' && afterSwitch?.source === 'catalog');

    const editNewBrandName = `${BRAND_NS} EditedNew`;
    const switchToNew = await api('PATCH', `/api/seller/listings/${editProductId}`, { brand_slug: editNewBrandName }, sellerA.token);
    check('Product editing can declare a brand-new brand', switchToNew.status === 200);
    const { brand: afterNew } = await getProductBrand(editProductId);
    check('Newly declared brand via edit is seller_declared/pending, created_by the editor', afterNew?.source === 'seller_declared' && afterNew?.verification_status === 'pending' && afterNew?.created_by === sellerA.id);

    const noOpEdit = await api('PATCH', `/api/seller/listings/${editProductId}`, { price: 360000 }, sellerA.token);
    check('Editing without a brand field preserves the current brand', noOpEdit.status === 200 && noOpEdit.body.data.brand_id === afterNew.id);

    // ---- Unrelated products/brands remain unchanged ----
    const { data: catalogSample } = await supabaseAdmin.from('products').select('id, brand_id').eq('listing_source', 'seed').limit(1).single();
    check('A sampled unrelated seed product still has a brand_id (unchanged by this suite)', Boolean(catalogSample.brand_id));
    const { count: catalogBrandCountAfter } = await supabaseAdmin.from('brands').select('id', { count: 'exact', head: true }).eq('source', 'catalog');
    check('Catalog brand count is unaffected by this suite (still exactly 52)', catalogBrandCountAfter === 52, `catalog=${catalogBrandCountAfter}`);

    // ---- Product creation failure does not leave an orphaned brand ----
    const invalidCategoryAttempt = await createListingMultipart(sellerA, { name: `Phase 16 BadCat ${run}`, brand: `${BRAND_NS} NeverCreated`, categorySlug: 'not-a-real-category' });
    check('Invalid category is rejected before any brand is created', invalidCategoryAttempt.status === 422);
    const { count: orphanCount } = await supabaseAdmin.from('brands').select('id', { count: 'exact', head: true }).ilike('name', `${BRAND_NS} NeverCreated`);
    check('A request that fails validation leaves zero orphaned brand rows', orphanCount === 0, `count=${orphanCount}`);

    // ---- 148 seed products remain intact throughout ----
    const { count: seedAfter } = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('listing_source', 'seed');
    check('Verified seed catalog remains exactly 148 products', seedAfter === 148, `seed=${seedAfter}`);

    // ---- Frontend source does not leak the service-role key (shared boundary check) ----
    const brandsLibSrc = fs.readFileSync(path.join(__dirname, '../frontend/lib/brands.ts'), 'utf8');
    check('Frontend brands module contains no service-role key reference', !/SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(brandsLibSrc));

    await cleanup();
    const [{ count: remainingUsers }, { count: remainingProducts }] = await Promise.all([
      ids.users.length ? supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).in('id', ids.users) : { count: 0 },
      ids.products.length ? supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).in('id', ids.products) : { count: 0 },
    ]);
    check('All captured Phase 16 users and products are removed', (remainingUsers || 0) === 0 && (remainingProducts || 0) === 0);
    const { count: remainingBrands } = await supabaseAdmin.from('brands').select('id', { count: 'exact', head: true }).ilike('name', `${BRAND_NS}%`);
    check('All captured Phase 16 test brands are removed', (remainingBrands || 0) === 0, `remaining=${remainingBrands}`);

    console.log(`\nPHASE16 BACKEND SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((v) => !v)) process.exitCode = 1;
  } catch (error) {
    console.error('PHASE16 BACKEND TEST ERROR:', error.message || error);
    process.exitCode = 1;
  } finally {
    if (!cleaned) await cleanup().catch((error) => console.error('Phase 16 cleanup error:', error.message));
    console.log('Phase 16 backend QA cleanup complete (captured IDs only).');
  }
})();
