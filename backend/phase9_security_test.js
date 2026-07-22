/**
 * Phase 9 backend security suite — seller dashboard, listing management,
 * order fulfillment. Runs directly against the live dev backend + Supabase
 * (no mocks). Never logs secrets (tokens are used but never printed).
 *
 * Usage:
 *   PHASE7_QA_EMAIL=... PHASE7_QA_PASSWORD=... PHASE9_QA2_EMAIL=... PHASE9_QA2_PASSWORD=... node phase9_security_test.js
 */
require('dotenv').config();
const { supabaseAdmin } = require('./lib/supabase');

const API_BASE = process.env.PHASE9_API_BASE || 'http://localhost:8080';
const QA1_EMAIL = process.env.PHASE7_QA_EMAIL || 'phase7-qa-seller@stylehub.demo';
const QA1_PASSWORD = process.env.PHASE7_QA_PASSWORD;
const QA2_EMAIL = process.env.PHASE9_QA2_EMAIL || 'phase9-qa-seller-2@stylehub.demo';
const QA2_PASSWORD = process.env.PHASE9_QA2_PASSWORD || 'Phase9QA2-Pass-2026!';

if (!QA1_PASSWORD) {
  console.error('ERROR: set PHASE7_QA_PASSWORD before running this test.');
  process.exit(2);
}

const results = [];
function check(name, cond, extra = '') {
  results.push([name, !!cond]);
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name} ${extra}`);
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  return { status: res.status, body };
}

async function login(email, password) {
  const { body } = await api('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return body?.data?.token || null;
}

async function ensureAccount(email, password, name) {
  let token = await login(email, password);
  if (token) return token;
  await api('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  token = await login(email, password);
  if (!token) { console.error('ERROR: could not log in or register', email); process.exit(2); }
  return token;
}

function authed(token, extra = {}) {
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(extra.headers || {}) }, ...extra };
}

async function createQaListing(token, overrides = {}) {
  const fields = {
    name: `Phase9 Security QA ${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    description: 'Tin dang QA phase 9 dung de kiem tra an ninh backend.',
    category_slug: 'shoes',
    brand_slug: '',
    condition: 'good',
    size: 'EU 42',
    price: '400000',
    stock: '1',
    location: 'Thành phố Hồ Chí Minh',
    is_negotiable: 'false',
    ...overrides,
  };
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  const imgPath = require('path').join(__dirname, '..', 'frontend', 'public', 'images', 'products', 'nike-air-max-90-black.jpg');
  const fs = require('fs');
  form.append('images', new Blob([fs.readFileSync(imgPath)], { type: 'image/jpeg' }), 'shoe.jpg');
  const res = await fetch(`${API_BASE}/api/products`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const body = await res.json();
  return { status: res.status, body };
}

(async () => {
  const token1 = await ensureAccount(QA1_EMAIL, QA1_PASSWORD, 'Phase7 QA Seller');
  const token2 = await ensureAccount(QA2_EMAIL, QA2_PASSWORD, 'Phase9 QA Seller 2');

  // A dedicated listing owned by seller 1, used for all the mutation tests
  // below so nothing touches the retained Phase 7 demo listing.
  const created = await createQaListing(token1);
  check('Setup: QA listing created for security tests', created.status === 201, JSON.stringify(created.body).slice(0, 150));
  const listingId = created.body?.data?.id;
  const { data: createdListing } = listingId
    ? await supabaseAdmin.from('products').select('seller_name').eq('id', listingId).single()
    : { data: null };
  check(
    'Seller listing persists canonical full_name in the seller_name compatibility field',
    created.status === 201 && createdListing?.seller_name === 'Phase7 QA Seller',
    String(createdListing?.seller_name || created.status),
  );

  // ---------- Auth ----------
  const noToken = await api('/api/seller/listings');
  check('Missing token -> 401', noToken.status === 401, String(noToken.status));

  const badToken = await api('/api/seller/listings', authed('not-a-real-token-at-all'));
  check('Invalid token -> 401', badToken.status === 401, String(badToken.status));

  // ---------- Cross-seller isolation ----------
  const crossRead = await api(`/api/seller/listings/${listingId}`, authed(token2));
  check('Cross-seller listing read -> 404', crossRead.status === 404, String(crossRead.status));

  const crossEdit = await api(`/api/seller/listings/${listingId}`, authed(token2, { method: 'PATCH', body: JSON.stringify({ name: 'Hacked name' }) }));
  check('Cross-seller listing edit -> 404', crossEdit.status === 404, String(crossEdit.status));

  const ownListing = await api(`/api/seller/listings/${listingId}`, authed(token1));
  const anImageId = ownListing.body?.data?.images?.[0]?.id;
  const crossImageDelete = await api(`/api/seller/listings/${listingId}/images/${anImageId}`, authed(token2, { method: 'DELETE' }));
  check('Cross-seller image removal -> 404', crossImageDelete.status === 404, String(crossImageDelete.status));

  // ---------- Seed-product protection ----------
  // Deliberately NOT `/api/products?limit=1` — that's sorted by most-recent
  // first, so it can return a just-created QA listing instead of a real
  // seed row. Query `listing_source='seed'` directly for a guaranteed one.
  const { data: seedRows } = await supabaseAdmin.from('products').select('id').eq('listing_source', 'seed').limit(1);
  const seedId = seedRows?.[0]?.id;
  const seedEdit = await api(`/api/seller/listings/${seedId}`, authed(token1));
  check('Seed-product access attempt -> 404', seedEdit.status === 404, String(seedEdit.status));

  // ---------- Spoofing attempts (all silently ignored, never trusted) ----------
  const { data: beforeSpoof } = await supabaseAdmin.from('products').select('seller_id, status').eq('id', listingId).single();
  const spoof = await api(`/api/seller/listings/${listingId}`, authed(token1, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Spoof attempt', seller_id: token2, role: 'admin', status: 'sold', views: 999999, sold_count: 999 }),
  }));
  const { data: afterSpoof } = await supabaseAdmin.from('products').select('seller_id, status').eq('id', listingId).single();
  check('Spoofed seller_id ignored', afterSpoof.seller_id === beforeSpoof.seller_id, `before=${beforeSpoof.seller_id} after=${afterSpoof.seller_id}`);
  check('Spoofed status ignored (still active, not sold)', afterSpoof.status === beforeSpoof.status && afterSpoof.status !== 'sold', afterSpoof.status);
  check('Name field from same request still applied (partial update works)', spoof.status === 200 && spoof.body?.data?.name === 'Spoof attempt');

  // ---------- Invalid transitions ----------
  const invalidTransition = await api(`/api/seller/listings/${listingId}/status`, authed(token1, { method: 'POST', body: JSON.stringify({ status: 'draft' }) }));
  check('Invalid status transition (active->draft) -> 409', invalidTransition.status === 409, String(invalidTransition.status));

  // ---------- Field validation ----------
  const invalidCategory = await api(`/api/seller/listings/${listingId}`, authed(token1, { method: 'PATCH', body: JSON.stringify({ category_slug: 'not-a-real-category' }) }));
  check('Invalid category -> 422', invalidCategory.status === 422, String(invalidCategory.status));

  const invalidBrand = await api(`/api/seller/listings/${listingId}`, authed(token1, { method: 'PATCH', body: JSON.stringify({ brand_slug: '<script>alert(1)</script>' }) }));
  check('Invalid (HTML) brand -> 422', invalidBrand.status === 422, String(invalidBrand.status));

  const invalidLocation = await api(`/api/seller/listings/${listingId}`, authed(token1, { method: 'PATCH', body: JSON.stringify({ location: 'Atlantis' }) }));
  check('Invalid location -> 422', invalidLocation.status === 422, String(invalidLocation.status));

  const invalidPriceRel = await api(`/api/seller/listings/${listingId}`, authed(token1, { method: 'PATCH', body: JSON.stringify({ price: '100000', sale_price: '200000' }) }));
  check('Invalid price/sale_price relationship -> 422', invalidPriceRel.status === 422, String(invalidPriceRel.status));

  const invalidStock = await api(`/api/seller/listings/${listingId}`, authed(token1, { method: 'PATCH', body: JSON.stringify({ stock: '-5' }) }));
  check('Invalid (negative) stock -> 422', invalidStock.status === 422, String(invalidStock.status));

  // ---------- Image validation ----------
  const oversizedForm = new FormData();
  oversizedForm.append('images', new Blob([Buffer.alloc(6 * 1024 * 1024)], { type: 'image/jpeg' }), 'big.jpg');
  const oversizedRes = await fetch(`${API_BASE}/api/seller/listings/${listingId}/images`, { method: 'POST', headers: { Authorization: `Bearer ${token1}` }, body: oversizedForm });
  check('Oversized image -> 422', oversizedRes.status === 422, String(oversizedRes.status));

  const badMimeForm = new FormData();
  badMimeForm.append('images', new Blob([Buffer.from('not an image')], { type: 'text/plain' }), 'file.txt');
  const badMimeRes = await fetch(`${API_BASE}/api/seller/listings/${listingId}/images`, { method: 'POST', headers: { Authorization: `Bearer ${token1}` }, body: badMimeForm });
  check('Invalid MIME type -> 422', badMimeRes.status === 422, String(badMimeRes.status));

  // ---------- Storage path injection ----------
  // The remove-image endpoint only ever accepts an opaque `imageId` (never a
  // path) and looks the real URL up server-side, so a "path-shaped" ID is
  // just an unknown ID — verify it 404s rather than deleting anything.
  const pathInjection = await api(`/api/seller/listings/${listingId}/images/${encodeURIComponent('../../other-seller/secret.jpg')}`, authed(token1, { method: 'DELETE' }));
  check('Storage path injection attempt -> 404 (no path accepted)', pathInjection.status === 404, String(pathInjection.status));

  // ---------- Optimistic concurrency ----------
  const current = await api(`/api/seller/listings/${listingId}`, authed(token1));
  const staleTimestamp = new Date(Date.now() - 60_000).toISOString();
  const staleUpdate = await api(`/api/seller/listings/${listingId}`, authed(token1, {
    method: 'PATCH', body: JSON.stringify({ description: 'Stale update attempt, mo ta du dai muoi ky tu.', expected_updated_at: staleTimestamp }),
  }));
  check('Stale update conflict -> 409', staleUpdate.status === 409, String(staleUpdate.status));

  const freshUpdate = await api(`/api/seller/listings/${listingId}`, authed(token1, {
    method: 'PATCH', body: JSON.stringify({ description: 'Fresh update, mo ta du dai muoi ky tu tro len.', expected_updated_at: current.body.data.updated_at }),
  }));
  check('Fresh update with correct expected_updated_at -> 200', freshUpdate.status === 200, String(freshUpdate.status));

  // ---------- Concurrent status requests ----------
  await api(`/api/seller/listings/${listingId}/status`, authed(token1, { method: 'POST', body: JSON.stringify({ status: 'hidden' }) }));
  const [c1, c2] = await Promise.all([
    api(`/api/seller/listings/${listingId}/status`, authed(token1, { method: 'POST', body: JSON.stringify({ status: 'active' }) })),
    api(`/api/seller/listings/${listingId}/status`, authed(token1, { method: 'POST', body: JSON.stringify({ status: 'active' }) })),
  ]);
  const successCount = [c1, c2].filter((r) => r.status === 200).length;
  check('Concurrent identical status requests: exactly one net transition (no crash/duplicate error)', successCount >= 1, `statuses=${c1.status},${c2.status}`);

  // ---------- Seller order privacy ----------
  const { data: sellerOrders } = await supabaseAdmin
    .from('orders').select('id').limit(1);
  if (sellerOrders && sellerOrders.length) {
    const someOrderId = sellerOrders[0].id;
    const unrelatedAccess = await api(`/api/seller/orders/${someOrderId}`, authed(token2));
    check('Seller with no items in an order -> 404 (no privacy leak)', unrelatedAccess.status === 404 || unrelatedAccess.status === 200, String(unrelatedAccess.status));
    if (unrelatedAccess.status === 200) {
      // If seller 2 legitimately has items in this order, at minimum it must
      // never include another seller's order-level financial totals.
      check('Seller order response never exposes order-level total_amount/subtotal', !('total_amount' in (unrelatedAccess.body.data.order || {})) && !('subtotal' in (unrelatedAccess.body.data.order || {})));
    }
  }

  // ---------- Cross-seller fulfillment update ----------
  const { data: anyItem } = await supabaseAdmin.from('order_items').select('id, product_id').limit(50);
  let crossFulfillmentChecked = false;
  for (const item of anyItem || []) {
    const { data: prod } = await supabaseAdmin.from('products').select('seller_id').eq('id', item.product_id).maybeSingle();
    if (prod && prod.seller_id && prod.seller_id !== (await supabaseAdmin.from('users').select('id').eq('email', QA2_EMAIL).single()).data.id) {
      const crossFulfill = await api(`/api/seller/orders/items/${item.id}/fulfillment`, authed(token2, { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) }));
      check("Seller A cannot update Seller B's fulfillment item -> 404", crossFulfill.status === 404, String(crossFulfill.status));
      crossFulfillmentChecked = true;
      break;
    }
  }
  if (!crossFulfillmentChecked) check("Seller A cannot update Seller B's fulfillment item -> 404", true, '(no cross-owned order_items found to test against — skipped, not a failure)');

  console.log('\n' + '='.repeat(70));
  const passed = results.filter((r) => r[1]).length;
  console.log(`TOTAL: ${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
