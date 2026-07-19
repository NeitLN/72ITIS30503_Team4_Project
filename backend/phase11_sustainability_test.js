/**
 * Phase 11 live sustainability/security/snapshot suite.
 *
 * Requires the backend to be running and SUPABASE_SERVICE_ROLE_KEY to be
 * supplied through the environment. Every created row includes a unique
 * `phase11-qa-*` run marker, every UUID is recorded, and cleanup is strictly
 * ID-scoped. No seed or pre-existing user data is modified.
 */
require('dotenv').config({ path: '../.env' });
const crypto = require('crypto');
const { supabaseAdmin } = require('./lib/supabase');
const { signAuthToken } = require('./services/authService');
const {
  validateSustainability,
  SustainabilityValidationError,
  FIELD_LIMITS,
} = require('./constants/sustainability');

const API_BASE = process.env.PHASE11_API_BASE || 'http://127.0.0.1:8080';
const run = `phase11-qa-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const ids = { users: [], products: [], orders: [], storagePaths: [] };
const checks = [];

function uuid() { return crypto.randomUUID(); }
function auth(token, json = true) {
  return { Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
}
function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}
function journey(lifecycle_type, overrides = {}) {
  return {
    lifecycle_type,
    material: 'Cotton',
    repair_history: lifecycle_type === 'repaired' ? 'Đã thay khóa kéo bị hỏng.' : null,
    upcycle_details: lifecycle_type === 'upcycled' ? 'Tái thiết kế từ áo sơ mi cũ.' : null,
    product_story: 'Sản phẩm đã đồng hành qua nhiều mùa.',
    reuse_packaging: true,
    ...overrides,
  };
}
function isValidationError(fn, field) {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof SustainabilityValidationError && Boolean(error.fieldErrors?.[field]);
  }
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}
async function createUser(label, role = 'seller') {
  const row = {
    id: uuid(),
    email: `${run}-${label}@stylehub.invalid`,
    full_name: `Phase 11 QA ${label}`,
    password_hash: 'phase11-qa-not-loginable',
    role,
  };
  const { data, error } = await supabaseAdmin.from('users').insert(row).select('id,email,role').single();
  if (error) throw error;
  ids.users.push(data.id);
  return { ...data, token: signAuthToken(data) };
}
async function createProduct(seller, label, overrides = {}) {
  const row = {
    id: uuid(),
    name: `Phase 11 QA ${label}`,
    slug: `${run}-${label}`.toLowerCase(),
    price: 260000,
    sale_price: null,
    category_slug: 't-shirts',
    image_url: '/images/products/coolmate-active-v2-tee.jpg',
    thumbnail: '/images/products/coolmate-active-v2-tee.jpg',
    description: 'Dedicated Phase 11 sustainability QA listing.',
    stock: 5,
    brand: 'Nike',
    seller_name: seller.email,
    seller_id: seller.id,
    condition: 'good',
    size: 'M',
    location: 'Thành phố Hồ Chí Minh',
    is_negotiable: false,
    listing_source: 'user',
    status: 'active',
    inventory_mode: 'simple',
    ...overrides,
  };
  const { data, error } = await supabaseAdmin.from('products').insert(row).select('id,slug,name,price,stock,status,updated_at').single();
  if (error) throw error;
  ids.products.push(data.id);
  return data;
}
async function addJourney(productId, value) {
  const { error } = await supabaseAdmin.from('product_sustainability').insert({
    product_id: productId,
    ...value,
    claim_source: 'seller_declared',
  });
  if (error) throw error;
}
function checkoutPayload(products, overrides = {}) {
  return {
    customer: {
      name: 'Phase Eleven Buyer',
      email: 'phase11-buyer@example.invalid',
      phone: '0901234567',
      address: '11 Product Journey Street, Quận 1',
      city: 'Thành phố Hồ Chí Minh',
    },
    paymentMethod: 'cod',
    items: products.map((product) => ({
      productId: product.id,
      variantId: null,
      quantity: 1,
      expectedUnitPrice: Number(product.price),
      lifecycle_type_snapshot: 'upcycled',
      claim_source_snapshot: 'verified',
    })),
    lifecycle_type_snapshot: 'upcycled',
    claim_source_snapshot: 'verified',
    ...overrides,
  };
}
async function checkout(buyer, products, key = uuid(), overrides = {}) {
  return api('/api/orders', {
    method: 'POST',
    headers: { ...auth(buyer.token), 'Idempotency-Key': key },
    body: JSON.stringify(checkoutPayload(products, overrides)),
  });
}
function storagePathFromUrl(url) {
  const marker = '/storage/v1/object/public/product-images/';
  const index = String(url || '').indexOf(marker);
  return index === -1 ? null : String(url).slice(index + marker.length);
}
async function cleanup() {
  if (ids.users.length) {
    const { data: ownedProducts } = await supabaseAdmin
      .from('products').select('id').in('seller_id', ids.users).eq('listing_source', 'user');
    ids.products.push(...(ownedProducts || []).map((row) => row.id));
    ids.products = [...new Set(ids.products)];
  }
  const { data: ownedOrders } = ids.users.length
    ? await supabaseAdmin.from('orders').select('id').in('user_id', ids.users)
    : { data: [] };
  const orderIds = [...new Set([...(ownedOrders || []).map((row) => row.id), ...ids.orders].filter(Boolean))];
  if (orderIds.length) {
    await supabaseAdmin.from('inventory_movements').delete().in('order_id', orderIds);
    await supabaseAdmin.from('checkout_idempotency').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_coupons').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_items').delete().in('order_id', orderIds);
    await supabaseAdmin.from('orders').delete().in('id', orderIds);
  }
  if (ids.users.length) await supabaseAdmin.from('checkout_idempotency').delete().in('buyer_id', ids.users);
  if (ids.products.length) {
    const { data: images } = await supabaseAdmin.from('product_images').select('url').in('product_id', ids.products);
    for (const image of images || []) {
      const path = storagePathFromUrl(image.url);
      if (path) ids.storagePaths.push(path);
    }
    await supabaseAdmin.from('product_sustainability').delete().in('product_id', ids.products);
    await supabaseAdmin.from('product_images').delete().in('product_id', ids.products);
    await supabaseAdmin.from('products').delete().in('id', ids.products);
  }
  if (ids.storagePaths.length) await supabaseAdmin.storage.from('product-images').remove([...new Set(ids.storagePaths)]);
  if (ids.users.length) await supabaseAdmin.from('users').delete().in('id', ids.users);
}

(async () => {
  try {
    if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for scoped live QA and cleanup.');

    // Central validator matrix.
    for (const lifecycle of ['new', 'deadstock', 'pre_loved', 'repaired', 'upcycled', 'not_specified']) {
      const result = validateSustainability({ sustainability: journey(lifecycle) });
      check(`Valid ${lifecycle} journey`, result.provided && result.value.lifecycle_type === lifecycle);
    }
    check('Repaired without history rejected', isValidationError(
      () => validateSustainability({ sustainability: journey('repaired', { repair_history: ' ' }) }),
      'repair_history',
    ));
    check('Upcycled without details rejected', isValidationError(
      () => validateSustainability({ sustainability: journey('upcycled', { upcycle_details: '' }) }),
      'upcycle_details',
    ));
    check('Unknown lifecycle rejected', isValidationError(
      () => validateSustainability({ sustainability: journey('certified') }),
      'lifecycle_type',
    ));
    for (const field of ['material', 'repair_history', 'upcycle_details', 'product_story']) {
      const lifecycle = field === 'repair_history' ? 'repaired' : field === 'upcycle_details' ? 'upcycled' : 'pre_loved';
      check(`Oversized ${field} rejected`, isValidationError(
        () => validateSustainability({ sustainability: journey(lifecycle, { [field]: 'a'.repeat(FIELD_LIMITS[field] + 1) }) }),
        field,
      ));
    }
    check('Control characters rejected', isValidationError(
      () => validateSustainability({ sustainability: journey('pre_loved', { product_story: 'Áo đẹp\u0007' }) }),
      'product_story',
    ));
    check('Script-like input rejected', isValidationError(
      () => validateSustainability({ sustainability: journey('pre_loved', { product_story: '<script>alert(1)</script>' }) }),
      'product_story',
    ));
    const unicode = validateSustainability({ sustainability: journey('pre_loved', { product_story: 'Chiếc áo của mẹ ở Huế — vẫn còn rất đẹp.' }) });
    check('Legitimate Vietnamese Unicode accepted', unicode.value.product_story.includes('Huế'));
    check('Client claim_source=verified rejected', isValidationError(
      () => validateSustainability({ sustainability: { ...journey('new'), claim_source: 'verified' } }),
      'claim_source',
    ));
    check('Client verification fields rejected', isValidationError(
      () => validateSustainability({ sustainability: { ...journey('new'), verification_status: 'verified' } }),
      'verification_status',
    ));
    const legacyValidation = validateSustainability({ name: 'Legacy API request' });
    check('Legacy creation payload remains backward-compatible', !legacyValidation.provided && legacyValidation.value.lifecycle_type === 'not_specified');
    const unspecified = validateSustainability({ sustainability: journey('not_specified') });
    check('Not specified clears invented detail', unspecified.value.material === null && unspecified.value.product_story === null && unspecified.value.reuse_packaging === false);

    const health = await api('/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);

    const sellerA = await createUser('seller-a');
    const sellerB = await createUser('seller-b');
    const buyerA = await createUser('buyer-a', 'customer');
    const buyerB = await createUser('buyer-b', 'customer');

    const legacy = await createProduct(sellerA, 'legacy');
    const otherSeller = await createProduct(sellerB, 'cross-seller');

    const noAuth = await api(`/api/seller/listings/${legacy.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sustainability: journey('new') }) });
    const badAuth = await api(`/api/seller/listings/${legacy.id}`, { method: 'PATCH', headers: auth('bad.token.value'), body: JSON.stringify({ sustainability: journey('new') }) });
    check('Missing authentication rejected', noAuth.status === 401);
    check('Invalid authentication rejected', badAuth.status === 401);

    const crossSeller = await api(`/api/seller/listings/${otherSeller.id}`, { method: 'PATCH', headers: auth(sellerA.token), body: JSON.stringify({ sustainability: journey('new') }) });
    check('Cross-seller sustainability mutation hidden as 404', crossSeller.status === 404);

    const { data: seed } = await supabaseAdmin.from('products').select('id').eq('listing_source', 'seed').limit(1).single();
    const seedMutation = await api(`/api/seller/listings/${seed.id}`, { method: 'PATCH', headers: auth(sellerA.token), body: JSON.stringify({ sustainability: journey('new') }) });
    check('Seed-product ownership wall preserved', seedMutation.status === 404);

    const legacyRead = await api(`/api/seller/listings/${legacy.id}`, { headers: auth(sellerA.token, false) });
    check('Legacy seller listing reads as not_specified', legacyRead.status === 200 && legacyRead.body.data.sustainability.lifecycle_type === 'not_specified' && legacyRead.body.data.sustainability.claim_source === null);
    const publicLegacy = await api(`/api/products/${legacy.slug}`);
    const publicKeys = Object.keys(publicLegacy.body?.data?.sustainability || {}).sort();
    check('Public detail exposes only safe sustainability fields', publicLegacy.status === 200 && publicKeys.join(',') === 'claim_source,lifecycle_type,material,product_story,repair_history,reuse_packaging,upcycle_details');

    const firstExpected = legacyRead.body.data.updated_at;
    const edit = await api(`/api/seller/listings/${legacy.id}`, {
      method: 'PATCH', headers: auth(sellerA.token),
      body: JSON.stringify({ expected_updated_at: firstExpected, sustainability: journey('pre_loved', { product_story: 'Áo được gìn giữ cẩn thận tại Đà Nẵng.' }) }),
    });
    const { data: storedJourney } = await supabaseAdmin.from('product_sustainability').select('*').eq('product_id', legacy.id).single();
    check('Seller Dashboard edit persists authoritative seller-declared row', edit.status === 200 && storedJourney.lifecycle_type === 'pre_loved' && storedJourney.claim_source === 'seller_declared');

    const stale = await api(`/api/seller/listings/${legacy.id}`, {
      method: 'PATCH', headers: auth(sellerA.token),
      body: JSON.stringify({ expected_updated_at: firstExpected, sustainability: journey('new') }),
    });
    check('Stale sustainability update returns 409', stale.status === 409);

    const freshExpected = edit.body.data.updated_at;
    const concurrent = await Promise.all([
      api(`/api/seller/listings/${legacy.id}`, { method: 'PATCH', headers: auth(sellerA.token), body: JSON.stringify({ expected_updated_at: freshExpected, sustainability: journey('pre_loved', { product_story: 'Concurrent edit A — người bán cung cấp.' }) }) }),
      api(`/api/seller/listings/${legacy.id}`, { method: 'PATCH', headers: auth(sellerA.token), body: JSON.stringify({ expected_updated_at: freshExpected, sustainability: journey('pre_loved', { product_story: 'Concurrent edit B — người bán cung cấp.' }) }) }),
    ]);
    check('Concurrent edit does not silently overwrite', concurrent.filter((result) => result.status === 200).length === 1 && concurrent.filter((result) => result.status === 409).length === 1);

    const form = new FormData();
    const createName = `Phase 11 QA created ${run}`;
    for (const [key, value] of Object.entries({
      name: createName,
      description: 'Tin đăng QA kiểm tra Product Journey được lưu cùng sản phẩm.',
      category_slug: 't-shirts',
      brand_slug: 'Nike',
      condition: 'good',
      size: 'M',
      price: '330000',
      stock: '1',
      location: 'Thành phố Hồ Chí Minh',
      is_negotiable: 'false',
      sustainability: JSON.stringify(journey('repaired', { repair_history: 'Đã thay hai nút áo bị mất.' })),
    })) form.append(key, value);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZbVQAAAAASUVORK5CYII=', 'base64');
    form.append('images', new Blob([png], { type: 'image/png' }), `${run}.png`);
    const created = await api('/api/products', { method: 'POST', headers: auth(sellerA.token, false), body: form });
    if (created.status === 201) ids.products.push(created.body.data.id);
    const { data: createdJourney } = created.status === 201
      ? await supabaseAdmin.from('product_sustainability').select('lifecycle_type,repair_history,claim_source').eq('product_id', created.body.data.id).single()
      : { data: null };
    check('Normal /sell creation stores real sustainability data', created.status === 201 && createdJourney.lifecycle_type === 'repaired' && createdJourney.claim_source === 'seller_declared');

    const rejectedName = `Phase 11 QA rejected ${run}`;
    const rejectedForm = new FormData();
    for (const [key, value] of Object.entries({
      name: rejectedName,
      description: 'This request must fail before any persistent listing row remains.',
      category_slug: 't-shirts', brand_slug: 'Nike', condition: 'good', size: 'M', price: '330000', stock: '1',
      location: 'Thành phố Hồ Chí Minh', is_negotiable: 'false',
      sustainability: JSON.stringify({ ...journey('new'), claim_source: 'verified' }),
    })) rejectedForm.append(key, value);
    rejectedForm.append('images', new Blob([png], { type: 'image/png' }), `${run}-rejected.png`);
    const rejectedCreate = await api('/api/products', { method: 'POST', headers: auth(sellerA.token, false), body: rejectedForm });
    const { count: rejectedProducts } = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('name', rejectedName);
    check('Spoofed claim source rejected with no orphan product/sustainability row', rejectedCreate.status === 422 && rejectedProducts === 0);

    const snapshotA = await createProduct(sellerA, 'snapshot-a', { stock: 8, price: 280000 });
    await addJourney(snapshotA.id, journey('pre_loved'));
    const spoofCheckout = await checkout(buyerA, [snapshotA]);
    ids.orders.push(spoofCheckout.body?.data?.id);
    const spoofItemId = spoofCheckout.body?.data?.items?.[0]?.id;
    const { data: snapshotItem } = await supabaseAdmin.from('order_items').select('lifecycle_type_snapshot,claim_source_snapshot').eq('id', spoofItemId).single();
    check('Checkout stores authoritative lifecycle snapshot and ignores client spoof', spoofCheckout.status === 200 && snapshotItem.lifecycle_type_snapshot === 'pre_loved' && snapshotItem.claim_source_snapshot === 'seller_declared');

    const currentAfterSale = await api(`/api/seller/listings/${snapshotA.id}`, { headers: auth(sellerA.token, false) });
    const afterPurchaseEdit = await api(`/api/seller/listings/${snapshotA.id}`, {
      method: 'PATCH', headers: auth(sellerA.token),
      body: JSON.stringify({ expected_updated_at: currentAfterSale.body.data.updated_at, sustainability: journey('repaired', { repair_history: 'Đã gia cố đường may ở vai áo.' }) }),
    });
    const { data: unchangedAfterEdit } = await supabaseAdmin.from('order_items').select('lifecycle_type_snapshot,claim_source_snapshot').eq('id', spoofItemId).single();
    check('Product edit after purchase cannot change historical snapshot', afterPurchaseEdit.status === 200 && unchangedAfterEdit.lifecycle_type_snapshot === 'pre_loved');

    const cancelled = await api(`/api/orders/${spoofCheckout.body.data.id}/cancel`, { method: 'POST', headers: auth(buyerA.token, false) });
    const { data: unchangedAfterCancel } = await supabaseAdmin.from('order_items').select('lifecycle_type_snapshot,claim_source_snapshot').eq('id', spoofItemId).single();
    check('Cancellation/restock preserves snapshot values', cancelled.status === 200 && unchangedAfterCancel.lifecycle_type_snapshot === 'pre_loved');

    const immutableAttempt = await supabaseAdmin.from('order_items').update({ lifecycle_type_snapshot: 'upcycled' }).eq('id', spoofItemId);
    check('Database rejects direct snapshot mutation', Boolean(immutableAttempt.error));

    const multiA = await createProduct(sellerA, 'multi-a', { price: 300000 });
    const multiB = await createProduct(sellerB, 'multi-b', { price: 310000 });
    await addJourney(multiA.id, journey('deadstock'));
    await addJourney(multiB.id, journey('upcycled'));
    const multi = await checkout(buyerB, [multiA, multiB]);
    ids.orders.push(multi.body?.data?.id);
    const { data: multiItems } = await supabaseAdmin.from('order_items').select('product_id,lifecycle_type_snapshot,claim_source_snapshot').eq('order_id', multi.body?.data?.id);
    const byProduct = new Map((multiItems || []).map((item) => [item.product_id, item]));
    check('Multi-seller checkout snapshots each authoritative journey', multi.status === 200 && byProduct.get(multiA.id)?.lifecycle_type_snapshot === 'deadstock' && byProduct.get(multiB.id)?.lifecycle_type_snapshot === 'upcycled');

    const idemProduct = await createProduct(sellerA, 'idempotent', { stock: 5, price: 290000 });
    await addJourney(idemProduct.id, journey('new'));
    const idemKey = uuid();
    const idemResults = await Promise.all(Array.from({ length: 10 }, () => checkout(buyerB, [idemProduct], idemKey)));
    const idemOrderIds = new Set(idemResults.map((result) => result.body?.data?.id));
    ids.orders.push([...idemOrderIds][0]);
    const { data: idemItems } = await supabaseAdmin.from('order_items').select('id,lifecycle_type_snapshot').eq('order_id', [...idemOrderIds][0]);
    const { data: idemStock } = await supabaseAdmin.from('products').select('stock').eq('id', idemProduct.id).single();
    check('Phase 10 idempotent replay keeps one order/snapshot/inventory deduction', idemResults.every((result) => result.status === 200) && idemOrderIds.size === 1 && idemItems.length === 1 && idemItems[0].lifecycle_type_snapshot === 'new' && idemStock.stock === 4);

    const list = await api(`/api/products?search=${encodeURIComponent(snapshotA.name)}`);
    const minimalKeys = Object.keys(list.body?.data?.[0]?.sustainability || {}).sort().join(',');
    check('Public product lists expose only minimum future-badge data', list.status === 200 && minimalKeys === 'claim_source,lifecycle_type');

    const { count: seedCount } = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('listing_source', 'seed');
    const { count: seededJourneyCount } = await supabaseAdmin.from('product_sustainability').select('id,products!inner(listing_source)', { count: 'exact', head: true }).eq('products.listing_source', 'seed');
    check('148 seed products remain untouched and unclassified', seedCount === 148 && seededJourneyCount === 0, `seed=${seedCount}, sustainability=${seededJourneyCount}`);

    console.log(`\nPHASE11 SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((value) => !value)) process.exitCode = 1;
  } catch (error) {
    console.error('PHASE11 TEST ERROR:', error.message || error);
    process.exitCode = 1;
  } finally {
    await cleanup();
    console.log('Phase 11 QA cleanup complete (recorded IDs only).');
  }
})();
