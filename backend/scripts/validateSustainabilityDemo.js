/**
 * StyleHub — Phase 15 sustainability demo validator.
 * -----------------------------------------------------
 * Read-only. Verifies the dataset created by seedSustainabilityDemo.js is
 * complete, correctly namespaced, honestly labeled, and does not disturb
 * the protected 148-product seed catalog. Exits non-zero if any check
 * fails.
 *
 *   node backend/scripts/validateSustainabilityDemo.js
 */
const path = require('path');
require('dotenv').config({ path: [path.join(__dirname, '../.env'), path.join(__dirname, '../../.env')], quiet: true });
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { CIRCULAR_LIFECYCLE_TYPES } = require('../constants/sustainability');
const { NAMESPACE, DEMO_LISTINGS, DEMO_ACCOUNTS } = require('../data/sustainabilityDemoCatalog');
const { resolveNamespacedRows } = require('./cleanupSustainabilityDemo');

const checks = [];
function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

(async () => {
  try {
    if (!isSupabaseAdminConfigured()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in backend/.env.');

    const { users, products, orders } = await resolveNamespacedRows();

    check('All 4 demo accounts resolved by namespace', users.length === DEMO_ACCOUNTS.length, `found ${users.length}, expected ${DEMO_ACCOUNTS.length}`);
    check('Every demo account email is on the reserved example.test domain', users.every((u) => u.email.endsWith(`@${NAMESPACE.EMAIL_DOMAIN}`)));
    check('Exactly one demo account has the customer (buyer) role', users.filter((u) => u.role === 'customer').length === 1);
    check('Remaining demo accounts have the seller role', users.filter((u) => u.role === 'seller').length === DEMO_ACCOUNTS.length - 1);

    check('All manifest demo listings resolved by namespace', products.length === DEMO_LISTINGS.length, `found ${products.length}, expected ${DEMO_LISTINGS.length}`);
    check('Every demo listing name carries the Demo Circular marker', products.every((p) => p.name.startsWith(`${NAMESPACE.NAME_PREFIX} —`)));
    check('Every demo listing slug carries the namespace prefix', products.every((p) => p.slug.startsWith('demo-circular-')));

    const productIds = products.map((p) => p.id);
    const { data: fullProducts, error: fullErr } = await supabaseAdmin
      .from('products').select('id, status, stock, listing_source').in('id', productIds);
    if (fullErr) throw fullErr;
    check('All demo listings are active user listings', fullProducts.every((p) => p.status === 'active' && p.listing_source === 'user'));
    check('No demo listing has negative stock', fullProducts.every((p) => Number(p.stock) >= 0));

    const { data: journeys, error: journeyErr } = await supabaseAdmin
      .from('product_sustainability').select('product_id, lifecycle_type, claim_source').in('product_id', productIds);
    if (journeyErr) throw journeyErr;
    check('Every demo listing has a Product Journey row', journeys.length === products.length);
    check('Every demo Product Journey claim source is seller_declared', journeys.every((j) => j.claim_source === 'seller_declared'));

    const lifecycleCounts = {};
    for (const j of journeys) lifecycleCounts[j.lifecycle_type] = (lifecycleCounts[j.lifecycle_type] || 0) + 1;
    for (const type of CIRCULAR_LIFECYCLE_TYPES) {
      check(`At least 2 active demo listings are lifecycle "${type}"`, (lifecycleCounts[type] || 0) >= 2, `count=${lifecycleCounts[type] || 0}`);
    }
    check('At least one demo listing is lifecycle "new" (non-circular comparison)', (lifecycleCounts.new || 0) >= 1);
    check('At least one demo listing is lifecycle "not_specified" (comparison)', (lifecycleCounts.not_specified || 0) >= 1);

    check('At least one demo order resolved by namespace', orders.length >= 1);
    const orderIds = orders.map((o) => o.id);
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('order_items').select('order_id, seller_id, quantity, fulfillment_status, lifecycle_type_snapshot, claim_source_snapshot').in('order_id', orderIds);
    if (itemsErr) throw itemsErr;
    const sellersByOrder = new Map();
    for (const item of items) {
      if (!sellersByOrder.has(item.order_id)) sellersByOrder.set(item.order_id, new Set());
      sellersByOrder.get(item.order_id).add(item.seller_id);
    }
    const multiSellerOrder = [...sellersByOrder.values()].some((set) => set.size >= 2);
    check('At least one demo order spans 2+ sellers', multiSellerOrder);
    const hasQtyGreaterThanOne = items.some((item) => Number(item.quantity) > 1);
    check('At least one demo order item has quantity > 1', hasQtyGreaterThanOne);
    const completedItems = items.filter((i) => i.fulfillment_status === 'completed');
    const cancelledItems = items.filter((i) => i.fulfillment_status === 'cancelled');
    check('At least one demo order item reached fulfillment_status completed', completedItems.length >= 1);
    check('At least one demo order item is cancelled (exclusion proof)', cancelledItems.length >= 1);
    check('Every demo order item snapshot has claim_source_snapshot seller_declared', items.every((i) => i.claim_source_snapshot === 'seller_declared'));

    const { count: seedCount, error: seedErr } = await supabaseAdmin
      .from('products').select('id', { count: 'exact', head: true }).eq('listing_source', 'seed');
    if (seedErr) throw seedErr;
    check('Verified seed catalog remains exactly 148 products', seedCount === 148, `seed=${seedCount}`);

    const summary = `${checks.filter(Boolean).length}/${checks.length} passed`;
    console.log(`\nPHASE15 VALIDATE SUMMARY: ${summary}`);
    if (checks.some((v) => !v)) process.exitCode = 1;
  } catch (err) {
    console.error('VALIDATE ERROR:', err.message || err);
    process.exitCode = 1;
  }
})();
