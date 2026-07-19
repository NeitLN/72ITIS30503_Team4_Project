/**
 * Phase 10 live security/concurrency suite.
 *
 * Creates only `phase10-qa-*` rows, records every generated UUID, verifies
 * database state directly, and deletes only those recorded rows in `finally`.
 * Start the backend first. Optional: PHASE10_API_BASE=http://localhost:8080.
 */
require('dotenv').config();
const crypto = require('crypto');
const { supabaseAdmin } = require('./lib/supabase');
const { signAuthToken } = require('./services/authService');

const API_BASE = process.env.PHASE10_API_BASE || 'http://localhost:8080';
const run = `phase10-qa-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const ids = { users: [], products: [], variants: [], coupons: [] };
const checks = [];

function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}
function uuid() { return crypto.randomUUID(); }
function auth(token) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }
function code(result) { return result.body?.error?.code; }

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}
async function createUser(label, role = 'customer') {
  const row = { id: uuid(), email: `${run}-${label}@stylehub.invalid`, full_name: `Phase 10 QA ${label}`, password_hash: 'phase10-qa-not-loginable', role };
  const { data, error } = await supabaseAdmin.from('users').insert(row).select('id,email,role').single();
  if (error) throw error;
  ids.users.push(data.id);
  return { ...data, token: signAuthToken(data) };
}
async function createProduct(seller, label, overrides = {}) {
  const row = {
    id: uuid(), name: `Phase 10 QA ${label}`, slug: `${run}-${label}`.toLowerCase(),
    price: 220000, sale_price: null, category_slug: 't-shirts', image_url: '/images/products/coolmate-basic-tee.jpg',
    thumbnail: '/images/products/coolmate-basic-tee.jpg', description: 'Dedicated atomic checkout QA listing.',
    stock: 1, brand: 'Phase 10 QA', seller_name: seller.email, seller_id: seller.id, condition: 'good', size: 'M',
    location: 'Thành phố Hồ Chí Minh', is_negotiable: false, listing_source: 'user', status: 'active', inventory_mode: 'simple',
    ...overrides,
  };
  const { data, error } = await supabaseAdmin.from('products').insert(row).select('id,price,stock,status').single();
  if (error) throw error;
  ids.products.push(data.id);
  return data;
}
async function createVariant(product, label, overrides = {}) {
  const row = { id: uuid(), product_id: product.id, sku: `${run}-${label}`.toUpperCase(), title: label, price: 250000, sale_price: 200000, stock: 2, status: 'active', ...overrides };
  const { data, error } = await supabaseAdmin.from('product_variants').insert(row).select('*').single();
  if (error) throw error;
  ids.variants.push(data.id);
  return data;
}
function payload(product, overrides = {}) {
  const item = { productId: product.id, variantId: null, quantity: 1, expectedUnitPrice: Number(product.price) };
  return {
    customer: { name: 'Phase Ten Buyer', email: 'buyer@example.invalid', phone: '0901234567', address: '1 QA Street, Quan 1, TP HCM', city: 'TP HCM' },
    paymentMethod: 'cod', items: [{ ...item, ...(overrides.item || {}) }],
    ...overrides,
  };
}
async function checkout(user, body, key = uuid()) {
  return api('/api/orders', { method: 'POST', headers: { ...auth(user.token), 'Idempotency-Key': key }, body: JSON.stringify(body) });
}
async function state(productId) {
  const [{ data: product }, { data: items }, { data: movements }] = await Promise.all([
    supabaseAdmin.from('products').select('stock,status').eq('id', productId).single(),
    supabaseAdmin.from('order_items').select('id,order_id,seller_id,unit_price,quantity,fulfillment_status,inventory_restored_at').eq('product_id', productId),
    supabaseAdmin.from('inventory_movements').select('id,order_id,order_item_id,movement_kind,quantity_delta').eq('product_id', productId),
  ]);
  return { product, items: items || [], movements: movements || [] };
}

async function cleanup() {
  const { data: orders } = await supabaseAdmin.from('orders').select('id').in('user_id', ids.users.length ? ids.users : [uuid()]);
  const orderIds = (orders || []).map((row) => row.id);
  if (orderIds.length) {
    await supabaseAdmin.from('inventory_movements').delete().in('order_id', orderIds);
    await supabaseAdmin.from('checkout_idempotency').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_coupons').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_items').delete().in('order_id', orderIds);
    await supabaseAdmin.from('orders').delete().in('id', orderIds);
  }
  if (ids.users.length) await supabaseAdmin.from('checkout_idempotency').delete().in('buyer_id', ids.users);
  if (ids.variants.length) await supabaseAdmin.from('product_variants').delete().in('id', ids.variants);
  if (ids.products.length) await supabaseAdmin.from('products').delete().in('id', ids.products);
  if (ids.coupons.length) await supabaseAdmin.from('coupons').delete().in('id', ids.coupons);
  if (ids.users.length) await supabaseAdmin.from('users').delete().in('id', ids.users);
}

(async () => {
  try {
    const health = await api('/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const anonymousRpc = await fetch(`${supabaseUrl}/rest/v1/rpc/stylehub_checkout_atomic`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_buyer_id: uuid(), p_idempotency_key: uuid(), p_request_fingerprint: 'a'.repeat(64),
        p_customer: {}, p_payment_method: 'cod', p_notes: null, p_coupon_code: null, p_items: [],
      }),
    });
    check('Anonymous clients cannot execute atomic checkout RPC', [401, 403].includes(anonymousRpc.status), String(anonymousRpc.status));
    const sellerA = await createUser('seller-a', 'seller');
    const sellerB = await createUser('seller-b', 'seller');
    const buyers = await Promise.all(Array.from({ length: 12 }, (_, index) => createUser(`buyer-${index + 1}`)));

    const authProduct = await createProduct(sellerA, 'auth', { stock: 20 });
    const noAuth = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuid() }, body: JSON.stringify(payload(authProduct)) });
    const badAuth = await api('/api/orders', { method: 'POST', headers: { ...auth('bad.token.value'), 'Idempotency-Key': uuid() }, body: JSON.stringify(payload(authProduct)) });
    check('Missing authentication', noAuth.status === 401);
    check('Invalid authentication', badAuth.status === 401);

    const selfProduct = await createProduct(buyers[0], 'self');
    const selfBuy = await checkout(buyers[0], payload(selfProduct));
    check('Self-purchase rejected', selfBuy.status === 409 && code(selfBuy) === 'SELF_PURCHASE_NOT_ALLOWED');

    for (const status of ['hidden', 'draft', 'sold', 'archived']) {
      const product = await createProduct(sellerA, `status-${status}`, { status, stock: status === 'sold' ? 0 : 1 });
      const result = await checkout(buyers[0], payload(product));
      check(`${status} listing rejected`, result.status === 409 && code(result) === 'PRODUCT_UNAVAILABLE');
    }

    const lowStock = await createProduct(sellerA, 'low-stock');
    const insufficient = await checkout(buyers[0], payload(lowStock, { item: { quantity: 2 } }));
    check('Insufficient stock rejected', insufficient.status === 409 && code(insufficient) === 'INSUFFICIENT_STOCK');

    const variantProduct = await createProduct(sellerA, 'variant', { inventory_mode: 'variant', stock: 99 });
    const variant = await createVariant(variantProduct, 'M');
    const invalidVariant = await checkout(buyers[0], payload(variantProduct));
    check('Variant required and validated', invalidVariant.status === 409 && code(invalidVariant) === 'INVALID_VARIANT');
    const variantSale = await checkout(buyers[0], payload(variantProduct, { item: { variantId: variant.id, expectedUnitPrice: 200000, quantity: 2 } }));
    const { data: variantAfter } = await supabaseAdmin.from('product_variants').select('stock,status').eq('id', variant.id).single();
    const { data: variantParent } = await supabaseAdmin.from('products').select('stock,status').eq('id', variantProduct.id).single();
    check('Variant stock decremented without parent double-decrement', variantSale.status === 200 && variantAfter.stock === 0 && variantParent.stock === 99);

    const spoofProduct = await createProduct(sellerA, 'spoof', { price: 410000, stock: 3 });
    const spoofBody = payload(spoofProduct, { item: { expectedUnitPrice: 1 }, buyerId: sellerA.id, sellerId: buyers[0].id, subtotal: 1, total: 1, total_amount: 1, shippingFee: 0, discount: 999999 });
    const spoof = await checkout(buyers[0], spoofBody);
    check('Spoofed buyer/seller/prices/totals rejected', spoof.status === 409 && code(spoof) === 'PRICE_CHANGED');
    const pricePreview = await api('/api/orders/preview', { method: 'POST', headers: auth(buyers[0].token), body: JSON.stringify({ items: spoofBody.items }) });
    check('Preview returns authoritative changed price', pricePreview.status === 200 && pricePreview.body.data.requires_review === true && Number(pricePreview.body.data.subtotal) === 410000);

    const raceProduct = await createProduct(sellerA, 'last-unit');
    const raceResults = await Promise.all(buyers.slice(0, 10).map((buyer) => checkout(buyer, payload(raceProduct), uuid())));
    const raceSuccess = raceResults.filter((result) => result.status === 200);
    const raceState = await state(raceProduct.id);
    check('Ten buyers / one unit: exactly one success', raceSuccess.length === 1, `success=${raceSuccess.length}`);
    check('Ten buyers / one unit: one order item and one sale movement', raceState.items.length === 1 && raceState.movements.filter((m) => m.movement_kind === 'sale').length === 1);
    check('Ten buyers / one unit: stock zero and sold', raceState.product.stock === 0 && raceState.product.status === 'sold');
    check('Ten buyers / one unit: all losers safe conflicts', raceResults.filter((result) => result.status === 409).length === 9);

    const idemProduct = await createProduct(sellerA, 'idempotent', { stock: 5 });
    const idemKey = uuid();
    const idemResults = await Promise.all(Array.from({ length: 10 }, () => checkout(buyers[10], payload(idemProduct), idemKey)));
    const idemIds = new Set(idemResults.map((result) => result.body?.data?.id));
    const idemState = await state(idemProduct.id);
    check('Ten same-key requests all succeed', idemResults.every((result) => result.status === 200));
    check('Ten same-key requests reference exactly one order', idemIds.size === 1 && !idemIds.has(undefined), `orders=${idemIds.size}`);
    check('Ten same-key requests deduct exactly once', idemState.product.stock === 4 && idemState.items.length === 1 && idemState.movements.length === 1);
    const idemConflict = await checkout(buyers[10], payload(idemProduct, { item: { quantity: 2 } }), idemKey);
    check('Same key / different payload conflicts', idemConflict.status === 409 && code(idemConflict) === 'CHECKOUT_IDEMPOTENCY_CONFLICT');

    const atomicGood = await createProduct(sellerA, 'atomic-good', { stock: 2 });
    const atomicBad = await createProduct(sellerB, 'atomic-bad', { stock: 0, status: 'sold' });
    const atomicFailure = await checkout(buyers[1], { ...payload(atomicGood), items: [payload(atomicGood).items[0], payload(atomicBad).items[0]] });
    const atomicState = await state(atomicGood.id);
    check('Multi-item failure creates no partial order/inventory movement', atomicFailure.status === 409 && atomicState.product.stock === 2 && atomicState.items.length === 0 && atomicState.movements.length === 0);

    const multiA = await createProduct(sellerA, 'multi-a', { stock: 2, price: 300000 });
    const multiB = await createProduct(sellerB, 'multi-b', { stock: 2, price: 250000 });
    const multi = await checkout(buyers[2], { ...payload(multiA), items: [payload(multiA).items[0], payload(multiB).items[0]] });
    const multiOrderId = multi.body?.data?.id;
    const { data: multiItems } = await supabaseAdmin.from('order_items').select('id,seller_id,unit_price,product_name').eq('order_id', multiOrderId);
    const sellerAView = await api(`/api/seller/orders/${multiOrderId}`, { headers: auth(sellerA.token) });
    const sellerBView = await api(`/api/seller/orders/${multiOrderId}`, { headers: auth(sellerB.token) });
    check('Multi-seller checkout is one atomic order with seller snapshots', multi.status === 200 && multiItems.length === 2 && new Set(multiItems.map((item) => item.seller_id)).size === 2);
    check('Each seller sees only their own line', sellerAView.body?.data?.items?.length === 1 && sellerBView.body?.data?.items?.length === 1);
    check('Seller response excludes shared order totals', !('total_amount' in (sellerAView.body?.data?.order || {})));

    const couponProduct = await createProduct(sellerA, 'coupon', { stock: 3, price: 600000 });
    const coupon = { id: uuid(), code: `${run}-ONCE`.toUpperCase(), discount_type: 'fixed', discount_value: 50000, minimum_order_amount: 0, usage_limit: 1, used_count: 0, is_active: true };
    const { error: couponError } = await supabaseAdmin.from('coupons').insert(coupon);
    if (couponError) throw couponError;
    ids.coupons.push(coupon.id);
    const couponRace = await Promise.all([buyers[3], buyers[4]].map((buyer) => checkout(buyer, { ...payload(couponProduct), couponCode: coupon.code }, uuid())));
    const { data: couponAfter } = await supabaseAdmin.from('coupons').select('used_count').eq('id', coupon.id).single();
    check('Coupon usage limit is concurrency-safe', couponRace.filter((result) => result.status === 200).length === 1 && couponAfter.used_count === 1);

    const cancelProduct = await createProduct(sellerA, 'cancel', { stock: 1 });
    const cancelSale = await checkout(buyers[5], payload(cancelProduct));
    const cancelOrderId = cancelSale.body.data.id;
    const cancelResults = await Promise.all(Array.from({ length: 10 }, () => api(`/api/orders/${cancelOrderId}/cancel`, { method: 'POST', headers: auth(buyers[5].token) })));
    const cancelState = await state(cancelProduct.id);
    check('Concurrent buyer cancellation calls are idempotent', cancelResults.every((result) => result.status === 200));
    check('Concurrent cancellation restores exactly once', cancelState.product.stock === 1 && cancelState.movements.filter((m) => m.movement_kind === 'restock').length === 1);
    check('Auto-sold listing reactivates after restock', cancelState.product.status === 'active');
    check('Repeated cancellation does not add stock', cancelState.items[0].inventory_restored_at && cancelState.product.stock === 1);

    const sellerCancelProduct = await createProduct(sellerA, 'seller-cancel');
    const sellerCancelOrder = await checkout(buyers[6], payload(sellerCancelProduct));
    const sellerCancelItem = sellerCancelOrder.body.data.items[0].id;
    const crossSeller = await api(`/api/seller/orders/items/${sellerCancelItem}/fulfillment`, { method: 'PATCH', headers: auth(sellerB.token), body: JSON.stringify({ status: 'cancelled' }) });
    const ownSeller = await api(`/api/seller/orders/items/${sellerCancelItem}/fulfillment`, { method: 'PATCH', headers: auth(sellerA.token), body: JSON.stringify({ status: 'cancelled' }) });
    const sellerCancelState = await state(sellerCancelProduct.id);
    check('Cross-seller cancellation is hidden as not found', crossSeller.status === 404 && code(crossSeller) === 'ORDER_NOT_FOUND');
    check('Seller cancellation restores only owned item', ownSeller.status === 200 && sellerCancelState.product.stock === 1);

    const shippedProduct = await createProduct(sellerA, 'shipped');
    const shippedOrder = await checkout(buyers[7], payload(shippedProduct));
    const shippedItem = shippedOrder.body.data.items[0].id;
    for (const status of ['confirmed', 'preparing', 'shipped']) await api(`/api/seller/orders/items/${shippedItem}/fulfillment`, { method: 'PATCH', headers: auth(sellerA.token), body: JSON.stringify({ status }) });
    const lateBuyerCancel = await api(`/api/orders/${shippedOrder.body.data.id}/cancel`, { method: 'POST', headers: auth(buyers[7].token) });
    const lateSellerCancel = await api(`/api/seller/orders/items/${shippedItem}/fulfillment`, { method: 'PATCH', headers: auth(sellerA.token), body: JSON.stringify({ status: 'cancelled' }) });
    check('Buyer cannot cancel after shipping', lateBuyerCancel.status === 409 && code(lateBuyerCancel) === 'ORDER_NOT_CANCELLABLE');
    check('Seller cannot cancel after shipping', lateSellerCancel.status === 409);

    const ownerRead = await api(`/api/orders/${multiOrderId}`, { headers: auth(buyers[2].token) });
    const foreignRead = await api(`/api/orders/${multiOrderId}`, { headers: auth(buyers[1].token) });
    check('Checkout success/order refresh is read-only and owner-scoped', ownerRead.status === 200 && foreignRead.status === 404);
    const beforeRefresh = await state(multiA.id);
    await Promise.all(Array.from({ length: 5 }, () => api(`/api/orders/${multiOrderId}`, { headers: auth(buyers[2].token) })));
    const afterRefresh = await state(multiA.id);
    check('Repeated order reads never mutate inventory', beforeRefresh.product.stock === afterRefresh.product.stock && beforeRefresh.movements.length === afterRefresh.movements.length);

    const { data: negative } = await supabaseAdmin.from('products').select('id').in('id', ids.products).lt('stock', 0);
    check('No QA product has negative stock', negative.length === 0);
    const { data: duplicateMoves } = await supabaseAdmin.from('inventory_movements').select('order_item_id,movement_kind').in('product_id', ids.products);
    check('Inventory movement event keys are unique', new Set(duplicateMoves.map((m) => `${m.order_item_id}:${m.movement_kind}`)).size === duplicateMoves.length);

    console.log(`\nPHASE10 SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((value) => !value)) process.exitCode = 1;
  } catch (error) {
    console.error('PHASE10 TEST ERROR:', error.message || error);
    process.exitCode = 1;
  } finally {
    await cleanup();
    console.log('Phase 10 QA cleanup complete (recorded IDs only).');
  }
})();
