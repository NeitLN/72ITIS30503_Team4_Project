/**
 * Phase 2 live payment/escrow integration suite.
 *
 * The suite exits with code 2 before mutation unless it is explicitly pointed
 * at a loopback-only disposable Supabase stack. The whole isolated stack is
 * destroyed after the gate, so no test-only cleanup RPC is deployed.
 */
require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const { supabaseAdmin } = require('./lib/supabase');
const { signAuthToken } = require('./services/authService');

const API_BASE = process.env.PHASE2_API_BASE || 'http://localhost:8080';
const run = `phase2-qa-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const ids = { users: [], products: [], coupons: [], orderIds: [] };
const checks = [];
let fixturesStarted = false;

function uuid() { return crypto.randomUUID(); }
function auth(token) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }
function code(result) { return result.body?.error?.code; }
function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function createUser(label, role = 'customer') {
  const row = {
    id: uuid(), email: `${run}-${label}@stylehub.invalid`, full_name: `Phase 2 QA ${label}`,
    password_hash: 'phase2-qa-not-loginable', role,
  };
  const { data, error } = await supabaseAdmin.from('users').insert(row).select('id,email,role').single();
  if (error) throw error;
  ids.users.push(data.id);
  return { ...data, token: signAuthToken(data) };
}

async function createProduct(seller, label, price, stock = 5) {
  const row = {
    id: uuid(), name: `Phase 2 QA ${label}`, slug: `${run}-${label}`.toLowerCase(), price,
    sale_price: null, category_slug: 't-shirts', image_url: '/images/products/coolmate-basic-tee.jpg',
    thumbnail: '/images/products/coolmate-basic-tee.jpg', description: 'Dedicated Phase 2 payment QA listing.',
    stock, brand: 'Phase 2 QA', seller_name: seller.email, seller_id: seller.id, condition: 'good', size: 'M',
    location: 'Thành phố Hồ Chí Minh', is_negotiable: false, listing_source: 'user', status: 'active', inventory_mode: 'simple',
  };
  const { data, error } = await supabaseAdmin.from('products').insert(row).select('id,price,stock,status').single();
  if (error) throw error;
  ids.products.push(data.id);
  return data;
}

async function createCoupon(label, values = {}) {
  const row = {
    id: uuid(), code: `${run}-${label}`.toUpperCase(), description: 'Synthetic Phase 2 coupon.',
    discount_type: 'fixed', discount_value: 1, minimum_order_amount: 0,
    starts_at: new Date(Date.now() - 60_000).toISOString(),
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    usage_limit: 10, used_count: 0, is_active: true, ...values,
  };
  const { data, error } = await supabaseAdmin.from('coupons').insert(row).select('id,code,used_count').single();
  if (error) throw error;
  ids.coupons.push(data.id);
  return data;
}

function payload(products, overrides = {}) {
  return {
    customer: {
      name: 'Phase Two Buyer', email: `${run}-checkout@stylehub.invalid`, phone: '0901234567',
      address: '1 QA Street, Quan 1, TP HCM', city: 'TP HCM',
    },
    paymentMethod: 'simulated_card',
    payment: { cardBrand: 'visa', lastFour: '4242' },
    items: products.map((product) => ({
      productId: product.id, variantId: null, quantity: 1, expectedUnitPrice: Number(product.price),
    })),
    ...overrides,
  };
}

async function checkout(user, body, key = uuid()) {
  const result = await api('/api/orders', {
    method: 'POST', headers: { ...auth(user.token), 'Idempotency-Key': key }, body: JSON.stringify(body),
  });
  const orderId = result.body?.data?.id;
  if (orderId && !ids.orderIds.includes(orderId)) ids.orderIds.push(orderId);
  return result;
}

async function paymentState(orderId) {
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select('id,order_id,state,gross_amount,platform_fee_total,seller_amount_total,card_brand,card_last_four,metadata,version')
    .eq('order_id', orderId).single();
  if (error) throw error;
  const [{ data: allocations }, { data: events }] = await Promise.all([
    supabaseAdmin.from('payment_allocations').select('id,seller_id,state,gross_amount,platform_fee,seller_net_amount').eq('payment_id', payment.id).order('seller_id'),
    supabaseAdmin.from('payment_events').select('id,previous_state,new_state,event_type,idempotency_key,safe_metadata').eq('payment_id', payment.id).order('created_at'),
  ]);
  return { payment, allocations: allocations || [], events: events || [] };
}

async function cleanup() {
  if (fixturesStarted) console.log('Phase 2 fixtures remain only inside the disposable database pending stack teardown.');
}

(async () => {
  let localUrl = null;
  try {
    localUrl = new URL(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  } catch {}
  if (process.env.PHASE2_ISOLATED_DB !== 'true'
      || !localUrl
      || !['127.0.0.1', 'localhost'].includes(localUrl.hostname)) {
    console.log('BLOCKED: PHASE2_ISOLATED_DB=true and a loopback Supabase URL are required; no fixtures were created.');
    process.exitCode = 2;
    return;
  }

  const preflight = await supabaseAdmin.from('payments').select('state,gross_amount,platform_fee_total,seller_amount_total').limit(1);
  if (preflight.error) {
    console.log('BLOCKED: Phase 2 migration is not applied to the configured database; no fixtures were created.');
    process.exitCode = 2;
    return;
  }

  try {
    const health = await api('/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);
    fixturesStarted = true;
    const sellerA = await createUser('seller-a', 'seller');
    const sellerB = await createUser('seller-b', 'seller');
    const buyer = await createUser('buyer');

    const validationProduct = await createProduct(sellerA, 'validation', 150000, 20);
    const sensitiveCases = [
      ['full card number', { cardBrand: 'visa', lastFour: '4242', cardNumber: '4111111111111111' }],
      ['CVV', { cardBrand: 'visa', lastFour: '4242', cvv: '123' }],
      ['CVC', { cardBrand: 'visa', lastFour: '4242', cvc: '123' }],
      ['PIN', { cardBrand: 'visa', lastFour: '4242', pin: '1234' }],
      ['expiry', { cardBrand: 'visa', lastFour: '4242', expiryDate: '12/30' }],
      ['track data', { cardBrand: 'visa', lastFour: '4242', trackData: 'synthetic-track' }],
      ['unknown field', { cardBrand: 'visa', lastFour: '4242', nickname: 'demo' }],
      ['long digit sequence', { cardBrand: 'visa', lastFour: '4242', note: '12345678' }],
    ];
    for (const [label, payment] of sensitiveCases) {
      const result = await checkout(buyer, payload([validationProduct], { payment }));
      check(`${label} is rejected safely`, result.status === 422 && code(result) === 'INVALID_PAYMENT_DETAILS');
      check(`${label} value is not echoed`, !JSON.stringify(result.body).includes(Object.values(payment).at(-1)));
    }
    const unknownMethod = await checkout(buyer, payload([validationProduct], { paymentMethod: 'crypto', payment: {} }));
    const unknownBrand = await checkout(buyer, payload([validationProduct], { payment: { cardBrand: 'other', lastFour: '4242' } }));
    const invalidLastFour = await checkout(buyer, payload([validationProduct], { payment: { cardBrand: 'visa', lastFour: '12x4' } }));
    check('Unknown payment method is rejected', unknownMethod.status === 422 && code(unknownMethod) === 'INVALID_PAYMENT_DETAILS');
    check('Unknown card brand is rejected', unknownBrand.status === 422 && code(unknownBrand) === 'INVALID_PAYMENT_DETAILS');
    check('Invalid last four is rejected', invalidLastFour.status === 422 && code(invalidLastFour) === 'INVALID_PAYMENT_DETAILS');

    const singleProduct = await createProduct(sellerA, 'single', 100001);
    const single = await checkout(buyer, payload([singleProduct], { subtotal: 1, total_amount: 1, platformFee: 0 }));
    const singleId = single.body?.data?.id;
    const singleState = await paymentState(singleId);
    check('Single-seller checkout creates one HELD payment', single.status === 200 && singleState.payment.state === 'held');
    check('Client monetary fields are ignored', Number(singleState.payment.gross_amount) === Number(single.body.data.total_amount));
    check('Single-seller fee is integer floor at 10%', Number(singleState.payment.platform_fee_total) === Math.floor(Number(singleState.payment.gross_amount) * 0.10));
    check('Single-seller allocation reconciles', singleState.allocations.length === 1
      && Number(singleState.allocations[0].gross_amount) === Number(singleState.payment.gross_amount)
      && Number(singleState.allocations[0].platform_fee) === Number(singleState.payment.platform_fee_total));
    check('Initial payment event exists exactly once', singleState.events.length === 1 && singleState.events[0].event_type === 'payment_held');
    check('Only safe card metadata is persisted', singleState.payment.card_brand === 'visa'
      && singleState.payment.card_last_four === '4242' && JSON.stringify(singleState.payment.metadata) === '{}');

    const shippingOnlyProduct = await createProduct(sellerA, 'shipping-only', 0);
    const shippingOnly = await checkout(buyer, payload([shippingOnlyProduct]));
    check('Shipping-only gross can be allocated without merchandise value', shippingOnly.status === 200);
    if (shippingOnly.status === 200) {
      const shippingOnlyState = await paymentState(shippingOnly.body.data.id);
      check('Platform fee applies consistently to complete order total', Number(shippingOnlyState.payment.gross_amount) === Number(shippingOnly.body.data.total_amount)
        && Number(shippingOnlyState.payment.platform_fee_total) === Math.floor(Number(shippingOnly.body.data.total_amount) * 0.10)
        && Number(shippingOnlyState.allocations[0].gross_amount) === Number(shippingOnly.body.data.total_amount));
    }

    const coupon = await createCoupon('fixed-one-vnd');
    const couponProduct = await createProduct(sellerA, 'coupon', 100003);
    const couponCheckout = await checkout(buyer, payload([couponProduct], { couponCode: coupon.code }));
    const couponState = couponCheckout.status === 200 ? await paymentState(couponCheckout.body.data.id) : null;
    const { data: usedCoupon } = await supabaseAdmin.from('coupons').select('used_count').eq('id', coupon.id).single();
    check('Coupon, shipping, and authoritative total reconcile', couponCheckout.status === 200
      && Number(couponCheckout.body.data.discount_amount) === 1
      && Number(couponState.payment.gross_amount) === Number(couponCheckout.body.data.subtotal)
        + Number(couponCheckout.body.data.shipping_fee) - Number(couponCheckout.body.data.discount_amount)
      && usedCoupon.used_count === 1);

    const multiA = await createProduct(sellerA, 'multi-a', 100001, 5);
    const multiB = await createProduct(sellerB, 'multi-b', 100002, 5);
    const idemKey = uuid();
    const multiResults = await Promise.all(Array.from({ length: 8 }, () => checkout(buyer, payload([multiA, multiB]), idemKey)));
    const multiIds = new Set(multiResults.map((result) => result.body?.data?.id));
    const multiId = [...multiIds][0];
    const multiState = await paymentState(multiId);
    const sequentialReplay = await checkout(buyer, payload([multiA, multiB]), idemKey);
    const grossSum = multiState.allocations.reduce((sum, row) => sum + Number(row.gross_amount), 0);
    const feeSum = multiState.allocations.reduce((sum, row) => sum + Number(row.platform_fee), 0);
    const netSum = multiState.allocations.reduce((sum, row) => sum + Number(row.seller_net_amount), 0);
    check('Concurrent same-key checkout returns one order', multiResults.every((result) => result.status === 200) && multiIds.size === 1);
    check('Sequential same-key checkout reuses the completed result', sequentialReplay.status === 200
      && sequentialReplay.body?.data?.id === multiId && sequentialReplay.body?.data?.idempotent_replay === true);
    check('Idempotency creates one payment, two allocations, one event', multiState.allocations.length === 2 && multiState.events.length === 1);
    check('Multi-seller gross, fee, and net reconcile exactly', grossSum === Number(multiState.payment.gross_amount)
      && feeSum === Number(multiState.payment.platform_fee_total)
      && netSum === Number(multiState.payment.seller_amount_total));
    check('Fee rounding uses deterministic integer remainder allocation', multiState.allocations.every((row) => Number.isInteger(Number(row.gross_amount))
      && Number.isInteger(Number(row.platform_fee)) && Number(row.gross_amount) === Number(row.platform_fee) + Number(row.seller_net_amount)));
    const [{ data: multiAAfter }, { data: multiBAfter }, { count: multiPaymentCount }] = await Promise.all([
      supabaseAdmin.from('products').select('stock').eq('id', multiA.id).single(),
      supabaseAdmin.from('products').select('stock').eq('id', multiB.id).single(),
      supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }).eq('order_id', multiId),
    ]);
    check('Concurrent replay deducts each product exactly once', multiAAfter.stock === 4 && multiBAfter.stock === 4);
    check('One-payment-per-order holds in the stored result', multiPaymentCount === 1);

    const duplicatePayment = await supabaseAdmin.from('payments').insert({
      order_id: multiId, provider: 'duplicate-test', amount: 0, currency: 'VND', status: 'pending', metadata: {},
    });
    check('Exactly one payment per order is database-enforced', Boolean(duplicatePayment.error));

    const invalidTransition = await supabaseAdmin.from('payments')
      .update({ state: 'pending', version: multiState.payment.version + 1 }).eq('id', multiState.payment.id);
    check('Invalid payment transition is rejected', Boolean(invalidTransition.error));
    const staleTransition = await supabaseAdmin.from('payments')
      .update({ state: 'refunded', refunded_at: new Date().toISOString(), version: multiState.payment.version }).eq('id', multiState.payment.id);
    check('Stale optimistic version is rejected', Boolean(staleTransition.error));
    const duplicateEvent = await supabaseAdmin.from('payment_events').insert({
      payment_id: multiState.payment.id, previous_state: 'pending', new_state: 'held',
      event_type: 'payment_held', actor_type: 'system', safe_metadata: {},
      idempotency_key: multiState.events[0].idempotency_key,
    });
    check('Payment-event idempotency is database-enforced', Boolean(duplicateEvent.error));
    const immutableEvent = await supabaseAdmin.from('payment_events')
      .update({ reason: 'attempted rewrite' }).eq('id', multiState.events[0].id);
    check('Payment events are append-only', Boolean(immutableEvent.error));

    const cancelResults = await Promise.all(Array.from({ length: 6 }, () => api(`/api/orders/${multiId}/cancel`, {
      method: 'POST', headers: auth(buyer.token),
    })));
    const cancelledState = await paymentState(multiId);
    const { data: movements } = await supabaseAdmin.from('inventory_movements').select('movement_kind').eq('order_id', multiId);
    check('Eligible cancellation refunds HELD payment', cancelResults.every((result) => result.status === 200) && cancelledState.payment.state === 'refunded');
    check('Cancellation refunds every allocation', cancelledState.allocations.every((row) => row.state === 'refunded'));
    check('Cancellation appends exactly one refund event', cancelledState.events.filter((event) => event.event_type === 'payment_refunded').length === 1);
    check('Duplicate cancellation restocks each item once', movements.filter((row) => row.movement_kind === 'restock').length === 2);
    const [{ data: multiARestored }, { data: multiBRestored }] = await Promise.all([
      supabaseAdmin.from('products').select('stock').eq('id', multiA.id).single(),
      supabaseAdmin.from('products').select('stock').eq('id', multiB.id).single(),
    ]);
    check('Cancellation increments payment version exactly once', cancelledState.payment.version === multiState.payment.version + 1);
    check('Cancellation restores exact stock quantities', multiARestored.stock === 5 && multiBRestored.stock === 5);
    check('Repeated cancellation follows the idempotent response convention', cancelResults.filter((result) => result.body?.data?.idempotent_replay === false).length === 1
      && cancelResults.filter((result) => result.body?.data?.idempotent_replay === true).length === cancelResults.length - 1
      && cancelResults.every((result) => result.body?.data?.payment_state === 'refunded'));

    const releasedProduct = await createProduct(sellerA, 'released-cancel-rejected', 170000, 2);
    const releasedCheckout = await checkout(buyer, payload([releasedProduct]));
    const releasedState = await paymentState(releasedCheckout.body.data.id);
    const releasedPayment = await supabaseAdmin.from('payments').update({
      state: 'released', status: 'paid', version: releasedState.payment.version + 1,
    }).eq('id', releasedState.payment.id);
    const releasedAllocations = await supabaseAdmin.from('payment_allocations')
      .update({ state: 'released' }).eq('payment_id', releasedState.payment.id);
    if (releasedPayment.error) throw releasedPayment.error;
    if (releasedAllocations.error) throw releasedAllocations.error;
    const rejectedCancellation = await api(`/api/orders/${releasedCheckout.body.data.id}/cancel`, {
      method: 'POST', headers: auth(buyer.token),
    });
    const [{ data: releasedProductAfter }, { count: releasedRestocks }] = await Promise.all([
      supabaseAdmin.from('products').select('stock').eq('id', releasedProduct.id).single(),
      supabaseAdmin.from('inventory_movements').select('id', { count: 'exact', head: true })
        .eq('order_id', releasedCheckout.body.data.id).eq('movement_kind', 'restock'),
    ]);
    check('Cancellation is rejected for an incompatible payment state', rejectedCancellation.status === 409
      && code(rejectedCancellation) === 'PAYMENT_STATE_CONFLICT' && releasedProductAfter.stock === 1 && releasedRestocks === 0);

    const declineProduct = await createProduct(sellerA, 'decline-rollback', 190000, 2);
    const beforeDecline = await supabaseAdmin.from('products').select('stock').eq('id', declineProduct.id).single();
    const declineCoupon = await createCoupon('decline-rollback');
    const declineKey = uuid();
    const declineFingerprint = crypto.createHash('sha256').update(`${run}:${declineKey}`).digest('hex');
    const declineCustomer = {
      name: 'Phase Two Buyer', email: `${run}-decline@stylehub.invalid`, phone: '0901234567',
      address: '1 QA Street, Quan 1, TP HCM', city: 'TP HCM',
    };
    const decline = await supabaseAdmin.rpc('stylehub_checkout_atomic_v2', {
      p_buyer_id: buyer.id, p_idempotency_key: declineKey, p_request_fingerprint: declineFingerprint,
      p_customer: declineCustomer, p_payment_method: 'simulated_card',
      p_payment_details: { cardBrand: 'visa', lastFour: '4242', simulationOutcome: 'declined' },
      p_notes: null, p_coupon_code: declineCoupon.code,
      p_items: [{ productId: declineProduct.id, variantId: null, quantity: 1, expectedUnitPrice: 190000 }],
    });
    const afterDecline = await supabaseAdmin.from('products').select('stock').eq('id', declineProduct.id).single();
    const declinedOrders = await supabaseAdmin.from('orders').select('id').eq('customer_email', declineCustomer.email);
    const [{ count: declineIdempotency }, { data: declineCouponAfter }, { count: declineMovements }] = await Promise.all([
      supabaseAdmin.from('checkout_idempotency').select('id', { count: 'exact', head: true }).eq('buyer_id', buyer.id).eq('idempotency_key', declineKey),
      supabaseAdmin.from('coupons').select('used_count').eq('id', declineCoupon.id).single(),
      supabaseAdmin.from('inventory_movements').select('id', { count: 'exact', head: true }).eq('product_id', declineProduct.id),
    ]);
    check('Simulated decline fails inside the atomic transaction', Boolean(decline.error));
    check('Payment failure rolls back order, inventory, ledger, coupon, and idempotency', beforeDecline.data.stock === afterDecline.data.stock
      && declinedOrders.data.length === 0 && declineMovements === 0 && declineCouponAfter.used_count === 0 && declineIdempotency === 0);

    console.log(`\nPHASE 2 PAYMENT/ESCROW SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((value) => !value)) process.exitCode = 1;
  } catch (error) {
    console.error('PHASE 2 PAYMENT TEST ERROR:', error);
    process.exitCode = 1;
  } finally {
    await cleanup();
    console.log('Phase 2 QA cleanup is enforced by disposable-stack teardown.');
  }
})();
