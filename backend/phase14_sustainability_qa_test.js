/**
 * Phase 14 — consolidated sustainability security, impact, privacy, and
 * checkout-snapshot QA. All fixtures are created with a unique phase14-qa
 * marker, every ID is captured, and cleanup deletes only those exact IDs.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: [path.join(__dirname, '.env'), path.join(__dirname, '../.env')] });

const { supabase, supabaseAdmin } = require('./lib/supabase');
const impactService = require('./services/impactService');
const {
  validateSustainability,
  SustainabilityValidationError,
  FIELD_LIMITS,
  CIRCULAR_LIFECYCLE_TYPES,
} = require('./constants/sustainability');

const API_BASE = process.env.PHASE14_API_BASE || 'http://127.0.0.1:8080';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const run = `phase14-qa-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const ids = { users: [], products: [], orders: [] };
const checks = [];
let cleaned = false;

const CIRCULAR = [...CIRCULAR_LIFECYCLE_TYPES];

function uuid() { return crypto.randomUUID(); }
function headers(token, extra = {}) {
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}
function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}
function isValidationError(payload) {
  try {
    validateSustainability(payload, { requireExplicit: true });
    return false;
  } catch (error) {
    return error instanceof SustainabilityValidationError;
  }
}
function breakdownTotal(breakdown) {
  return CIRCULAR.reduce((total, key) => total + Number(breakdown?.[key] || 0), 0);
}
function comparableImpact(data) {
  const { generatedAt, ...stable } = data;
  return stable;
}
async function api(method, pathname, payload, token, extraHeaders = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: headers(token, extraHeaders),
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}
async function register(label, role = 'seller') {
  const password = `P14-${crypto.randomBytes(18).toString('base64url')}!`;
  const email = `${run}-${label}@stylehub.invalid`;
  const response = await api('POST', '/api/auth/register', {
    name: `Phase 14 ${label}`,
    email,
    password,
    role,
  });
  if (response.status !== 200) throw new Error(`Could not register ${label}: ${response.status}`);
  const user = response.body.data.user;
  ids.users.push(user.id);
  const username = `p14-${label}-${crypto.randomBytes(2).toString('hex')}`.slice(0, 30);
  const profile = await api('PATCH', '/api/profile/me', {
    display_name: `Phase 14 ${label}`,
    username,
    bio: 'Tài khoản QA tuần hoàn dùng dữ liệu tạm thời.',
    location: 'Thành phố Hồ Chí Minh',
  }, response.body.data.token);
  if (profile.status !== 200) throw new Error(`Could not prepare ${label} profile: ${profile.status}`);
  return { ...user, username, email, token: response.body.data.token };
}
async function createProduct(seller, label, overrides = {}) {
  const row = {
    id: uuid(),
    name: `Phase 14 ${label} ${run}`,
    slug: `${run}-${label}`.toLowerCase(),
    price: 360000,
    sale_price: null,
    category_slug: 't-shirts',
    brand: 'Nike',
    image_url: '/images/products/nike-sportswear-club-tee.jpg',
    thumbnail: '/images/products/nike-sportswear-club-tee.jpg',
    description: 'Scoped Phase 14 sustainability QA listing with real database state.',
    stock: 20,
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
  const { data, error } = await supabaseAdmin.from('products').insert(row).select('id,slug,price,status,updated_at,seller_id').single();
  if (error) throw error;
  ids.products.push(data.id);
  return data;
}
async function setJourney(productId, lifecycleType) {
  const payload = {
    product_id: productId,
    lifecycle_type: lifecycleType,
    material: lifecycleType === 'not_specified' ? null : 'Cotton dệt dày',
    repair_history: lifecycleType === 'repaired' ? 'Đã thay khóa kéo và gia cố đường may.' : null,
    upcycle_details: lifecycleType === 'upcycled' ? 'Tái thiết kế từ một áo sơ mi cũ.' : null,
    product_story: lifecycleType === 'not_specified' ? null : `Hành trình ${lifecycleType} do người bán tự khai.`,
    reuse_packaging: lifecycleType !== 'not_specified',
    claim_source: 'seller_declared',
  };
  const { error } = await supabaseAdmin.from('product_sustainability').upsert(payload, { onConflict: 'product_id' });
  if (error) throw error;
}
function checkoutPayload(lines) {
  return {
    customer: {
      name: 'Phase Fourteen Buyer',
      email: `${run}-delivery@stylehub.invalid`,
      phone: '0901234567',
      address: '14 Circular QA Street, Quận 1',
      city: 'Thành phố Hồ Chí Minh',
    },
    paymentMethod: 'cod',
    sellerId: uuid(),
    totals: { total: 1 },
    items: lines.map(({ product, quantity }) => ({
      productId: product.id,
      variantId: null,
      quantity,
      expectedUnitPrice: Number(product.price),
      lifecycle_type_snapshot: 'upcycled',
      claim_source_snapshot: 'verified',
      seller_id: uuid(),
      line_total: 1,
    })),
  };
}
async function checkout(buyer, lines, idempotencyKey = uuid()) {
  const response = await api('POST', '/api/orders', checkoutPayload(lines), buyer.token, { 'Idempotency-Key': idempotencyKey });
  if (response.status === 200 && response.body?.data?.id && !ids.orders.includes(response.body.data.id)) {
    ids.orders.push(response.body.data.id);
  }
  return response;
}
async function transitionItem(seller, itemId, nextStatus) {
  return api('PATCH', `/api/seller/orders/items/${itemId}/fulfillment`, { status: nextStatus }, seller.token);
}
async function completeOrderThroughSellerApis(orderId, sellersById) {
  const { data: items, error } = await supabaseAdmin
    .from('order_items')
    .select('id,seller_id')
    .eq('order_id', orderId)
    .order('id');
  if (error) throw error;
  for (const status of ['confirmed', 'preparing', 'shipped', 'completed']) {
    for (const item of items) {
      const response = await transitionItem(sellersById.get(item.seller_id), item.id, status);
      if (response.status !== 200) throw new Error(`Fulfillment transition ${status} failed: ${response.status}`);
    }
  }
  return items;
}
async function cleanup() {
  const orderIds = [...new Set(ids.orders)];
  const productIds = [...new Set(ids.products)];
  const userIds = [...new Set(ids.users)];
  if (orderIds.length) {
    await supabaseAdmin.from('inventory_movements').delete().in('order_id', orderIds);
    await supabaseAdmin.from('checkout_idempotency').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_coupons').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_items').delete().in('order_id', orderIds);
    await supabaseAdmin.from('orders').delete().in('id', orderIds);
  }
  if (userIds.length) await supabaseAdmin.from('checkout_idempotency').delete().in('buyer_id', userIds);
  if (productIds.length) {
    await supabaseAdmin.from('product_sustainability').delete().in('product_id', productIds);
    await supabaseAdmin.from('product_images').delete().in('product_id', productIds);
    await supabaseAdmin.from('products').delete().in('id', productIds);
  }
  if (userIds.length) await supabaseAdmin.from('users').delete().in('id', userIds);
  cleaned = true;
}
async function cleanupIsExact() {
  const [users, products, orders] = await Promise.all([
    ids.users.length ? supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).in('id', ids.users) : { count: 0 },
    ids.products.length ? supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).in('id', ids.products) : { count: 0 },
    ids.orders.length ? supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).in('id', ids.orders) : { count: 0 },
  ]);
  return (users.count || 0) === 0 && (products.count || 0) === 0 && (orders.count || 0) === 0;
}

(async () => {
  try {
    if (!supabaseAdmin || !SUPABASE_URL || !ANON_KEY) throw new Error('Phase 14 requires configured local QA credentials.');
    const health = await api('GET', '/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);

    // Pure formula and validation cases are deterministic and database-free.
    const zeroListings = impactService.summarizeActiveListings([], []);
    const zeroCompleted = impactService.summarizeCompletedItems([]);
    check('Zero denominator returns zero journey coverage', zeroListings.journeyCoveragePercent === 0);
    check('Zero products and completed units return stable zeros', zeroListings.activeUserListings === 0 && zeroCompleted.completedCircularUnits === 0);
    const onlyUnspecified = impactService.summarizeActiveListings([{ id: 'a' }, { id: 'b' }], [{ product_id: 'a', lifecycle_type: 'not_specified' }]);
    check('Only not-specified listings produce zero specified and circular counts', onlyUnspecified.activeJourneyListings === 0 && onlyUnspecified.activeCircularListings === 0);
    const lifecycleMatrix = impactService.summarizeActiveListings(
      [{ id: 'new' }, ...CIRCULAR.map((id) => ({ id }))],
      [{ product_id: 'new', lifecycle_type: 'new' }, ...CIRCULAR.map((lifecycle_type) => ({ product_id: lifecycle_type, lifecycle_type }))],
    );
    check('New is specified but not circular', lifecycleMatrix.activeJourneyListings === 5 && lifecycleMatrix.activeCircularListings === 4);
    check('All four circular lifecycle breakdowns are counted', CIRCULAR.every((key) => lifecycleMatrix.breakdown[key] === 1));
    check('Coverage formula is activeJourneyListings / activeUserListings × 100', lifecycleMatrix.journeyCoveragePercent === 100);
    const quantitySummary = impactService.summarizeCompletedItems([
      { quantity: 2, lifecycle_type_snapshot: 'deadstock' },
      { quantity: 3, lifecycle_type_snapshot: 'pre_loved' },
      { quantity: 4, lifecycle_type_snapshot: 'new' },
      { quantity: 9, lifecycle_type_snapshot: 'not_specified' },
    ]);
    check('Completed impact sums quantity rather than rows', quantitySummary.completedCircularUnits === 5);
    check('Completed breakdown equals its parent total', breakdownTotal(quantitySummary.breakdown) === quantitySummary.completedCircularUnits);

    check('Unsupported lifecycle is rejected', isValidationError({ sustainability: { lifecycle_type: 'organic' } }));
    check('Unsafe material markup is rejected', isValidationError({ sustainability: { lifecycle_type: 'new', material: '<script>alert(1)</script>' } }));
    check('Unsafe repair markup is rejected', isValidationError({ sustainability: { lifecycle_type: 'repaired', repair_history: '<img onerror=alert(1)> unsafe' } }));
    check('Unsafe upcycle markup is rejected', isValidationError({ sustainability: { lifecycle_type: 'upcycled', upcycle_details: 'javascript:alert(1)' } }));
    check('Unsafe story markup is rejected', isValidationError({ sustainability: { lifecycle_type: 'pre_loved', product_story: '<iframe>unsafe</iframe>' } }));
    check('Control characters are rejected', isValidationError({ sustainability: { lifecycle_type: 'new', material: 'Cotton\u0000blend' } }));
    check('Oversized sustainability content is rejected', isValidationError({ sustainability: { lifecycle_type: 'new', product_story: 'x'.repeat(FIELD_LIMITS.product_story + 1) } }));
    check('Malformed packaging input is rejected', isValidationError({ sustainability: { lifecycle_type: 'new', reuse_packaging: 'javascript:alert(1)' } }));
    const unicode = validateSustainability({ sustainability: { lifecycle_type: 'repaired', material: 'Vải lanh Việt Nam', repair_history: 'Đã vá thủ công tại Huế.', product_story: 'Áo được gìn giữ qua nhiều mùa.' } });
    check('Vietnamese Unicode remains supported', unicode.value.repair_history.includes('Huế'));
    check('Claim source and verification state cannot be spoofed', isValidationError({ sustainability: { lifecycle_type: 'new', claim_source: 'verified', is_verified: true } }));
    check('Snapshot fields cannot be supplied through Product Journey input', isValidationError({ sustainability: { lifecycle_type: 'new', lifecycle_type_snapshot: 'upcycled' } }));

    const baseline = (await api('GET', '/api/sustainability/impact')).body.data;
    const sellerA = await register('seller-a');
    const sellerB = await register('seller-b');
    const buyer = await register('buyer', 'customer');
    const intruder = await register('intruder', 'seller');
    const sellersById = new Map([[sellerA.id, sellerA], [sellerB.id, sellerB]]);

    const products = {
      newA: await createProduct(sellerA, 'new-a'),
      unspecifiedA: await createProduct(sellerA, 'unspecified-a'),
      missingA: await createProduct(sellerA, 'missing-a'),
      deadstockA: await createProduct(sellerA, 'deadstock-a'),
      hiddenA: await createProduct(sellerA, 'hidden-a', { status: 'hidden' }),
      draftA: await createProduct(sellerA, 'draft-a', { status: 'draft' }),
      soldA: await createProduct(sellerA, 'sold-a', { status: 'sold' }),
      archivedA: await createProduct(sellerA, 'archived-a', { status: 'archived' }),
      preLovedB: await createProduct(sellerB, 'pre-loved-b'),
      repairedB: await createProduct(sellerB, 'repaired-b'),
      seedLike: await createProduct(sellerA, 'seed-like', { listing_source: 'seed' }),
    };
    await setJourney(products.newA.id, 'new');
    await setJourney(products.unspecifiedA.id, 'not_specified');
    await setJourney(products.deadstockA.id, 'deadstock');
    await setJourney(products.hiddenA.id, 'pre_loved');
    await setJourney(products.draftA.id, 'repaired');
    await setJourney(products.soldA.id, 'upcycled');
    await setJourney(products.archivedA.id, 'deadstock');
    await setJourney(products.preLovedB.id, 'pre_loved');
    await setJourney(products.repairedB.id, 'repaired');
    await setJourney(products.seedLike.id, 'upcycled');

    const active = (await api('GET', '/api/sustainability/impact')).body.data;
    check('Active metrics exclude hidden, draft, sold, archived, and seed listings', active.metrics.activeUserListings === baseline.metrics.activeUserListings + 6);
    check('Specified coverage excludes missing and not-specified journeys', active.metrics.activeJourneyListings === baseline.metrics.activeJourneyListings + 4);
    check('Active circular total includes only eligible active circular listings', active.metrics.activeCircularListings === baseline.metrics.activeCircularListings + 3);
    check('Active lifecycle breakdown equals the active circular parent total', breakdownTotal(active.activeLifecycleBreakdown) === active.metrics.activeCircularListings);
    const expectedCoverage = Math.round(((baseline.metrics.activeJourneyListings + 4) / (baseline.metrics.activeUserListings + 6)) * 1000) / 10;
    check('Live coverage uses the exact active-user-listing denominator', active.metrics.journeyCoveragePercent === expectedCoverage);

    const invalidEdit = await api('PATCH', `/api/seller/listings/${products.deadstockA.id}`, {
      expected_updated_at: products.deadstockA.updated_at,
      sustainability: { lifecycle_type: 'unsupported' },
    }, sellerA.token);
    check('Seller API rejects unsupported lifecycle values', invalidEdit.status === 422);
    const crossSeller = await api('PATCH', `/api/seller/listings/${products.deadstockA.id}`, {
      sustainability: { lifecycle_type: 'pre_loved' },
    }, sellerB.token);
    check('Cross-seller sustainability update is rejected as not found', crossSeller.status === 404);
    const seedEdit = await api('PATCH', `/api/seller/listings/${products.seedLike.id}`, {
      sustainability: { lifecycle_type: 'upcycled', upcycle_details: 'Không được phép sửa seed listing.' },
    }, sellerA.token);
    check('Seed catalog product cannot be modified through seller APIs', seedEdit.status === 404);

    const staleToken = products.deadstockA.updated_at;
    const firstEdit = await api('PATCH', `/api/seller/listings/${products.deadstockA.id}`, {
      expected_updated_at: staleToken,
      sustainability: { lifecycle_type: 'deadstock', product_story: 'Bản cập nhật mới nhất có thẩm quyền.' },
    }, sellerA.token);
    const staleEdit = await api('PATCH', `/api/seller/listings/${products.deadstockA.id}`, {
      expected_updated_at: staleToken,
      sustainability: { lifecycle_type: 'pre_loved', product_story: 'Bản cũ không được ghi đè.' },
    }, sellerA.token);
    check('First optimistic-concurrency update succeeds', firstEdit.status === 200);
    check('Stale optimistic-concurrency update returns 409', staleEdit.status === 409);

    const spoofRoute = await api('PATCH', `/api/seller/listings/${products.deadstockA.id}`, {
      expected_updated_at: firstEdit.body.data.updated_at,
      seller_id: sellerB.id,
      product_id: products.preLovedB.id,
      status: 'sold',
      sustainability: { lifecycle_type: 'deadstock', product_story: 'Route ownership remains authoritative.' },
    }, sellerA.token);
    const { data: spoofVerified } = await supabaseAdmin.from('products').select('seller_id,status').eq('id', products.deadstockA.id).single();
    check('Seller ID, product ID, and status cannot be spoofed in edit body', spoofRoute.status === 200 && spoofVerified.seller_id === sellerA.id && spoofVerified.status === 'active');

    const idempotencyKey = uuid();
    const firstCheckout = await checkout(buyer, [
      { product: products.deadstockA, quantity: 2 },
      { product: products.preLovedB, quantity: 3 },
    ], idempotencyKey);
    const replayCheckout = await checkout(buyer, [
      { product: products.deadstockA, quantity: 2 },
      { product: products.preLovedB, quantity: 3 },
    ], idempotencyKey);
    check('Multi-seller checkout succeeds atomically', firstCheckout.status === 200);
    check('Idempotent retry returns the same single order', replayCheckout.status === 200 && replayCheckout.body.data.id === firstCheckout.body.data.id);
    const orderId = firstCheckout.body.data.id;
    const { data: snapshotsBefore } = await supabaseAdmin
      .from('order_items')
      .select('id,product_id,seller_id,quantity,unit_price,line_total,lifecycle_type_snapshot,claim_source_snapshot,fulfillment_status')
      .eq('order_id', orderId)
      .order('product_id');
    check('Checkout stores one order item per product after replay', snapshotsBefore.length === 2);
    const snapshotByProduct = new Map(snapshotsBefore.map((item) => [item.product_id, item]));
    check('Checkout ignores client lifecycle and claim-source snapshot spoofing', snapshotByProduct.get(products.deadstockA.id).lifecycle_type_snapshot === 'deadstock' && snapshotByProduct.get(products.deadstockA.id).claim_source_snapshot === 'seller_declared');
    check('Checkout stores authoritative seller and monetary snapshots', snapshotByProduct.get(products.deadstockA.id).seller_id === sellerA.id && Number(snapshotByProduct.get(products.deadstockA.id).unit_price) === Number(products.deadstockA.price) && Number(snapshotByProduct.get(products.deadstockA.id).line_total) === Number(products.deadstockA.price) * 2);
    await completeOrderThroughSellerApis(orderId, sellersById);
    const { data: completedOrder } = await supabaseAdmin.from('orders').select('status').eq('id', orderId).single();
    check('Aggregate order status is consistent after all items complete', completedOrder.status === 'completed');

    const cancelledCheckout = await checkout(buyer, [{ product: products.repairedB, quantity: 4 }]);
    check('Controlled cancellable checkout succeeds', cancelledCheckout.status === 200);
    const cancelledOrderId = cancelledCheckout.body.data.id;
    const { data: cancelledSnapshotBefore } = await supabaseAdmin.from('order_items').select('id,lifecycle_type_snapshot,claim_source_snapshot').eq('order_id', cancelledOrderId).single();
    const cancelledResult = await api('POST', `/api/orders/${cancelledOrderId}/cancel`, undefined, buyer.token);
    const { data: cancelledSnapshotAfter } = await supabaseAdmin.from('order_items').select('lifecycle_type_snapshot,claim_source_snapshot,fulfillment_status').eq('id', cancelledSnapshotBefore.id).single();
    check('Cancellation uses the real order path and excludes the item', cancelledResult.status === 200 && cancelledSnapshotAfter.fulfillment_status === 'cancelled');
    check('Cancellation and inventory restoration preserve sustainability snapshots', cancelledSnapshotAfter.lifecycle_type_snapshot === cancelledSnapshotBefore.lifecycle_type_snapshot && cancelledSnapshotAfter.claim_source_snapshot === cancelledSnapshotBefore.claim_source_snapshot);

    const platformAfter = (await api('GET', '/api/sustainability/impact')).body.data;
    check('Platform impact includes only completed circular quantities', platformAfter.metrics.completedCircularUnits === baseline.metrics.completedCircularUnits + 5);
    check('Completed lifecycle breakdown equals its parent total', breakdownTotal(platformAfter.completedLifecycleBreakdown) === platformAfter.metrics.completedCircularUnits);
    check('Cancelled quantities do not contribute to completed impact', platformAfter.completedLifecycleBreakdown.repaired === baseline.completedLifecycleBreakdown.repaired);

    const sellerAImpact = (await api('GET', '/api/profile/me/impact', undefined, sellerA.token)).body.data;
    const sellerBImpact = (await api('GET', '/api/profile/me/impact', undefined, sellerB.token)).body.data;
    const buyerImpact = (await api('GET', '/api/profile/me/impact', undefined, buyer.token)).body.data;
    const intruderImpact = (await api('GET', `/api/profile/me/impact?userId=${sellerA.id}`, undefined, intruder.token)).body.data;
    check('Seller A receives only own attributed completed units', sellerAImpact.metrics.circularUnitsSold === 2 && sellerAImpact.metrics.circularUnitsPurchased === 0);
    check('Seller B receives only own attributed completed units', sellerBImpact.metrics.circularUnitsSold === 3 && sellerBImpact.metrics.circularUnitsPurchased === 0);
    check('Buyer receives only legitimate completed purchase units', buyerImpact.metrics.circularUnitsPurchased === 5 && buyerImpact.metrics.circularUnitsSold === 0);
    check('One seller cannot spoof another private profile impact', intruderImpact.metrics.circularUnitsSold === 0 && intruderImpact.metrics.activeUserListings === 0);

    const publicA = (await api('GET', `/api/sellers/${sellerA.username}/impact`)).body.data;
    const publicB = (await api('GET', `/api/sellers/${sellerB.username}/impact`)).body.data;
    const publicSerialized = JSON.stringify({ publicA, publicB });
    check('Public storefront impact attributes only seller-level sold units', publicA.metrics.completedCircularUnitsSold === 2 && publicB.metrics.completedCircularUnitsSold === 3);
    check('Public seller impact exposes no private profile, buyer, order, address, or total data', !/(email|buyer|order|address|phone|total_amount|circularUnitsPurchased)/i.test(publicSerialized));
    check('Public seller response uses a strict top-level allowlist', Object.keys(publicA).sort().join(',') === ['scope', 'methodologyVersion', 'generatedAt', 'metrics', 'activeLifecycleBreakdown'].sort().join(','));

    const beforeHistoricalEdit = comparableImpact(platformAfter);
    const latestA = await api('GET', `/api/seller/listings/${products.deadstockA.id}`, undefined, sellerA.token);
    const laterEdit = await api('PATCH', `/api/seller/listings/${products.deadstockA.id}`, {
      expected_updated_at: latestA.body.data.updated_at,
      sustainability: { lifecycle_type: 'new', product_story: 'Chuyển phân loại hoạt động sau khi đơn đã hoàn tất.' },
    }, sellerA.token);
    const platformAfterEdit = (await api('GET', '/api/sustainability/impact')).body.data;
    check('Later seller edit changes active classification', laterEdit.status === 200 && platformAfterEdit.metrics.activeCircularListings === platformAfter.metrics.activeCircularListings - 1);
    check('Later seller edit cannot alter historical completed impact', platformAfterEdit.metrics.completedCircularUnits === platformAfter.metrics.completedCircularUnits && platformAfterEdit.completedLifecycleBreakdown.deadstock === platformAfter.completedLifecycleBreakdown.deadstock);
    const repeatedImpact = (await api('GET', '/api/sustainability/impact')).body.data;
    check('Repeated impact requests are deterministic and do not double count', JSON.stringify(comparableImpact(repeatedImpact)) === JSON.stringify(comparableImpact(platformAfterEdit)) && JSON.stringify(beforeHistoricalEdit.metrics) === JSON.stringify(platformAfter.metrics));

    const immutableAttempt = await supabaseAdmin.from('order_items').update({ lifecycle_type_snapshot: 'new' }).eq('id', snapshotByProduct.get(products.deadstockA.id).id);
    check('Immutable order-item lifecycle snapshot rejects direct mutation', Boolean(immutableAttempt.error));

    const anonSustainabilityWrite = await supabase.from('product_sustainability').update({ lifecycle_type: 'new' }).eq('product_id', products.preLovedB.id);
    const anonOrderItems = await supabase.from('order_items').select('id').limit(1);
    const anonRpc = await supabase.rpc('stylehub_update_listing_with_sustainability', {
      p_seller_id: sellerA.id,
      p_product_id: products.deadstockA.id,
      p_expected_updated_at: null,
      p_product_updates: {},
      p_sustainability: { lifecycle_type: 'new' },
    });
    check('Anonymous users cannot modify sustainability data', Boolean(anonSustainabilityWrite.error));
    check('Anonymous users cannot read restricted order-item rows', Boolean(anonOrderItems.error) || !(anonOrderItems.data || []).length);
    check('Anonymous users cannot execute service-role sustainability RPC', Boolean(anonRpc.error));

    const directAuthenticated = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${sellerA.token}` } },
    });
    const authSustainability = await directAuthenticated.from('product_sustainability').select('product_id').limit(1);
    const authOrderItems = await directAuthenticated.from('order_items').select('id').limit(1);
    const authRpc = await directAuthenticated.rpc('stylehub_checkout_atomic', {
      p_buyer_id: buyer.id,
      p_idempotency_key: uuid(),
      p_request_fingerprint: 'phase14-direct-client',
      p_customer: {},
      p_payment_method: 'cod',
      p_notes: null,
      p_coupon_code: null,
      p_items: [],
    });
    check('Backend-authenticated browser token cannot read restricted sustainability table', Boolean(authSustainability.error) || !(authSustainability.data || []).length);
    check('Backend-authenticated browser token cannot read restricted order-items table', Boolean(authOrderItems.error) || !(authOrderItems.data || []).length);
    check('Backend-authenticated browser token cannot execute atomic checkout RPC directly', Boolean(authRpc.error));

    const frontendImpactSource = fs.readFileSync(path.join(__dirname, '../frontend/lib/impact.ts'), 'utf8');
    check('Service-role key remains absent from frontend impact code', !/SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(frontendImpactSource));
    const { data: scopedStocks } = await supabaseAdmin.from('products').select('stock').in('id', ids.products);
    check('No Phase 14 product stock becomes negative', (scopedStocks || []).every((row) => Number(row.stock) >= 0));

    await cleanup();
    check('All captured Phase 14 users, products, and orders are removed', await cleanupIsExact());
    const { count: seedCount } = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('listing_source', 'seed');
    const { count: seededJourneyCount } = await supabaseAdmin.from('product_sustainability').select('product_id,products!inner(id)', { count: 'exact', head: true }).eq('products.listing_source', 'seed');
    check('Verified seed catalog remains 148 and unclassified', seedCount === 148 && seededJourneyCount === 0, `seed=${seedCount}, journeys=${seededJourneyCount}`);

    console.log(`\nPHASE14 BACKEND SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((value) => !value)) process.exitCode = 1;
  } catch (error) {
    console.error('PHASE14 BACKEND TEST ERROR:', error.message || error);
    process.exitCode = 1;
  } finally {
    if (!cleaned) await cleanup().catch((error) => console.error('Phase 14 cleanup error:', error.message));
    console.log('Phase 14 backend QA cleanup complete (captured IDs only).');
  }
})();
