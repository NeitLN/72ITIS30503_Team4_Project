const path = require('path');
const crypto = require('crypto');

const checks = [];
function check(name, condition) {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}`);
}

let service = null;
try {
  service = require('./services/adminTransactionService');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

check('Admin transaction service exists', Boolean(service));

if (service) {
  const defaults = service.normalizeAdminTransactionQuery({});
  check('List query has deterministic defaults', defaults.page === 1
    && defaults.pageSize === 20 && defaults.sort === 'created_at' && defaults.direction === 'desc');

  const bounded = service.normalizeAdminTransactionQuery({ page: '2', pageSize: '999' });
  check('Page size is bounded server-side', bounded.page === 2 && bounded.pageSize === service.MAX_PAGE_SIZE);

  const filtered = service.normalizeAdminTransactionQuery({
    orderStatus: 'processing', paymentState: 'held', paymentMethod: 'simulated_card',
    sort: 'total_amount', direction: 'asc', dateFrom: '2026-07-01', dateTo: '2026-07-31',
    search: ' SH-100@example.test ',
  });
  check('Supported filters and sorting normalize safely', filtered.orderStatus === 'processing'
    && filtered.paymentState === 'held' && filtered.paymentMethod === 'simulated_card'
    && filtered.sort === 'total_amount' && filtered.direction === 'asc'
    && filtered.search === 'SH-100@example.test');

  for (const [field, value] of [
    ['orderStatus', 'deleted'], ['paymentState', 'captured'], ['paymentMethod', 'momo'],
    ['sort', 'customer_email'], ['direction', 'sideways'], ['dateFrom', '01/07/2026'],
  ]) {
    let rejected = false;
    try { service.normalizeAdminTransactionQuery({ [field]: value }); } catch (error) {
      rejected = error.status === 400 && error.code === 'INVALID_TRANSACTION_QUERY';
    }
    check(`Invalid ${field} is rejected safely`, rejected);
  }

  let unsafeSearchRejected = false;
  try { service.normalizeAdminTransactionQuery({ search: 'x),role.eq.admin' }); } catch (error) {
    unsafeSearchRejected = error.status === 400;
  }
  check('PostgREST filter injection characters are rejected', unsafeSearchRejected);

  const processing = service.normalizeAdminAction({
    action: 'processing', expectedOrderUpdatedAt: '2026-07-23T10:00:00.000Z', idempotencyKey: crypto.randomUUID(),
  });
  check('Non-financial processing action accepts an optional reason', processing.action === 'processing' && processing.reason === null);

  for (const action of ['completed', 'cancelled']) {
    let reasonRequired = false;
    try {
      service.normalizeAdminAction({
        action, expectedOrderUpdatedAt: '2026-07-23T10:00:00.000Z', idempotencyKey: crypto.randomUUID(),
      });
    } catch (error) { reasonRequired = error.code === 'ADMIN_REASON_REQUIRED' && error.status === 422; }
    check(`${action} requires a non-empty reason`, reasonRequired);
  }

  const safe = service.toSafeAdminPayment({
    id: crypto.randomUUID(), state: 'held', payment_method: 'simulated_card', currency: 'VND',
    gross_amount: '100001', platform_fee_total: '10000', seller_amount_total: '90001',
    card_brand: 'visa', card_last_four: '4242', version: 1, held_at: '2026-07-23T10:00:00Z',
    metadata: { pan: '4111111111111111', cvv: '123' }, provider: 'stylehub_simulation',
  });
  const serialized = JSON.stringify(safe).toLowerCase();
  check('Safe payment exposes exact integer totals and optimistic version', safe.gross_amount === 100001
    && safe.platform_fee_total === 10000 && safe.seller_amount_total === 90001 && safe.version === 1);
  check('Safe payment exposes only brand and last four card fields', safe.card_brand === 'visa'
    && safe.last_four === '4242' && !serialized.includes('4111111111111111') && !serialized.includes('cvv'));
}

const passed = checks.filter(Boolean).length;
console.log(`\nPHASE 3 ADMIN TRANSACTION UNIT SUMMARY: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exitCode = 1;
