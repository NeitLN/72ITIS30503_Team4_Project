/**
 * StyleHub — Phase 15 sustainability demo cleanup.
 * --------------------------------------------------
 * Namespace/ID-scoped cleanup for the dataset created by
 * seedSustainabilityDemo.js. Every row this script ever touches is first
 * resolved FRESH from the database using the exact namespace markers below
 * — never from a cached ID file — and re-verified to belong to the
 * namespace immediately before delete. It never runs a broad
 * table-wide delete/update.
 *
 * Modes:
 *   node backend/scripts/cleanupSustainabilityDemo.js --dry-run   (default; always safe)
 *   node backend/scripts/cleanupSustainabilityDemo.js --apply --yes
 *
 * Phase 15 demo data is meant to be RETAINED for the lecturer demo — this
 * script exists as a documented safety valve, not something the normal
 * Phase 15 workflow runs.
 */
const path = require('path');
require('dotenv').config({ path: [path.join(__dirname, '../.env'), path.join(__dirname, '../../.env')], quiet: true });
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { NAMESPACE } = require('../data/sustainabilityDemoCatalog');

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const CONFIRMED = process.argv.includes('--yes');

/**
 * Resolves the exact, current set of Phase 15 demo rows by namespace
 * markers only:
 *   - users:    email like 'stylehub-demo-%@example.test'
 *   - products: seller_id in (those users) AND listing_source='user' AND
 *               name starting with the "Demo Circular — " marker
 *   - orders:   user_id = the demo buyer AND notes = the exact Phase 15 marker
 * Every dependent table is then scoped to those resolved product/order IDs
 * only — this function is the single source of truth both the dry-run
 * report and the real delete path use, so they can never disagree.
 */
async function resolveNamespacedRows() {
  const { data: users, error: usersErr } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .like('email', `${NAMESPACE.USERNAME_PREFIX}%@${NAMESPACE.EMAIL_DOMAIN}`);
  if (usersErr) throw usersErr;

  const userIds = (users || []).map((u) => u.id);
  let products = [];
  if (userIds.length) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, seller_id, name, slug, listing_source')
      .in('seller_id', userIds)
      .eq('listing_source', 'user')
      .like('name', `${NAMESPACE.NAME_PREFIX} —%`);
    if (error) throw error;
    products = data || [];
  }

  let orders = [];
  if (userIds.length) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, notes')
      .in('user_id', userIds)
      .eq('notes', NAMESPACE.ORDER_NOTE_MARKER);
    if (error) throw error;
    orders = data || [];
  }

  // Safety check: every resolved product must have a name that starts with
  // the exact marker AND belong to a resolved user — refuse to proceed if
  // that invariant somehow doesn't hold (defense in depth against a future
  // query change accidentally widening the match).
  const userIdSet = new Set(userIds);
  const unsafeProduct = products.find((p) => !p.name.startsWith(`${NAMESPACE.NAME_PREFIX} —`) || !userIdSet.has(p.seller_id));
  if (unsafeProduct) throw new Error(`Refusing to proceed: resolved product ${unsafeProduct.id} fails the namespace safety check.`);
  const unsafeOrder = orders.find((o) => o.notes !== NAMESPACE.ORDER_NOTE_MARKER || !userIdSet.has(o.user_id));
  if (unsafeOrder) throw new Error(`Refusing to proceed: resolved order ${unsafeOrder.id} fails the namespace safety check.`);

  return { users, products, orders };
}

async function run() {
  if (!isSupabaseAdminConfigured()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in backend/.env.');

  const { users, products, orders } = await resolveNamespacedRows();
  const productIds = products.map((p) => p.id);
  const orderIds = orders.map((o) => o.id);
  const userIds = users.map((u) => u.id);

  console.log(`\nStyleHub Phase 15 sustainability demo cleanup — mode: ${MODE.toUpperCase()}`);
  console.log(`Resolved by namespace: ${userIds.length} users, ${productIds.length} products, ${orderIds.length} orders.\n`);
  users.forEach((u) => console.log(`  user:    ${u.id}  ${u.email}`));
  products.forEach((p) => console.log(`  product: ${p.id}  ${p.name}`));
  orders.forEach((o) => console.log(`  order:   ${o.id}`));

  if (MODE === 'dry-run') {
    console.log('\nDry run only — no rows deleted. Rerun with --apply --yes to delete exactly these rows.');
    return { users, products, orders };
  }

  if (!CONFIRMED) {
    throw new Error('Refusing to delete without explicit confirmation. Rerun with --apply --yes.');
  }

  if (orderIds.length) {
    await supabaseAdmin.from('inventory_movements').delete().in('order_id', orderIds);
    await supabaseAdmin.from('checkout_idempotency').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_coupons').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_items').delete().in('order_id', orderIds);
    await supabaseAdmin.from('orders').delete().in('id', orderIds);
  }
  if (userIds.length) {
    await supabaseAdmin.from('checkout_idempotency').delete().in('buyer_id', userIds);
  }
  if (productIds.length) {
    await supabaseAdmin.from('product_sustainability').delete().in('product_id', productIds);
    await supabaseAdmin.from('product_images').delete().in('product_id', productIds);
    await supabaseAdmin.from('products').delete().in('id', productIds);
  }
  if (userIds.length) {
    await supabaseAdmin.from('users').delete().in('id', userIds);
  }

  console.log('\nCleanup complete — exactly the rows listed above were removed.');
  return { users, products, orders };
}

module.exports = { resolveNamespacedRows, run };

if (require.main === module) {
  run().catch((err) => {
    console.error('\nCLEANUP ERROR:', err.message || err);
    process.exitCode = 1;
  });
}
