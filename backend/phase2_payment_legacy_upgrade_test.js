const assert = require('node:assert/strict');
require('dotenv').config({ quiet: true });
const { supabaseAdmin } = require('./lib/supabase');

const IDS = {
  seller: '10000000-0000-4000-8000-000000000021',
  buyer: '20000000-0000-4000-8000-000000000021',
  product: '30000000-0000-4000-8000-000000000021',
  idempotency: '40000000-0000-4000-8000-000000000021',
  payment: '50000000-0000-4000-8000-000000000021',
};

function requireIsolatedDatabase() {
  let url = null;
  try { url = new URL(process.env.SUPABASE_URL || ''); } catch {}
  if (process.env.PHASE2_ISOLATED_DB !== 'true'
      || !url
      || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('A loopback disposable database and PHASE2_ISOLATED_DB=true are required.');
  }
}

async function setup() {
  const users = [
    { id: IDS.seller, email: 'phase2-legacy-seller@stylehub.invalid', full_name: 'Phase 2 Legacy Seller', password_hash: 'not-loginable', role: 'seller' },
    { id: IDS.buyer, email: 'phase2-legacy-buyer@stylehub.invalid', full_name: 'Phase 2 Legacy Buyer', password_hash: 'not-loginable', role: 'customer' },
  ];
  let result = await supabaseAdmin.from('users').insert(users);
  if (result.error) throw result.error;

  result = await supabaseAdmin.from('products').insert({
    id: IDS.product,
    name: 'Phase 2 Legacy Product',
    slug: 'phase2-legacy-product',
    price: 100001,
    category_slug: 't-shirts',
    image_url: '/images/products/coolmate-basic-tee.jpg',
    thumbnail: '/images/products/coolmate-basic-tee.jpg',
    description: 'Synthetic legacy-upgrade fixture.',
    stock: 2,
    brand: 'Phase 2 QA',
    seller_name: 'Phase 2 Legacy Seller',
    seller_id: IDS.seller,
    condition: 'good',
    size: 'M',
    location: 'Test Only',
    is_negotiable: false,
    listing_source: 'user',
    status: 'active',
    inventory_mode: 'simple',
  });
  if (result.error) throw result.error;

  const checkout = await supabaseAdmin.rpc('stylehub_checkout_atomic', {
    p_buyer_id: IDS.buyer,
    p_idempotency_key: IDS.idempotency,
    p_request_fingerprint: 'a'.repeat(64),
    p_customer: {
      name: 'Phase Two Legacy Buyer',
      email: 'phase2-legacy-checkout@stylehub.invalid',
      phone: '0901234567',
      address: '1 Synthetic Street',
      city: 'Test City',
    },
    p_payment_method: 'bank_transfer',
    p_notes: null,
    p_coupon_code: null,
    p_items: [{ productId: IDS.product, variantId: null, quantity: 1, expectedUnitPrice: 100001 }],
  });
  if (checkout.error) throw checkout.error;

  result = await supabaseAdmin.from('payments').insert({
    id: IDS.payment,
    order_id: checkout.data.id,
    provider: 'legacy_academic_gateway',
    transaction_id: 'PHASE2-LEGACY-SYNTHETIC-001',
    amount: checkout.data.totalAmount,
    currency: 'VND',
    status: 'paid',
    metadata: { legacy: true },
  });
  if (result.error) throw result.error;
  console.log('[PASS] Created one synthetic pre-Phase-2 order, item, inventory movement, and legacy payment.');
}

async function verify() {
  const { data: payment, error } = await supabaseAdmin.from('payments')
    .select('id,order_id,buyer_id,provider,transaction_id,amount,currency,status,metadata,payment_method,state,gross_amount,platform_fee_total,seller_amount_total,card_brand,card_last_four,checkout_idempotency_id,version,held_at,refunded_at')
    .eq('id', IDS.payment)
    .single();
  if (error) throw error;
  assert.equal(payment.buyer_id, IDS.buyer);
  assert.equal(payment.version, 1);
  assert.equal(payment.provider, 'legacy_academic_gateway');
  assert.equal(payment.transaction_id, 'PHASE2-LEGACY-SYNTHETIC-001');
  assert.equal(Number(payment.amount), 130001);
  assert.deepEqual(payment.metadata, { legacy: true });
  for (const field of ['payment_method', 'state', 'gross_amount', 'platform_fee_total', 'seller_amount_total', 'card_brand', 'card_last_four', 'checkout_idempotency_id', 'held_at', 'refunded_at']) {
    assert.equal(payment[field], null, `Legacy field ${field} must remain null.`);
  }

  const [order, items, allocations, events] = await Promise.all([
    supabaseAdmin.from('orders').select('id').eq('id', payment.order_id).single(),
    supabaseAdmin.from('order_items').select('id', { count: 'exact', head: true }).eq('order_id', payment.order_id),
    supabaseAdmin.from('payment_allocations').select('id', { count: 'exact', head: true }).eq('payment_id', IDS.payment),
    supabaseAdmin.from('payment_events').select('id', { count: 'exact', head: true }).eq('payment_id', IDS.payment),
  ]);
  assert.equal(order.error, null);
  assert.equal(items.count, 1);
  assert.equal(allocations.count, 0);
  assert.equal(events.count, 0);
  console.log('[PASS] Legacy payment survived; buyer/version were defensibly backfilled and no financial or card values were invented.');
}

(async () => {
  requireIsolatedDatabase();
  if (process.argv[2] === 'setup') await setup();
  else if (process.argv[2] === 'verify') await verify();
  else throw new Error('Expected setup or verify mode.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
