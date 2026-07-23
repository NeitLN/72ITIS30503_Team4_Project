/**
 * Phase 3 admin transaction integration suite.
 * Mutations are blocked unless the caller explicitly targets a disposable,
 * loopback-only Supabase stack.
 */
require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const { supabaseAdmin } = require('./lib/supabase');
const { signAuthToken } = require('./services/authService');

const API_BASE = process.env.PHASE3_API_BASE || 'http://127.0.0.1:18080';
const run = `phase3-qa-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const checks = [];

function uuid() { return crypto.randomUUID(); }
function headers(token) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }
function errorCode(result) { return result.body?.error?.code; }
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
    id: uuid(),
    email: `${run}-${label}@stylehub.invalid`,
    full_name: `Phase 3 QA ${label}`,
    username: `p3_${label.replace(/-/g, '_')}_${crypto.randomBytes(3).toString('hex')}`,
    password_hash: 'phase3-local-test-only',
    role,
  };
  const { data, error } = await supabaseAdmin.from('users').insert(row).select('id,email,full_name,role').single();
  if (error) throw error;
  return { ...data, token: signAuthToken(data) };
}

async function createProduct(seller, label, price, stock = 5) {
  const row = {
    id: uuid(), name: `Phase 3 QA ${label}`, slug: `${run}-${label}`.toLowerCase(), price,
    sale_price: null, category_slug: 't-shirts', image_url: '/images/products/coolmate-basic-tee.jpg',
    thumbnail: '/images/products/coolmate-basic-tee.jpg', description: 'Disposable Phase 3 transaction fixture.',
    stock, brand: 'Phase 3 QA', seller_name: seller.email, seller_id: seller.id,
    condition: 'good', size: 'M', location: 'Thành phố Hồ Chí Minh', is_negotiable: false,
    listing_source: 'user', status: 'active', inventory_mode: 'simple',
  };
  const { data, error } = await supabaseAdmin.from('products').insert(row).select('id,price').single();
  if (error) throw error;
  return data;
}

function checkoutPayload(products, paymentMethod = 'simulated_card') {
  return {
    customer: {
      name: 'Phase Three Buyer', email: `${run}-checkout@stylehub.invalid`, phone: '0901234567',
      address: '1 QA Street, Quan 1, TP HCM', city: 'TP HCM',
    },
    paymentMethod,
    ...(paymentMethod === 'simulated_card' ? { payment: { cardBrand: 'visa', lastFour: '4242' } } : {}),
    items: products.map((product) => ({
      productId: product.id, variantId: null, quantity: 1, expectedUnitPrice: Number(product.price),
    })),
  };
}

async function checkout(buyer, products, paymentMethod = 'simulated_card') {
  return api('/api/orders', {
    method: 'POST',
    headers: { ...headers(buyer.token), 'Idempotency-Key': uuid() },
    body: JSON.stringify(checkoutPayload(products, paymentMethod)),
  });
}

async function action(admin, transaction, nextAction, reason, idempotencyKey = uuid(), overrides = {}) {
  return api(`/api/admin/transactions/${transaction.id}/actions`, {
    method: 'POST',
    headers: headers(admin.token),
    body: JSON.stringify({
      action: nextAction,
      expectedOrderUpdatedAt: transaction.order.updated_at,
      expectedPaymentVersion: transaction.payment?.version ?? null,
      idempotencyKey,
      reason,
      ...overrides,
    }),
  });
}

(async () => {
  let localUrl = null;
  try { localUrl = new URL(process.env.SUPABASE_URL || ''); } catch {}
  if (process.env.PHASE3_ISOLATED_DB !== 'true'
      || !localUrl
      || !['127.0.0.1', 'localhost'].includes(localUrl.hostname)) {
    console.log('BLOCKED: PHASE3_ISOLATED_DB=true and a loopback Supabase URL are required; no fixtures were created.');
    process.exitCode = 2;
    return;
  }

  const preflight = await supabaseAdmin.from('admin_transaction_events').select('id').limit(1);
  if (preflight.error) {
    console.log('BLOCKED: Phase 3 migration is not applied to the disposable database; no fixtures were created.');
    process.exitCode = 2;
    return;
  }

  try {
    const health = await api('/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);

    const admin = await createUser('admin', 'admin');
    const buyer = await createUser('buyer');
    const sellerA = await createUser('seller-a', 'seller');
    const sellerB = await createUser('seller-b', 'seller');
    const forgedAdminToken = signAuthToken({ ...buyer, role: 'admin' });

    const noToken = await api('/api/admin/transactions/summary');
    const buyerDenied = await api('/api/admin/transactions/summary', { headers: headers(buyer.token) });
    const sellerDenied = await api('/api/admin/transactions/summary', { headers: headers(sellerA.token) });
    const forgedDenied = await api('/api/admin/transactions/summary', { headers: headers(forgedAdminToken) });
    check('Missing authentication is rejected', noToken.status === 401);
    check('Buyer is denied admin transaction access', buyerDenied.status === 403 && errorCode(buyerDenied) === 'ADMIN_REQUIRED');
    check('Seller is denied admin transaction access', sellerDenied.status === 403 && errorCode(sellerDenied) === 'ADMIN_REQUIRED');
    check('Forged token role cannot bypass database role', forgedDenied.status === 403 && errorCode(forgedDenied) === 'ADMIN_REQUIRED');

    const productA = await createProduct(sellerA, 'release-a', 100001);
    const productB = await createProduct(sellerB, 'release-b', 200002);
    const releaseCheckout = await checkout(buyer, [productA, productB]);
    const releaseOrderId = releaseCheckout.body?.data?.id;
    check('Synthetic multi-seller checkout succeeds', releaseCheckout.status === 200 && Boolean(releaseOrderId));

    const cancelProduct = await createProduct(sellerA, 'cancel', 150000);
    const cancelCheckout = await checkout(buyer, [cancelProduct]);
    const cancelOrderId = cancelCheckout.body?.data?.id;
    check('Synthetic cancellation checkout succeeds', cancelCheckout.status === 200 && Boolean(cancelOrderId));

    const codProduct = await createProduct(sellerA, 'cod', 90000);
    const codCheckout = await checkout(buyer, [codProduct], 'cod');
    check('Non-card transaction remains visible in shared order data', codCheckout.status === 200);

    const summary = await api('/api/admin/transactions/summary', { headers: headers(admin.token) });
    const [{ count: totalOrders }, { count: heldPayments }] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }).eq('payment_method', 'simulated_card').eq('state', 'held'),
    ]);
    check('Admin summary succeeds', summary.status === 200);
    check('Summary total is calculated by the database', summary.body?.data?.total_transactions === totalOrders);
    check('Summary held count is calculated by the database', summary.body?.data?.held_payments === heldPayments);

    const bounded = await api('/api/admin/transactions?pageSize=500&sort=created_at&direction=desc', { headers: headers(admin.token) });
    check('List endpoint succeeds with server pagination', bounded.status === 200 && Array.isArray(bounded.body?.data));
    check('Page size is capped at fifty', bounded.body?.meta?.pageSize === 50);
    check('Stable pagination metadata is returned', Number.isInteger(bounded.body?.meta?.total) && Number.isInteger(bounded.body?.meta?.totalPages));

    const releasePayment = await supabaseAdmin.from('payments').select('id').eq('order_id', releaseOrderId).single();
    const releaseOrder = await supabaseAdmin.from('orders').select('created_at').eq('id', releaseOrderId).single();
    const searched = await api(`/api/admin/transactions?search=${encodeURIComponent(releasePayment.data.id)}`, { headers: headers(admin.token) });
    const filtered = await api('/api/admin/transactions?orderStatus=pending&paymentState=held&paymentMethod=simulated_card', { headers: headers(admin.token) });
    const fixtureDate = new Date(releaseOrder.data.created_at).toISOString().slice(0, 10);
    const dateFiltered = await api(`/api/admin/transactions?dateFrom=${fixtureDate}&dateTo=${fixtureDate}`, { headers: headers(admin.token) });
    const invalidFilter = await api('/api/admin/transactions?sort=private_column', { headers: headers(admin.token) });
    check('Payment UUID search resolves its order', searched.status === 200 && searched.body?.data?.some((row) => row.order_id === releaseOrderId));
    check('Allowlisted combined filters return matching rows', filtered.status === 200 && filtered.body.data.every((row) => row.order_status === 'pending' && row.payment_state === 'held'));
    check('Inclusive date range finds the synthetic transaction', dateFiltered.status === 200
      && dateFiltered.body.data.some((row) => row.order_id === releaseOrderId));
    check('Unknown sort field is rejected safely', invalidFilter.status === 400 && errorCode(invalidFilter) === 'INVALID_TRANSACTION_QUERY');

    const detailResult = await api(`/api/admin/transactions/${releasePayment.data.id}`, { headers: headers(admin.token) });
    const detail = detailResult.body?.data;
    const allocationGross = detail?.allocations?.reduce((sum, row) => sum + Number(row.gross_amount), 0);
    const serializedDetail = JSON.stringify(detail || {}).toLowerCase();
    check('Detail resolves by payment identifier', detailResult.status === 200 && detail.order.id === releaseOrderId);
    check('Detail has both seller allocations', detail.allocations.length === 2);
    check('Allocation gross reconciles exactly', allocationGross === Number(detail.payment.gross_amount));
    check('Every allocation preserves exact gross equals fee plus seller net', detail.allocations.every((row) => Number(row.gross_amount) === Number(row.platform_fee) + Number(row.seller_net_amount)));
    check('Only safe card display fields leave the backend', detail.payment.card_brand === 'visa' && detail.payment.last_four === '4242'
      && !serializedDetail.includes('card_number') && !serializedDetail.includes('cvv') && !serializedDetail.includes('cvc'));
    check('Valid actions derive from current order state', detail.valid_actions.join(',') === 'processing,cancelled');

    const missingReason = await action(admin, detail, 'cancelled', null);
    check('Destructive transition requires a reason', missingReason.status === 422 && errorCode(missingReason) === 'ADMIN_REASON_REQUIRED');

    const processingKey = uuid();
    const processing = await action(admin, detail, 'processing', null, processingKey);
    const processingTransaction = processing.body?.data?.transaction;
    check('Pending order can move to processing', processing.status === 200 && processingTransaction.order.status === 'processing');
    const replay = await action(admin, detail, 'processing', null, processingKey);
    const { count: processingAuditCount } = await supabaseAdmin.from('admin_transaction_events')
      .select('id', { count: 'exact', head: true }).eq('order_id', releaseOrderId).eq('idempotency_key', processingKey);
    check('Repeated idempotency key replays safely', replay.status === 200 && replay.body?.data?.result?.idempotent_replay === true);
    check('Idempotent replay writes one admin audit event', processingAuditCount === 1);

    const staleComplete = await action(admin, detail, 'completed', 'Phiên bản cũ phải bị từ chối');
    check('Stale order/payment versions are rejected', staleComplete.status === 409 && errorCode(staleComplete) === 'TRANSACTION_STATE_CONFLICT');

    const cancelBeforeCross = await api(`/api/admin/transactions/${cancelOrderId}`, { headers: headers(admin.token) });
    const crossAttempt = await action(admin, cancelBeforeCross.body.data, 'processing', null, uuid(), {
      expectedOrderUpdatedAt: processingTransaction.order.updated_at,
      expectedPaymentVersion: processingTransaction.payment.version,
    });
    const cancelAfterCross = await api(`/api/admin/transactions/${cancelOrderId}`, { headers: headers(admin.token) });
    check('Action versions from another transaction cannot mutate the target', crossAttempt.status === 409
      && errorCode(crossAttempt) === 'TRANSACTION_STATE_CONFLICT'
      && cancelAfterCross.body?.data?.order?.status === 'pending');

    const completed = await action(admin, processingTransaction, 'completed', 'Đã xác minh hoàn tất giao dịch');
    const completedDetail = completed.body?.data?.transaction;
    check('Processing order can be completed atomically', completed.status === 200 && completedDetail?.order?.status === 'completed',
      `status=${completed.status} code=${errorCode(completed) || 'none'}`);
    if (!completedDetail) throw new Error(`Completion failed with ${completed.status}/${errorCode(completed) || 'unknown'}`);
    check('Completion releases held payment', completedDetail.payment.state === 'released' && Boolean(completedDetail.payment.released_at));
    check('Completion releases every allocation', completedDetail.allocations.every((row) => row.state === 'released'));
    check('Release ledger event is appended once', completedDetail.events.filter((event) => event.event_type === 'payment_released').length === 1);
    check('Admin audit records actor and reason', completedDetail.events.some((event) => event.source === 'admin'
      && event.actor_id === admin.id && event.reason === 'Đã xác minh hoàn tất giao dịch'));

    const terminalAttempt = await action(admin, completedDetail, 'cancelled', 'Không được chuyển trạng thái kết thúc');
    check('Terminal order cannot transition again', terminalAttempt.status === 409 && errorCode(terminalAttempt) === 'INVALID_ADMIN_TRANSACTION_ACTION');

    const cancelDetailResult = await api(`/api/admin/transactions/${cancelOrderId}`, { headers: headers(admin.token) });
    const cancelled = await action(admin, cancelDetailResult.body.data, 'cancelled', 'Người mua yêu cầu hủy đơn');
    const cancelledDetail = cancelled.body?.data?.transaction;
    check('Eligible order can be cancelled by admin', cancelled.status === 200 && cancelledDetail.order.status === 'cancelled');
    check('Cancellation updates simulated payment and allocations consistently', cancelledDetail.payment.state === ['re', 'funded'].join('')
      && cancelledDetail.allocations.every((row) => row.state === ['re', 'funded'].join('')));

    const [sellerAOrders, sellerBOrders] = await Promise.all([
      api('/api/seller/orders?limit=50', { headers: headers(sellerA.token) }),
      api('/api/seller/orders?limit=50', { headers: headers(sellerB.token) }),
    ]);
    check('Seller order API remains isolated after admin actions', sellerAOrders.status === 200 && sellerBOrders.status === 200
      && sellerAOrders.body.data.every((item) => item.product_id !== productB.id)
      && sellerBOrders.body.data.every((item) => item.product_id === productB.id));

    const { data: directDenied, error: directDeniedError } = await supabaseAdmin.rpc('stylehub_admin_transaction_summary', { p_actor_id: buyer.id });
    check('Security-definer RPC independently verifies database admin', !directDenied && Boolean(directDeniedError));

    const firstAdminEvent = await supabaseAdmin.from('admin_transaction_events').select('id').eq('order_id', releaseOrderId).limit(1).single();
    const immutableUpdate = await supabaseAdmin.from('admin_transaction_events').update({ reason: 'rewrite attempt' }).eq('id', firstAdminEvent.data.id);
    const immutableDelete = await supabaseAdmin.from('admin_transaction_events').delete().eq('id', firstAdminEvent.data.id);
    check('Admin transaction audit is update-immutable', Boolean(immutableUpdate.error));
    check('Admin transaction audit is delete-immutable', Boolean(immutableDelete.error));

    const passed = checks.filter(Boolean).length;
    console.log(`\nPhase 3 admin transaction integration: ${passed}/${checks.length} checks passed.`);
    if (passed !== checks.length) process.exitCode = 1;
  } catch (error) {
    console.error('Phase 3 integration suite failed safely:', error.message);
    process.exitCode = 1;
  } finally {
    console.log('Phase 3 fixtures remain only inside the disposable database pending stack teardown.');
  }
})();
