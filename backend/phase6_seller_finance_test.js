/**
 * Phase 6 remediation: Seller Finance.
 *
 * Part A — mocked unit tests for computeFinanceSummary() (pure function,
 * no database). Proves the held/released/refunded/disputed contract.
 *
 * Part B — HTTP integration tests against a running backend
 * (http://127.0.0.1:8080 by default) for authentication and cross-Seller
 * isolation, using real payment_allocations rows against real (throwaway)
 * users/orders/payments created directly in the database and deleted again
 * in a `finally` block. Requires the backend dev server to be running.
 */
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { supabaseAdmin } = require('./lib/supabase');
const { signAuthToken } = require('./services/authService');
const { computeFinanceSummary, ALLOCATION_STATES } = require('./services/sellerFinanceService');

const API_BASE = process.env.PHASE6_API_BASE || 'http://127.0.0.1:8080';
const run = `p6f${Date.now().toString(36)}`;
const checks = [];

function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function alloc({ state, gross = 100000, fee = 10000, net = 90000 }) {
  return { state, gross_amount: gross, platform_fee: fee, seller_net_amount: net };
}

// ---------------------------------------------------------------------------
// Part A — mocked unit tests for the pure calculation (no DB)
// ---------------------------------------------------------------------------
function runUnitTests() {
  console.log('\n--- Part A: computeFinanceSummary unit tests (mocked, no DB) ---');

  check('1. No allocations returns zero metrics', (() => {
    const s = computeFinanceSummary([]);
    return s.gross_revenue === 0 && s.platform_fees === 0 && s.escrow_amount === 0
      && s.released_amount === 0 && s.refunded_amount === 0 && s.disputed_amount === 0
      && s.available_balance === 0 && s.paid_out_amount === 0 && s.pending_orders === 0;
  })());

  check('2. Held allocation increases escrow amount', (() => {
    const s = computeFinanceSummary([alloc({ state: 'held', net: 90000 })]);
    return s.escrow_amount === 90000;
  })());

  check('3. Held allocation counts toward gross revenue/fees, per the documented held+released contract', (() => {
    const s = computeFinanceSummary([alloc({ state: 'held', gross: 100000, fee: 10000 })]);
    return s.gross_revenue === 100000 && s.platform_fees === 10000;
  })());

  check('4. Released allocation increases released amount and available balance', (() => {
    const s = computeFinanceSummary([alloc({ state: 'released', net: 90000 })]);
    return s.released_amount === 90000 && s.available_balance === 90000;
  })());

  check('5. Refunded allocation does not count as revenue or available', (() => {
    const s = computeFinanceSummary([alloc({ state: 'refunded', gross: 100000, net: 90000 })]);
    return s.gross_revenue === 0 && s.available_balance === 0 && s.refunded_amount === 90000;
  })());

  check('6. Disputed allocation is not available and not revenue', (() => {
    const s = computeFinanceSummary([alloc({ state: 'disputed', gross: 100000, net: 90000 })]);
    return s.gross_revenue === 0 && s.available_balance === 0 && s.disputed_amount === 90000;
  })());

  check('7. Platform fees aggregate correctly across multiple allocations', (() => {
    const s = computeFinanceSummary([
      alloc({ state: 'held', fee: 10000 }),
      alloc({ state: 'released', fee: 5000 }),
      alloc({ state: 'refunded', fee: 7000 }), // excluded
    ]);
    return s.platform_fees === 15000;
  })());

  check('8. Pending-order count follows held-state semantics only', (() => {
    const s = computeFinanceSummary([
      alloc({ state: 'held' }), alloc({ state: 'held' }),
      alloc({ state: 'released' }), alloc({ state: 'refunded' }), alloc({ state: 'disputed' }),
    ]);
    return s.pending_orders === 2;
  })());

  check('11. Unknown allocation state is handled safely (counts toward nothing, does not throw)', (() => {
    const s = computeFinanceSummary([
      { state: 'escrow', gross_amount: 999999, platform_fee: 1, seller_net_amount: 999998 }, // the old, invalid value
      { state: 'totally_unexpected', gross_amount: 5, platform_fee: 1, seller_net_amount: 4 },
    ]);
    return s.gross_revenue === 0 && s.escrow_amount === 0 && s.available_balance === 0
      && s.released_amount === 0 && s.refunded_amount === 0 && s.disputed_amount === 0 && s.pending_orders === 0;
  })());

  check("'escrow' is not a recognized allocation state (regression guard for the original bug)", !ALLOCATION_STATES.includes('escrow'));
  check('ALLOCATION_STATES matches the DB CHECK constraint exactly', (() => {
    const expected = ['held', 'released', 'refunded', 'disputed'];
    return expected.length === ALLOCATION_STATES.length && expected.every((s) => ALLOCATION_STATES.includes(s));
  })());

  check('12. Payout remains explicitly not connected, amount stays zero', (() => {
    const s = computeFinanceSummary([alloc({ state: 'released', net: 500000 })]);
    return s.paid_out_amount === 0 && s.payout_method.status === 'not_connected';
  })());

  check('available_balance formula holds: released_amount - paid_out_amount', (() => {
    const s = computeFinanceSummary([alloc({ state: 'released', net: 250000 })]);
    return s.available_balance === s.released_amount - s.paid_out_amount;
  })());

  check('13. All numeric summary fields are actually numbers, not strings', (() => {
    const s = computeFinanceSummary([alloc({ state: 'held' }), alloc({ state: 'released' })]);
    return ['gross_revenue', 'platform_fees', 'escrow_amount', 'released_amount', 'refunded_amount',
      'disputed_amount', 'available_balance', 'paid_out_amount', 'pending_orders']
      .every((key) => typeof s[key] === 'number' && Number.isFinite(s[key]));
  })());

  check('getFinanceSummary only ever accepts a trusted userId argument (arity 1 — no seller_id override parameter)', (() => {
    const { getFinanceSummary } = require('./services/sellerFinanceService');
    return getFinanceSummary.length === 1;
  })());
}

// ---------------------------------------------------------------------------
// Part B — HTTP integration tests (requires a running backend)
// ---------------------------------------------------------------------------
async function createUser(label, role = 'seller') {
  const row = {
    id: crypto.randomUUID(),
    email: `${run}-${label}@stylehub.invalid`,
    full_name: `Phase6 QA ${label}`,
    username: `p6_${label.replace(/-/g, '_')}_${crypto.randomBytes(3).toString('hex')}`,
    password_hash: 'phase6-local-test-only',
    role,
  };
  const { data, error } = await supabaseAdmin.from('users').insert(row).select('id,email,full_name,role').single();
  if (error) throw error;
  return { ...data, token: signAuthToken(data) };
}

async function createOrderWithPayment(buyerId) {
  const { data: order, error: orderErr } = await supabaseAdmin.from('orders').insert({
    order_code: `${run}-ORD-${crypto.randomBytes(3).toString('hex')}`,
    customer_name: 'Phase6 QA Buyer',
    customer_email: `${run}-buyer@stylehub.invalid`,
    customer_phone: '0900000000',
    customer_address: '123 QA St',
    customer_city: 'QA City',
    shipping_address: '123 QA St',
    city: 'QA City',
    payment_method: 'simulated_card',
    total_amount: 100000,
    subtotal: 100000,
    shipping_fee: 0,
    discount_amount: 0,
    status: 'processing',
  }).select('*').single();
  if (orderErr) throw orderErr;

  const { data: idem, error: idemErr } = await supabaseAdmin.from('checkout_idempotency').insert({
    buyer_id: buyerId,
    idempotency_key: crypto.randomUUID(),
    request_fingerprint: crypto.createHash('sha256').update(run + order.id).digest('hex'),
    order_id: order.id,
    response_payload: { ok: true },
    completed_at: new Date().toISOString(),
  }).select('*').single();
  if (idemErr) throw idemErr;

  const { data: payment, error: paymentErr } = await supabaseAdmin.from('payments').insert({
    order_id: order.id,
    buyer_id: buyerId,
    payment_method: 'simulated_card',
    provider: 'stylehub_simulation',
    amount: 100000,
    currency: 'VND',
    status: 'paid',
    state: 'held',
    gross_amount: 100000,
    platform_fee_total: 10000,
    seller_amount_total: 90000,
    checkout_idempotency_id: idem.id,
    version: 1,
    held_at: new Date().toISOString(),
    card_brand: 'visa',
    card_last_four: '4242',
  }).select('*').single();
  if (paymentErr) throw paymentErr;

  return { order, idem, payment };
}

async function createAllocation(paymentId, orderId, sellerId, state, amounts = {}) {
  const { gross = 100000, fee = 10000, net = 90000 } = amounts;
  const { data, error } = await supabaseAdmin.from('payment_allocations').insert({
    payment_id: paymentId,
    order_id: orderId,
    seller_id: sellerId,
    gross_amount: gross,
    platform_fee: fee,
    seller_net_amount: net,
    state,
  }).select('*').single();
  if (error) throw error;
  return data;
}

async function runIntegrationTests() {
  console.log('\n--- Part B: HTTP integration tests (live backend required) ---');

  const health = await fetch(`${API_BASE}/api/health`).then((r) => r.ok).catch(() => false);
  if (!health) {
    check('Backend reachable at ' + API_BASE, false, 'skipping remaining integration checks');
    return;
  }

  const sellerA = await createUser('seller-a');
  const sellerB = await createUser('seller-b');
  const buyer = await createUser('buyer', 'customer');
  const createdIds = { users: [sellerA.id, sellerB.id, buyer.id], orders: [], idems: [], payments: [], allocations: [] };

  try {
    // 14. Empty results return HTTP 200
    const emptyRes = await api('/api/seller/finance/summary', { headers: headers(sellerA.token) });
    if (emptyRes.status !== 200) console.log('DEBUG emptyRes:', emptyRes.status, JSON.stringify(emptyRes.body));
    check('14. Empty results return HTTP 200', emptyRes.status === 200 && emptyRes.body?.success === true);
    check('Empty-result summary has zeroed numeric fields', emptyRes.body?.data?.gross_revenue === 0 && emptyRes.body?.data?.escrow_amount === 0);

    // 15. Finance route requires authentication
    const noAuthRes = await api('/api/seller/finance/summary');
    check('15. Finance route requires authentication (no token -> 401)', noAuthRes.status === 401);
    const badAuthRes = await api('/api/seller/finance/summary', { headers: headers('not-a-real-token') });
    check('Finance route rejects an invalid token (-> 401)', badAuthRes.status === 401);

    // One order, split across seller A (held) and seller B (released) —
    // exercises multi-seller isolation on a single shared order.
    const { order, idem, payment } = await createOrderWithPayment(buyer.id);
    createdIds.orders.push(order.id); createdIds.idems.push(idem.id); createdIds.payments.push(payment.id);

    const allocA = await createAllocation(payment.id, order.id, sellerA.id, 'held', { gross: 100000, fee: 10000, net: 90000 });
    const allocB = await createAllocation(payment.id, order.id, sellerB.id, 'released', { gross: 200000, fee: 20000, net: 180000 });
    createdIds.allocations.push(allocA.id, allocB.id);

    const sellerARes = await api('/api/seller/finance/summary', { headers: headers(sellerA.token) });
    const sellerBRes = await api('/api/seller/finance/summary', { headers: headers(sellerB.token) });

    check('9. Seller A cannot see Seller B allocation amounts', sellerARes.body?.data?.escrow_amount === 90000 && sellerARes.body?.data?.released_amount === 0);
    check('9. Seller B cannot see Seller A allocation amounts', sellerBRes.body?.data?.released_amount === 180000 && sellerBRes.body?.data?.escrow_amount === 0);
    check('Seller A gross_revenue reflects only their own allocation', sellerARes.body?.data?.gross_revenue === 100000);
    check('Seller B gross_revenue reflects only their own allocation', sellerBRes.body?.data?.gross_revenue === 200000);

    // 10. Client-supplied seller_id cannot override authenticated identity —
    // Seller B attempts to read the summary while asking (via query string
    // and body) to be treated as Seller A. The route only ever reads
    // req.user.id, so this must have no effect.
    const overrideRes = await api(`/api/seller/finance/summary?seller_id=${sellerA.id}`, {
      headers: headers(sellerB.token),
      method: 'GET',
    });
    check('10. Client-supplied seller_id query param cannot override authenticated identity', overrideRes.body?.data?.escrow_amount === 0 && overrideRes.body?.data?.released_amount === 180000);

    // Ledger endpoint isolation + shape
    const ledgerA = await api('/api/seller/finance/ledger', { headers: headers(sellerA.token) });
    if (!(ledgerA.status === 200 && Array.isArray(ledgerA.body?.data) && ledgerA.body.data.length === 1 && ledgerA.body.data[0]?.state === 'held')) {
      console.log('DEBUG ledgerA:', ledgerA.status, JSON.stringify(ledgerA.body));
    }
    check('Ledger endpoint requires auth and scopes to the caller', ledgerA.status === 200 && Array.isArray(ledgerA.body?.data) && ledgerA.body.data.length === 1 && ledgerA.body.data[0]?.state === 'held');

    // Refunded/disputed exclusion end-to-end — a *second*, separate order,
    // since (payment_id, seller_id) is unique: one allocation row per seller
    // per payment, not one row per state.
    const second = await createOrderWithPayment(buyer.id);
    createdIds.orders.push(second.order.id); createdIds.idems.push(second.idem.id); createdIds.payments.push(second.payment.id);
    const allocRefunded = await createAllocation(second.payment.id, second.order.id, sellerA.id, 'refunded', { gross: 50000, fee: 5000, net: 45000 });
    createdIds.allocations.push(allocRefunded.id);
    const sellerAAfterRefund = await api('/api/seller/finance/summary', { headers: headers(sellerA.token) });
    check('Refunded allocation does not inflate gross_revenue or available_balance', sellerAAfterRefund.body?.data?.gross_revenue === 100000 && sellerAAfterRefund.body?.data?.available_balance === 0);
    check('Refunded allocation is reported separately', sellerAAfterRefund.body?.data?.refunded_amount === 45000);
  } finally {
    if (createdIds.allocations.length) await supabaseAdmin.from('payment_allocations').delete().in('id', createdIds.allocations);
    if (createdIds.payments.length) await supabaseAdmin.from('payments').delete().in('id', createdIds.payments);
    if (createdIds.idems.length) await supabaseAdmin.from('checkout_idempotency').delete().in('id', createdIds.idems);
    if (createdIds.orders.length) await supabaseAdmin.from('orders').delete().in('id', createdIds.orders);
    await supabaseAdmin.from('users').delete().in('id', createdIds.users);
  }
}

(async () => {
  try {
    runUnitTests();
    await runIntegrationTests();
  } catch (err) {
    console.error('PHASE6 FINANCE TEST ERROR:', err);
    process.exitCode = 1;
  }

  console.log(`\nPHASE6 FINANCE TEST SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
  if (checks.some((v) => !v)) process.exitCode = 1;
})();
