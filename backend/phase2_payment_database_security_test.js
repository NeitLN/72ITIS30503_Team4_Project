const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ quiet: true });
const { supabaseAdmin } = require('./lib/supabase');

function requireIsolatedDatabase() {
  let url = null;
  try { url = new URL(process.env.SUPABASE_URL || ''); } catch {}
  if (process.env.PHASE2_ISOLATED_DB !== 'true'
      || !url
      || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('A loopback disposable database and PHASE2_ISOLATED_DB=true are required.');
  }
}

function check(name, condition) {
  assert.ok(condition, name);
  console.log(`[PASS] ${name}`);
}

(async () => {
  requireIsolatedDatabase();
  const run = `phase2-security-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const password = `Synthetic-${crypto.randomBytes(12).toString('hex')}`;
  const buyerEmail = `${run}-buyer@stylehub.invalid`;
  const sellerEmail = `${run}-seller@stylehub.invalid`;

  const buyerAuth = await supabaseAdmin.auth.admin.createUser({ email: buyerEmail, password, email_confirm: true });
  const sellerAuth = await supabaseAdmin.auth.admin.createUser({ email: sellerEmail, password, email_confirm: true });
  if (buyerAuth.error) throw buyerAuth.error;
  if (sellerAuth.error) throw sellerAuth.error;

  const buyerId = crypto.randomUUID();
  const sellerId = crypto.randomUUID();
  let result = await supabaseAdmin.from('users').insert([
    { id: buyerId, auth_user_id: buyerAuth.data.user.id, email: buyerEmail, full_name: 'Synthetic Security Buyer', password_hash: 'not-loginable', role: 'customer' },
    { id: sellerId, auth_user_id: sellerAuth.data.user.id, email: sellerEmail, full_name: 'Synthetic Security Seller', password_hash: 'not-loginable', role: 'seller' },
  ]);
  if (result.error) throw result.error;

  const productId = crypto.randomUUID();
  result = await supabaseAdmin.from('products').insert({
    id: productId, name: 'Synthetic Security Product', slug: `${run}-product`, price: 140001,
    category_slug: 't-shirts', image_url: '/images/products/coolmate-basic-tee.jpg',
    thumbnail: '/images/products/coolmate-basic-tee.jpg', description: 'Synthetic security fixture.',
    stock: 2, brand: 'Phase 2 QA', seller_name: sellerEmail, seller_id: sellerId,
    condition: 'good', size: 'M', location: 'Test Only', is_negotiable: false,
    listing_source: 'user', status: 'active', inventory_mode: 'simple',
  });
  if (result.error) throw result.error;

  const checkout = await supabaseAdmin.rpc('stylehub_checkout_atomic_v2', {
    p_buyer_id: buyerId,
    p_idempotency_key: crypto.randomUUID(),
    p_request_fingerprint: crypto.createHash('sha256').update(run).digest('hex'),
    p_customer: { name: 'Synthetic Security Buyer', email: buyerEmail, phone: '0901234567', address: '1 Synthetic Street', city: 'Test City' },
    p_payment_method: 'simulated_card',
    p_payment_details: { cardBrand: 'visa', lastFour: '4242' },
    p_notes: null,
    p_coupon_code: null,
    p_items: [{ productId, variantId: null, quantity: 1, expectedUnitPrice: 140001 }],
  });
  if (checkout.error) throw checkout.error;
  const paymentId = checkout.data.payment.id;
  const allocationId = checkout.data.payment.allocations[0].id;

  const anonKey = process.env.SUPABASE_ANON_KEY;
  const url = process.env.SUPABASE_URL;
  const buyerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const sellerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const buyerLogin = await buyerClient.auth.signInWithPassword({ email: buyerEmail, password });
  const sellerLogin = await sellerClient.auth.signInWithPassword({ email: sellerEmail, password });
  if (buyerLogin.error) throw buyerLogin.error;
  if (sellerLogin.error) throw sellerLogin.error;

  const ownRead = await buyerClient.from('payments').select('id').eq('id', paymentId);
  const otherRead = await sellerClient.from('payments').select('id').eq('id', paymentId);
  const unauthenticatedRead = await anonClient.from('payments').select('id').eq('id', paymentId);
  if (ownRead.error || ownRead.data?.length !== 1) {
    console.error(`SECURITY READ DIAGNOSTIC: code=${ownRead.error?.code || 'none'} rows=${ownRead.data?.length ?? 'none'}`);
  }
  check('Buyer can read only the buyer-owned payment through RLS', !ownRead.error && ownRead.data.length === 1);
  check('Another authenticated user cannot read the buyer payment', !otherRead.error && otherRead.data.length === 0);
  check('Unauthenticated clients cannot read payments', Boolean(unauthenticatedRead.error));

  const paymentInsert = await buyerClient.from('payments').insert({
    order_id: checkout.data.id, provider: 'forbidden', amount: 0, currency: 'VND', status: 'pending', metadata: {},
  });
  const paymentUpdate = await sellerClient.from('payments').update({ state: 'refunded' }).eq('id', paymentId);
  const paymentDelete = await buyerClient.from('payments').delete().eq('id', paymentId);
  const allocationUpdate = await sellerClient.from('payment_allocations').update({ state: 'released' }).eq('id', allocationId);
  const eventInsert = await buyerClient.from('payment_events').insert({
    payment_id: paymentId, previous_state: 'held', new_state: 'refunded', event_type: 'payment_refunded',
    actor_type: 'buyer', idempotency_key: 'forbidden-browser-event', safe_metadata: {},
  });
  check('Ordinary authenticated users cannot insert, update, or delete payments', Boolean(paymentInsert.error) && Boolean(paymentUpdate.error) && Boolean(paymentDelete.error));
  check('Sellers cannot mutate payment allocations directly', Boolean(allocationUpdate.error));
  check('Ordinary authenticated users cannot insert payment events', Boolean(eventInsert.error));

  const forbiddenRpc = await buyerClient.rpc('stylehub_checkout_atomic_v2', {
    p_buyer_id: buyerId,
    p_idempotency_key: crypto.randomUUID(),
    p_request_fingerprint: 'b'.repeat(64),
    p_customer: {}, p_payment_method: 'simulated_card', p_payment_details: {},
    p_notes: null, p_coupon_code: null, p_items: [],
  });
  check('No public RPC permits direct checkout/payment state mutation', Boolean(forbiddenRpc.error));
  console.log('PHASE 2 DATABASE SECURITY SUMMARY: 7/7 passed');
})().catch((error) => {
  console.error(`PHASE 2 DATABASE SECURITY TEST ERROR: ${error.code || error.name || 'ERROR'} ${error.message || ''}`.trim());
  process.exitCode = 1;
});
