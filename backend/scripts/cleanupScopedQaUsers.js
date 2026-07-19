/**
 * Deletes test data for explicitly named, dedicated QA accounts only.
 * Refuses every email outside the phase10-regression-* namespace.
 *
 * PHASE_QA_CLEANUP_EMAILS=a@...,b@... node scripts/cleanupScopedQaUsers.js
 */
require('dotenv').config();
const { supabaseAdmin } = require('../lib/supabase');
const { BUCKET } = require('../services/listingService');

const emails = String(process.env.PHASE_QA_CLEANUP_EMAILS || '')
  .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);

if (!emails.length || emails.some((email) => !email.startsWith('phase10-regression-') || !email.endsWith('@stylehub.invalid'))) {
  console.error('Refusing cleanup: every email must match phase10-regression-*@stylehub.invalid.');
  process.exit(2);
}

function storagePath(url, bucket = BUCKET) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = String(url || '').indexOf(marker);
  return index < 0 ? null : decodeURIComponent(String(url).slice(index + marker.length));
}

async function removeWhere(table, column, values) {
  if (values.length) {
    const { error } = await supabaseAdmin.from(table).delete().in(column, values);
    if (error) throw new Error(`${table} cleanup failed: ${error.message}`);
  }
}

async function run() {
  const { data: users, error: userError } = await supabaseAdmin.from('users').select('id,email,avatar_url').in('email', emails);
  if (userError) throw userError;
  const userIds = (users || []).map((row) => row.id);
  if (!userIds.length) {
    console.log('No scoped QA accounts found.');
    return;
  }

  const { data: products, error: productError } = await supabaseAdmin
    .from('products').select('id,image_url,thumbnail,brand_id').in('seller_id', userIds).eq('listing_source', 'user');
  if (productError) throw productError;
  const productIds = (products || []).map((row) => row.id);
  const candidateBrandIds = [...new Set((products || []).map((row) => row.brand_id).filter(Boolean))];
  const { data: candidateBrands } = candidateBrandIds.length
    ? await supabaseAdmin.from('brands').select('id,name').in('id', candidateBrandIds)
    : { data: [] };
  const qaBrandIds = (candidateBrands || [])
    .filter((row) => /^QA Denim Co \d+$/i.test(row.name || ''))
    .map((row) => row.id);
  const { data: images } = productIds.length
    ? await supabaseAdmin.from('product_images').select('url').in('product_id', productIds)
    : { data: [] };
  const paths = [...new Set([
    ...(products || []).flatMap((row) => [storagePath(row.image_url), storagePath(row.thumbnail)]),
    ...(images || []).map((row) => storagePath(row.url)),
  ].filter(Boolean))];
  const avatarPaths = [...new Set((users || []).map((row) => storagePath(row.avatar_url, 'avatars')).filter(Boolean))];

  const [{ data: buyerOrders }, { data: sellerItems }] = await Promise.all([
    supabaseAdmin.from('orders').select('id').in('user_id', userIds),
    productIds.length
      ? supabaseAdmin.from('order_items').select('order_id').in('product_id', productIds)
      : Promise.resolve({ data: [] }),
  ]);
  const orderIds = [...new Set([...(buyerOrders || []), ...(sellerItems || [])].map((row) => row.id || row.order_id))];

  await removeWhere('inventory_movements', 'order_id', orderIds);
  await removeWhere('checkout_idempotency', 'order_id', orderIds);
  await removeWhere('order_coupons', 'order_id', orderIds);
  await removeWhere('order_items', 'order_id', orderIds);
  await removeWhere('orders', 'id', orderIds);
  await removeWhere('checkout_idempotency', 'buyer_id', userIds);
  await removeWhere('products', 'id', productIds);
  await removeWhere('brands', 'id', qaBrandIds);
  if (paths.length) {
    const { error: storageError } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
    if (storageError) throw storageError;
  }
  if (avatarPaths.length) {
    const { error: avatarError } = await supabaseAdmin.storage.from('avatars').remove(avatarPaths);
    if (avatarError) throw avatarError;
  }
  await removeWhere('users', 'id', userIds);
  console.log(`Removed ${userIds.length} scoped QA users, ${productIds.length} listings, ${orderIds.length} orders, ${paths.length + avatarPaths.length} storage objects.`);
}

run().catch((error) => {
  console.error('Scoped QA cleanup failed:', error.message);
  process.exit(1);
});
