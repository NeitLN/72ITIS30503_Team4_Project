/**
 * Phase 13 focused circular-impact contract.
 *
 * Uses unique users/products/orders, records every created ID, and deletes
 * only those IDs in finally. Existing seed and real-user rows are read-only.
 */
const path = require('path');
require('dotenv').config({ path: [path.join(__dirname, '.env'), path.join(__dirname, '../.env')] });
const crypto = require('crypto');
const { supabase, supabaseAdmin } = require('./lib/supabase');
const { signAuthToken } = require('./services/authService');

const API_BASE = process.env.PHASE13_API_BASE || 'http://127.0.0.1:8081';
const run = `phase13-qa-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const ids = { users: [], products: [], orders: [] };
const checks = [];

const CIRCULAR = ['deadstock', 'pre_loved', 'repaired', 'upcycled'];

function uuid() { return crypto.randomUUID(); }
function auth(token) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }
function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}
function expectedPercent(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}
async function api(pathname, options = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, options);
  return { status: response.status, body: await response.json().catch(() => null) };
}
async function createUser(label, role = 'seller') {
  const row = {
    id: uuid(),
    email: `${run}-${label}@stylehub.invalid`,
    full_name: `Phase 13 ${label}`,
    username: `p13-${label}-${crypto.randomBytes(3).toString('hex')}`.slice(0, 30),
    password_hash: 'phase13-qa-not-loginable',
    role,
  };
  const { data, error } = await supabaseAdmin.from('users').insert(row).select('id,email,username,role').single();
  if (error) throw error;
  ids.users.push(data.id);
  return { ...data, token: signAuthToken(data) };
}
async function createProduct(seller, label, overrides = {}) {
  const row = {
    id: uuid(),
    name: `Phase 13 ${label} ${run}`,
    slug: `${run}-${label}`.toLowerCase(),
    price: 280000,
    sale_price: null,
    category_slug: 't-shirts',
    brand: 'Nike',
    image_url: '/images/products/nike-sportswear-club-tee.jpg',
    thumbnail: '/images/products/nike-sportswear-club-tee.jpg',
    description: 'Scoped Phase 13 circular-impact QA listing.',
    stock: 8,
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
  const { data, error } = await supabaseAdmin.from('products').insert(row).select('id,slug,price').single();
  if (error) throw error;
  ids.products.push(data.id);
  return data;
}
async function setJourney(productId, lifecycleType) {
  const payload = {
    product_id: productId,
    lifecycle_type: lifecycleType,
    material: lifecycleType === 'not_specified' ? null : 'Cotton',
    repair_history: lifecycleType === 'repaired' ? 'Đã thay khóa kéo bị hỏng.' : null,
    upcycle_details: lifecycleType === 'upcycled' ? 'Tái thiết kế từ áo sơ mi cũ.' : null,
    product_story: lifecycleType === 'not_specified' ? null : `Phase 13 ${lifecycleType} story.`,
    reuse_packaging: lifecycleType !== 'not_specified',
    claim_source: 'seller_declared',
  };
  const { error } = await supabaseAdmin.from('product_sustainability').upsert(payload, { onConflict: 'product_id' });
  if (error) throw error;
}
function checkoutPayload(lines) {
  return {
    customer: {
      name: 'Phase Thirteen Buyer',
      email: `${run}-buyer@example.invalid`,
      phone: '0901234567',
      address: '13 Circular Street, Quận 1',
      city: 'Thành phố Hồ Chí Minh',
    },
    paymentMethod: 'cod',
    items: lines.map(({ product, quantity }) => ({
      productId: product.id,
      variantId: null,
      quantity,
      expectedUnitPrice: Number(product.price),
    })),
  };
}
async function checkout(buyer, lines) {
  const response = await api('/api/orders', {
    method: 'POST',
    headers: { ...auth(buyer.token), 'Idempotency-Key': uuid() },
    body: JSON.stringify(checkoutPayload(lines)),
  });
  if (response.status === 200 && response.body?.data?.id) ids.orders.push(response.body.data.id);
  return response;
}
async function completeOrderItems(orderId) {
  const { error } = await supabaseAdmin.from('order_items').update({ fulfillment_status: 'completed' }).eq('order_id', orderId);
  if (error) throw error;
}
function assertPublicShape(name, data, allowedTopLevel, allowedMetrics) {
  const top = Object.keys(data || {}).sort();
  const metricKeys = Object.keys(data?.metrics || {}).sort();
  check(`${name} top-level privacy allowlist`, top.join(',') === [...allowedTopLevel].sort().join(','), top.join(','));
  check(`${name} metric privacy allowlist`, metricKeys.join(',') === [...allowedMetrics].sort().join(','), metricKeys.join(','));
  const serialized = JSON.stringify(data || {});
  check(`${name} exposes no identifiers or raw rows`, !/(productId|sellerId|buyerId|orderId|email|items|users|orders)/i.test(serialized));
}
async function cleanup() {
  const productIds = [...new Set(ids.products)];
  const orderIds = [...new Set(ids.orders)];
  if (orderIds.length) {
    await supabaseAdmin.from('inventory_movements').delete().in('order_id', orderIds);
    await supabaseAdmin.from('checkout_idempotency').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_coupons').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_items').delete().in('order_id', orderIds);
    await supabaseAdmin.from('orders').delete().in('id', orderIds);
  }
  if (ids.users.length) await supabaseAdmin.from('checkout_idempotency').delete().in('buyer_id', ids.users);
  if (productIds.length) {
    await supabaseAdmin.from('product_sustainability').delete().in('product_id', productIds);
    await supabaseAdmin.from('product_images').delete().in('product_id', productIds);
    await supabaseAdmin.from('products').delete().in('id', productIds);
  }
  if (ids.users.length) await supabaseAdmin.from('users').delete().in('id', ids.users);
}

(async () => {
  try {
    if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for scoped Phase 13 QA.');
    const health = await api('/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);

    // The first RED assertion: current Phase 12 has no impact route.
    const baselineResponse = await api('/api/sustainability/impact');
    check('Public platform impact endpoint exists', baselineResponse.status === 200, `status=${baselineResponse.status}`);
    if (baselineResponse.status !== 200) throw new Error('Phase 13 impact endpoint is not implemented yet.');

    const impactService = require('./services/impactService');
    const emptyListings = impactService.summarizeActiveListings([], []);
    const emptyCompleted = impactService.summarizeCompletedItems([]);
    check('Platform zero-data listing response is stable', emptyListings.activeUserListings === 0 && emptyListings.activeJourneyListings === 0 && emptyListings.activeCircularListings === 0 && emptyListings.journeyCoveragePercent === 0);
    check('Platform zero-data completed response is stable', emptyCompleted.completedCircularUnits === 0 && CIRCULAR.every((key) => emptyCompleted.breakdown[key] === 0));

    const rounding = impactService.summarizeActiveListings(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [{ product_id: 'a', lifecycle_type: 'new' }],
    );
    check('Coverage uses one-decimal half-up rounding', rounding.journeyCoveragePercent === 33.3);

    const baseline = baselineResponse.body.data;
    const sellerA = await createUser('seller-a');
    const sellerB = await createUser('seller-b');
    const buyer = await createUser('buyer', 'customer');
    const stranger = await createUser('stranger', 'customer');

    const products = {
      new: await createProduct(sellerA, 'new'),
      preLoved: await createProduct(sellerA, 'pre-loved'),
      repaired: await createProduct(sellerA, 'repaired'),
      unspecified: await createProduct(sellerA, 'not-specified'),
      missing: await createProduct(sellerA, 'missing'),
      hidden: await createProduct(sellerA, 'hidden-circular', { status: 'hidden' }),
      upcycledB: await createProduct(sellerB, 'upcycled-b'),
      seedLike: await createProduct(sellerA, 'seed-excluded', { listing_source: 'seed' }),
    };
    await setJourney(products.new.id, 'new');
    await setJourney(products.preLoved.id, 'pre_loved');
    await setJourney(products.repaired.id, 'repaired');
    await setJourney(products.unspecified.id, 'not_specified');
    await setJourney(products.hidden.id, 'upcycled');
    await setJourney(products.upcycledB.id, 'upcycled');
    await setJourney(products.seedLike.id, 'upcycled');

    const listingsImpact = (await api('/api/sustainability/impact')).body.data;
    const baseMetrics = baseline.metrics;
    check('Active user listing denominator excludes hidden and seed rows', listingsImpact.metrics.activeUserListings === baseMetrics.activeUserListings + 6);
    check('Specified numerator includes new and excludes missing/not specified', listingsImpact.metrics.activeJourneyListings === baseMetrics.activeJourneyListings + 4);
    check('New counts as specified but not circular', listingsImpact.metrics.activeCircularListings === baseMetrics.activeCircularListings + 3);
    check('Coverage percentage uses exact active-user denominator', listingsImpact.metrics.journeyCoveragePercent === expectedPercent(baseMetrics.activeJourneyListings + 4, baseMetrics.activeUserListings + 6));
    check('Active circular breakdown is exact',
      listingsImpact.activeLifecycleBreakdown.pre_loved === baseline.activeLifecycleBreakdown.pre_loved + 1 &&
      listingsImpact.activeLifecycleBreakdown.repaired === baseline.activeLifecycleBreakdown.repaired + 1 &&
      listingsImpact.activeLifecycleBreakdown.upcycled === baseline.activeLifecycleBreakdown.upcycled + 1,
    );

    const multi = await checkout(buyer, [
      { product: products.preLoved, quantity: 2 },
      { product: products.upcycledB, quantity: 1 },
    ]);
    check('Scoped multi-seller checkout created', multi.status === 200);
    await completeOrderItems(multi.body.data.id);

    const cancelled = await checkout(buyer, [{ product: products.repaired, quantity: 1 }]);
    check('Scoped cancellable checkout created', cancelled.status === 200);
    const cancelledResult = await api(`/api/orders/${cancelled.body.data.id}/cancel`, { method: 'POST', headers: auth(buyer.token) });
    check('Cancelled fixture uses real cancellation path', cancelledResult.status === 200);

    const completedImpact = (await api('/api/sustainability/impact')).body.data;
    check('Completed circular metric sums quantity, not rows', completedImpact.metrics.completedCircularUnits === baseline.metrics.completedCircularUnits + 3);
    check('Completed breakdown uses immutable lifecycle snapshots',
      completedImpact.completedLifecycleBreakdown.pre_loved === baseline.completedLifecycleBreakdown.pre_loved + 2 &&
      completedImpact.completedLifecycleBreakdown.upcycled === baseline.completedLifecycleBreakdown.upcycled + 1,
    );
    check('Cancelled items are excluded from completed impact', completedImpact.completedLifecycleBreakdown.repaired === baseline.completedLifecycleBreakdown.repaired);

    const sellerAImpact = await api('/api/profile/me/impact', { headers: auth(sellerA.token) });
    check('Authenticated seller owns private impact', sellerAImpact.status === 200 && sellerAImpact.body.data.metrics.circularUnitsSold === 2 && sellerAImpact.body.data.metrics.circularUnitsPurchased === 0);
    check('Private seller coverage uses owned active user listings', sellerAImpact.body.data.metrics.activeUserListings === 5 && sellerAImpact.body.data.metrics.activeJourneyListings === 3 && sellerAImpact.body.data.metrics.journeyCoveragePercent === 60);
    const spoofed = await api(`/api/profile/me/impact?userId=${sellerB.id}`, { headers: auth(sellerA.token) });
    check('Profile impact ignores cross-user spoof input', spoofed.status === 200 && spoofed.body.data.metrics.circularUnitsSold === 2 && spoofed.body.data.metrics.activeCircularListings === 2);

    const buyerImpact = await api('/api/profile/me/impact', { headers: auth(buyer.token) });
    check('Buyer private impact counts purchased quantities from owned orders', buyerImpact.status === 200 && buyerImpact.body.data.metrics.circularUnitsPurchased === 3 && buyerImpact.body.data.metrics.circularUnitsSold === 0);
    const strangerImpact = await api('/api/profile/me/impact', { headers: auth(stranger.token) });
    check('Private impact returns honest zero values', strangerImpact.status === 200 && strangerImpact.body.data.metrics.circularUnitsPurchased === 0 && strangerImpact.body.data.metrics.circularUnitsSold === 0 && strangerImpact.body.data.metrics.journeyCoveragePercent === 0);
    const noAuth = await api('/api/profile/me/impact');
    check('Private profile impact requires authentication', noAuth.status === 401);

    const publicA = await api(`/api/sellers/${sellerA.username}/impact`);
    const publicB = await api(`/api/sellers/${sellerB.username}/impact`);
    check('Public seller impact attributes only seller-owned completed quantities', publicA.status === 200 && publicA.body.data.metrics.completedCircularUnitsSold === 2 && publicB.status === 200 && publicB.body.data.metrics.completedCircularUnitsSold === 1);
    check('Public seller active breakdown is seller-scoped', publicA.body.data.activeLifecycleBreakdown.pre_loved === 1 && publicA.body.data.activeLifecycleBreakdown.repaired === 1 && publicB.body.data.activeLifecycleBreakdown.upcycled === 1);
    const unknown = await api('/api/sellers/phase13-definitely-unknown/impact');
    check('Unknown public seller impact returns 404', unknown.status === 404);

    assertPublicShape('Platform impact', completedImpact,
      ['scope', 'methodologyVersion', 'generatedAt', 'metrics', 'activeLifecycleBreakdown', 'completedLifecycleBreakdown'],
      ['activeUserListings', 'activeJourneyListings', 'journeyCoveragePercent', 'activeCircularListings', 'completedCircularUnits'],
    );
    assertPublicShape('Public seller impact', publicA.body.data,
      ['scope', 'methodologyVersion', 'generatedAt', 'metrics', 'activeLifecycleBreakdown'],
      ['activeCircularListings', 'completedCircularUnitsSold'],
    );

    await setJourney(products.preLoved.id, 'new');
    const afterEditPlatform = (await api('/api/sustainability/impact')).body.data;
    const afterEditSeller = (await api(`/api/sellers/${sellerA.username}/impact`)).body.data;
    check('Later listing edit changes active classification', afterEditSeller.metrics.activeCircularListings === 1 && afterEditSeller.activeLifecycleBreakdown.pre_loved === 0);
    check('Later listing edit cannot change historical completed impact', afterEditPlatform.metrics.completedCircularUnits === completedImpact.metrics.completedCircularUnits && afterEditPlatform.completedLifecycleBreakdown.pre_loved === completedImpact.completedLifecycleBreakdown.pre_loved && afterEditSeller.metrics.completedCircularUnitsSold === 2);

    const anonSustainability = await supabase.from('product_sustainability').select('product_id').limit(1);
    const anonOrderItems = await supabase.from('order_items').select('id').limit(1);
    check('Anonymous direct sustainability-table access remains denied', Boolean(anonSustainability.error) && !(anonSustainability.data || []).length);
    check('Anonymous direct order-item access returns no rows', !(anonOrderItems.data || []).length);

    check('Impact responses include transparent calculation time and methodology version',
      !Number.isNaN(Date.parse(completedImpact.generatedAt)) && completedImpact.methodologyVersion === '1.0' && !Object.prototype.hasOwnProperty.call(completedImpact, 'dataAsOf'),
    );

    console.log(`\nPHASE13 BACKEND SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((value) => !value)) process.exitCode = 1;
  } catch (error) {
    console.error('PHASE13 BACKEND TEST ERROR:', error.message || error);
    process.exitCode = 1;
  } finally {
    await cleanup();
    console.log('Phase 13 backend QA cleanup complete (recorded IDs only).');
  }
})();
