/**
 * Phase 12 live circular discovery contract.
 *
 * Creates an isolated seller and a small product matrix, exercises the public
 * API, and deletes only the recorded IDs in finally. Existing catalog rows are
 * never updated or deleted.
 */
const path = require('path');
require('dotenv').config({ path: [path.join(__dirname, '.env'), path.join(__dirname, '../.env')] });
const crypto = require('crypto');
const { supabaseAdmin } = require('./lib/supabase');

const API_BASE = process.env.PHASE12_API_BASE || 'http://127.0.0.1:8080';
const run = `phase12-qa-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const ids = { users: [], products: [] };
const checks = [];

function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path) {
  const response = await fetch(`${API_BASE}${path}`);
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function createProduct(sellerId, label, overrides = {}) {
  const row = {
    id: crypto.randomUUID(),
    name: `Phase 12 ${label} ${run}`,
    slug: `${run}-${label}`.toLowerCase(),
    price: 310000,
    category_slug: 't-shirts',
    brand: 'Nike',
    image_url: '/images/products/nike-sportswear-club-tee.jpg',
    thumbnail: '/images/products/nike-sportswear-club-tee.jpg',
    description: 'Scoped Phase 12 circular discovery QA listing.',
    stock: 2,
    seller_name: `${run}@stylehub.invalid`,
    seller_id: sellerId,
    condition: 'good',
    size: 'M',
    location: 'Thành phố Hồ Chí Minh',
    is_negotiable: false,
    listing_source: 'user',
    status: 'active',
    inventory_mode: 'simple',
    ...overrides,
  };
  const { data, error } = await supabaseAdmin.from('products').insert(row).select('id,slug,name').single();
  if (error) throw error;
  ids.products.push(data.id);
  return data;
}

async function addJourney(productId, lifecycle_type, overrides = {}) {
  const { error } = await supabaseAdmin.from('product_sustainability').insert({
    product_id: productId,
    lifecycle_type,
    material: lifecycle_type === 'not_specified' ? null : 'Cotton dệt dày',
    repair_history: lifecycle_type === 'repaired' ? 'Đã thay khóa kéo bị hỏng.' : null,
    upcycle_details: lifecycle_type === 'upcycled' ? 'Tái thiết kế từ áo sơ mi cũ.' : null,
    product_story: lifecycle_type === 'not_specified' ? null : `Hành trình riêng của ${lifecycle_type}.`,
    reuse_packaging: lifecycle_type !== 'not_specified',
    claim_source: 'seller_declared',
    ...overrides,
  });
  if (error) throw error;
}

async function cleanup() {
  if (ids.products.length) {
    await supabaseAdmin.from('product_sustainability').delete().in('product_id', ids.products);
    await supabaseAdmin.from('product_images').delete().in('product_id', ids.products);
    await supabaseAdmin.from('products').delete().in('id', ids.products);
  }
  if (ids.users.length) await supabaseAdmin.from('users').delete().in('id', ids.users);
}

(async () => {
  try {
    if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for scoped Phase 12 QA.');
    const health = await api('/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);

    const seller = {
      id: crypto.randomUUID(),
      email: `${run}@stylehub.invalid`,
      full_name: 'Phase 12 Circular Discovery QA',
      password_hash: 'phase12-qa-not-loginable',
      role: 'seller',
    };
    const { error: userError } = await supabaseAdmin.from('users').insert(seller);
    if (userError) throw userError;
    ids.users.push(seller.id);

    const created = {};
    for (const lifecycle of ['new', 'deadstock', 'pre_loved', 'repaired', 'upcycled', 'not_specified']) {
      created[lifecycle] = await createProduct(seller.id, lifecycle);
      await addJourney(created[lifecycle].id, lifecycle);
    }
    created.missing = await createProduct(seller.id, 'missing');
    created.otherCategory = await createProduct(seller.id, 'other-category', { category_slug: 'hoodies' });
    await addJourney(created.otherCategory.id, 'pre_loved');

    const invalid = await api('/api/products?lifecycle=certified');
    check('Invalid lifecycle returns stable 400', invalid.status === 400 && invalid.body?.success === false, `status=${invalid.status}`);
    const repeated = await api('/api/products?lifecycle=new&lifecycle=repaired');
    check('Lifecycle accepts exactly one canonical value', repeated.status === 400 && repeated.body?.success === false, `status=${repeated.status}`);

    for (const lifecycle of ['new', 'deadstock', 'pre_loved', 'repaired', 'upcycled']) {
      const result = await api(`/api/products?lifecycle=${lifecycle}&search=${encodeURIComponent(run)}&limit=100`);
      const returnedIds = (result.body?.data || []).map((row) => row.id);
      const expectedCount = lifecycle === 'pre_loved' ? 2 : 1;
      check(
        `${lifecycle} filter returns only matching lifecycle`,
        result.status === 200 && returnedIds.includes(created[lifecycle].id) && returnedIds.length === expectedCount &&
          (result.body.data || []).every((row) => row.sustainability?.lifecycle_type === lifecycle),
        `count=${returnedIds.length}`,
      );
      check(`${lifecycle} metadata count is filtered before pagination`, result.body?.meta?.count === expectedCount);
    }

    const unspecified = await api(`/api/products?lifecycle=not_specified&search=${encodeURIComponent(run)}&limit=100`);
    const unspecifiedIds = (unspecified.body?.data || []).map((row) => row.id);
    check(
      'Not specified includes explicit and missing sustainability rows',
      unspecified.status === 200 && unspecifiedIds.length === 2 &&
        unspecifiedIds.includes(created.not_specified.id) && unspecifiedIds.includes(created.missing.id),
      `count=${unspecifiedIds.length}`,
    );
    check('Not specified public payload uses safe fallbacks', (unspecified.body?.data || []).every(
      (row) => row.sustainability?.lifecycle_type === 'not_specified',
    ));

    const composed = await api(`/api/products?lifecycle=pre_loved&category=t-shirts&condition=good&search=${encodeURIComponent(run)}&limit=1&page=1`);
    check('Lifecycle composes with category, condition, search, and pagination', composed.status === 200 && composed.body?.data?.length === 1 && composed.body?.meta?.count === 1);

    const beyondLastPage = await api(`/api/products?search=${encodeURIComponent(run)}&limit=20&page=99`);
    check('Out-of-range pagination is an empty page, not a server error', beyondLastPage.status === 200 && beyondLastPage.body?.data?.length === 0 && beyondLastPage.body?.meta?.count === 8);

    const category = await api(`/api/categories/t-shirts/products?lifecycle=repaired&search=${encodeURIComponent(run)}&limit=100`);
    check('Category product endpoint forwards lifecycle and search', category.status === 200 && category.body?.data?.length === 1 && category.body.data[0].id === created.repaired.id);

    const detail = await api(`/api/products/${created.pre_loved.slug}`);
    check('Product detail retains full seller-declared journey', detail.status === 200 && detail.body?.data?.sustainability?.material === 'Cotton dệt dày' && detail.body.data.sustainability.claim_source === 'seller_declared');

    console.log(`\nPHASE12 BACKEND SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((value) => !value)) process.exitCode = 1;
  } catch (error) {
    console.error('PHASE12 BACKEND TEST ERROR:', error.message || error);
    process.exitCode = 1;
  } finally {
    await cleanup();
    console.log('Phase 12 backend QA cleanup complete (recorded IDs only).');
  }
})();
