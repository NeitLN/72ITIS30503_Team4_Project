/**
 * StyleHub — Phase 15 sustainability demonstration seeder.
 * ---------------------------------------------------------
 * Creates (or verifies, on rerun) the durable demo dataset described in
 * backend/data/sustainabilityDemoCatalog.js: 3 demo sellers, 1 demo buyer,
 * ~12 demo listings covering all four circular lifecycle types, and 2 demo
 * orders (one completed multi-seller order with a quantity-2 line, one
 * cancelled order) — all driven through the SAME authoritative HTTP APIs a
 * real user would use (register/login, POST /api/products with real image
 * uploads, POST /api/orders atomic checkout, seller fulfillment
 * transitions, order cancellation). No sustainability metric, snapshot, or
 * order total is ever written directly.
 *
 * Requires the backend to be running (default http://127.0.0.1:8080 —
 * override with SUSTAINABILITY_DEMO_API_BASE) and backend/.env to contain
 * SUPABASE_SERVICE_ROLE_KEY + STYLEHUB_AUTH_SECRET.
 *
 * Modes:
 *   node backend/scripts/seedSustainabilityDemo.js --dry-run
 *   node backend/scripts/seedSustainabilityDemo.js --apply
 *   node backend/scripts/seedSustainabilityDemo.js --apply --show-credentials
 *
 * Idempotency: every account is looked up by its exact namespaced email
 * before any write; every listing is looked up by (seller_id, exact demo
 * name) before any write; every order reuses a deterministic
 * Idempotency-Key derived from its manifest key, so the real atomic
 * checkout RPC's own idempotent-replay guarantee is what prevents
 * duplicate orders on rerun (not script-side guessing). A second --apply
 * run performs zero inserts and zero unintended updates.
 *
 * Demo account passwords are never generated randomly and never printed
 * blind — they are deterministically derived from STYLEHUB_AUTH_SECRET
 * (already a private, untracked server secret) so the SAME password is
 * reproducible on every run without ever being written to any file. Pass
 * --show-credentials to print them to your own terminal on demand (e.g. to
 * hand to a lecturer out-of-band) — see docs/sustainability-demo-data.md.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: [path.join(__dirname, '../.env'), path.join(__dirname, '../../.env')], quiet: true });

const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { NAMESPACE, DEMO_SELLERS, DEMO_BUYER, DEMO_ACCOUNTS, DEMO_LISTINGS, DEMO_ORDERS } = require('../data/sustainabilityDemoCatalog');

const API_BASE = process.env.SUSTAINABILITY_DEMO_API_BASE || 'http://127.0.0.1:8080';
const PRODUCTS_DIR = path.join(__dirname, '../../frontend/public/images/products');

const MODE = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--dry-run') ? 'dry-run' : null;
const SHOW_CREDENTIALS = process.argv.includes('--show-credentials');
if (!MODE) {
  console.error('Usage: node backend/scripts/seedSustainabilityDemo.js --dry-run | --apply [--show-credentials]');
  process.exit(1);
}
const DRY = MODE === 'dry-run';

const stats = { accountsCreated: 0, accountsExisting: 0, listingsCreated: 0, listingsExisting: 0, ordersCreated: 0, ordersReplayed: 0 };

function log(line) {
  console.log(line);
}

function deriveDemoPassword(username) {
  const secret = process.env.STYLEHUB_AUTH_SECRET;
  if (!secret) throw new Error('STYLEHUB_AUTH_SECRET is required to derive demo account passwords (see backend/.env.example).');
  const digest = crypto.createHmac('sha256', secret).update(`stylehub-phase15-demo-password:${username}`).digest('base64url');
  return `Ph15-${digest.slice(0, 24)}!`;
}

function deterministicUuid(label) {
  const hash = crypto.createHash('sha256').update(`stylehub-phase15-demo:${label}`).digest('hex');
  const variantNibble = ['8', '9', 'a', 'b'][parseInt(hash[16], 16) % 4];
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${variantNibble}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function api(method, pathname, payload, token, extraHeaders = {}) {
  const isForm = typeof FormData !== 'undefined' && payload instanceof FormData;
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    },
    body: payload === undefined ? undefined : (isForm ? payload : JSON.stringify(payload)),
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function requireHealth() {
  let health;
  try {
    health = await api('GET', '/api/health');
  } catch (err) {
    throw new Error(`Backend is not reachable at ${API_BASE}. Start it first (npm run dev:backend). (${err.message})`);
  }
  if (health.status !== 200 || !health.body?.data?.databaseConfigured) {
    throw new Error(`Backend at ${API_BASE} is not healthy / database not configured: ${JSON.stringify(health.body)}`);
  }
}

async function findUserByEmail(email) {
  const { data, error } = await supabaseAdmin.from('users').select('id, email, username, role, location, bio, full_name').eq('email', email).maybeSingle();
  if (error) throw error;
  return data;
}

function demoListingName(listing) {
  return listing.title;
}

// ---------------------------------------------------------------------------
// One-time legacy migration: an earlier revision of this dataset used
// visible "stylehub-demo-*" usernames and a "Demo Circular — " product-name
// prefix as BOTH the identification marker AND the customer-facing text.
// Those are no longer shown to shoppers — every account/listing here now
// reads as an ordinary marketplace identity, and records are identified
// relationally (email domain + seller/buyer id membership) instead. This
// function renames any rows still carrying the old visible naming, in
// place (same row id, so every FK — products, orders, images, journeys —
// is preserved automatically), and is a safe no-op once nothing old-style
// remains. It never touches a row outside the old exact namespace.
// ---------------------------------------------------------------------------
const LEGACY_EMAIL_LIKE = 'stylehub-demo-%@example.test';

async function migrateLegacyIdentities() {
  const { data: legacyUsers, error: legacyUsersErr } = await supabaseAdmin
    .from('users').select('id, email, role, location, username').like('email', LEGACY_EMAIL_LIKE);
  if (legacyUsersErr) throw legacyUsersErr;

  for (const account of DEMO_ACCOUNTS) {
    const expectedRole = account.key === DEMO_BUYER.key ? 'customer' : 'seller';
    const match = (legacyUsers || []).find((u) => u.role === expectedRole && u.location === account.location);
    if (!match) continue; // nothing legacy to migrate for this account (fresh install, or already migrated)

    if (DRY) {
      log(`  [WOULD MIGRATE] legacy user ${match.email} -> ${account.email}`);
      continue;
    }
    // The derived login password is a function of `username` (see
    // deriveDemoPassword below) — renaming the username without also
    // re-hashing the password would silently break login for this account,
    // since its stored hash was computed from the OLD username at
    // registration time. Re-hash to the newly-derived password here so the
    // deterministic derivation and the stored hash stay in sync.
    const { hashPassword } = require('../services/authService');
    const newPassword = deriveDemoPassword(account.username);
    const { error } = await supabaseAdmin.from('users').update({
      username: account.username,
      email: account.email,
      full_name: account.displayName,
      bio: account.bio,
      password_hash: hashPassword(newPassword),
      updated_at: new Date().toISOString(),
    }).eq('id', match.id);
    if (error) throw error;
    log(`  [MIGRATED] legacy user ${match.email} -> ${account.email}`);
  }

  // Matched by stale SLUG (not name) so this is a safe no-op once nothing
  // stale remains, but still catches a row whose `name` was already
  // migrated in an earlier partial run while its `slug` — genuinely
  // visible in the product URL — was not.
  const { data: legacyProducts, error: legacyProductsErr } = await supabaseAdmin
    .from('products').select('id, name, slug, price, seller_id').eq('listing_source', 'user').like('slug', 'demo-circular-%');
  if (legacyProductsErr) throw legacyProductsErr;
  if (!legacyProducts || !legacyProducts.length) return;

  const { generateUniqueSlug } = require('../services/listingService');

  // Every manifest price is unique within this dataset, so (scoped to only
  // the rows already matched by the stale slug prefix above) it is a safe
  // exact key to bridge old rows to their new manifest entry.
  for (const listing of DEMO_LISTINGS) {
    const match = legacyProducts.find((p) => Number(p.price) === Number(listing.price));
    if (!match) continue;

    const newName = demoListingName(listing);
    if (DRY) {
      log(`  [WOULD MIGRATE] legacy listing "${match.name}" (slug=${match.slug}) -> "${newName}"`);
      continue;
    }
    const newSlug = await generateUniqueSlug(newName);
    const { error } = await supabaseAdmin.from('products').update({
      name: newName,
      slug: newSlug,
      description: listing.description,
      updated_at: new Date().toISOString(),
    }).eq('id', match.id);
    if (error) throw error;
    await supabaseAdmin.from('product_sustainability').update({
      product_story: listing.product_story ?? null,
    }).eq('product_id', match.id);
    log(`  [MIGRATED] legacy listing slug ${match.slug} -> ${newSlug} ("${newName}")`);
  }
}

async function findListingByOwnerAndName(sellerId, name) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, slug, price, sale_price, stock, status, is_featured, updated_at')
    .eq('seller_id', sellerId)
    .eq('listing_source', 'user')
    .eq('name', name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
async function ensureAccount(account) {
  const password = deriveDemoPassword(account.username);
  const existing = await findUserByEmail(account.email);
  const role = account.key === DEMO_BUYER.key ? 'customer' : 'seller';

  if (!existing) {
    if (DRY) {
      log(`  [WOULD CREATE] user ${account.email} (role=${role})`);
      return { id: null, token: null, location: account.location, created: true };
    }
    const reg = await api('POST', '/api/auth/register', { name: account.displayName, email: account.email, password, role });
    if (reg.status !== 200 && reg.status !== 409) {
      throw new Error(`Register failed for ${account.email}: ${reg.status} ${JSON.stringify(reg.body)}`);
    }
    stats.accountsCreated += 1;
    log(`  [CREATED] user ${account.email} (role=${role})`);
  } else {
    stats.accountsExisting += 1;
    log(`  [EXISTS] user ${account.email}`);
    if (DRY) return { id: existing.id, token: null, location: existing.location, created: false };
  }

  const login = await api('POST', '/api/auth/login', { email: account.email, password });
  if (login.status !== 200) {
    throw new Error(
      `Login failed for demo account ${account.email}. This usually means STYLEHUB_AUTH_SECRET changed since ` +
      `this account was first created, so its derived password no longer matches. (${login.status})`,
    );
  }
  const { token, user } = login.body.data;

  const needsProfileUpdate = user.username !== account.username || user.location !== account.location || user.full_name !== account.displayName || (user.bio || '') !== account.bio;
  if (needsProfileUpdate) {
    const profile = await api('PATCH', '/api/profile/me', {
      display_name: account.displayName,
      username: account.username,
      bio: account.bio,
      location: account.location,
    }, token);
    if (profile.status !== 200) {
      throw new Error(`Profile update failed for ${account.email}: ${profile.status} ${JSON.stringify(profile.body)}`);
    }
    log(`  [PROFILE SET] ${account.username}`);
  }

  return { id: user.id, token, location: account.location, created: !existing };
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------
function mimeForFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg'; // matches this repo's existing convention: several
  // committed catalog assets are internally WebP/AVIF but kept as .jpg for
  // historical consistency (see IMAGE_SOURCES.md) — browsers/Next.js render
  // them correctly regardless of the declared upload mimetype.
}

async function ensureListing(listing, sellers) {
  const seller = sellers[listing.sellerKey];
  const name = demoListingName(listing);

  if (!seller.id && DRY) {
    log(`  [WOULD CREATE] listing "${name}" (seller not yet created in dry-run)`);
    return { created: true };
  }

  const existing = await findListingByOwnerAndName(seller.id, name);
  if (existing) {
    stats.listingsExisting += 1;
    log(`  [EXISTS] listing "${name}" (${existing.id})`);
    if (!DRY && listing.is_featured && !existing.is_featured) {
      await supabaseAdmin.from('products').update({ is_featured: true }).eq('id', existing.id);
      log(`  [FEATURED SET] ${name}`);
    }
    return { id: existing.id, created: false };
  }

  if (DRY) {
    log(`  [WOULD CREATE] listing "${name}"`);
    return { created: true };
  }

  const imagePath = path.join(PRODUCTS_DIR, listing.image);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Demo listing "${listing.key}" references missing image asset: ${imagePath}`);
  }
  const buffer = fs.readFileSync(imagePath);

  const form = new FormData();
  form.append('name', name);
  form.append('description', listing.description);
  form.append('category_slug', listing.category_slug);
  const brandField = listing.brand_slug || listing.customBrandName;
  if (brandField) form.append('brand_slug', brandField);
  form.append('condition', listing.condition);
  form.append('size', listing.size);
  form.append('price', String(listing.price));
  if (listing.sale_price) form.append('sale_price', String(listing.sale_price));
  form.append('stock', String(listing.stock));
  form.append('location', seller.location);
  form.append('is_negotiable', 'false');
  form.append('sustainability', JSON.stringify({
    lifecycle_type: listing.lifecycle_type,
    material: listing.material ?? null,
    repair_history: listing.repair_history ?? null,
    upcycle_details: listing.upcycle_details ?? null,
    product_story: listing.product_story ?? null,
    reuse_packaging: Boolean(listing.reuse_packaging),
  }));
  form.append('images', new Blob([buffer], { type: mimeForFile(listing.image) }), listing.image);

  const created = await api('POST', '/api/products', form, seller.token);
  if (created.status !== 201) {
    throw new Error(`Create listing failed for "${listing.key}": ${created.status} ${JSON.stringify(created.body)}`);
  }
  const productId = created.body.data.id;
  stats.listingsCreated += 1;
  log(`  [CREATED] listing "${name}" (${productId})`);

  if (listing.is_featured) {
    await supabaseAdmin.from('products').update({ is_featured: true }).eq('id', productId);
    log(`  [FEATURED SET] ${name}`);
  }

  return { id: productId, created: true };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
function buildCheckoutPayload(order, listingIds, listingsByKey) {
  return {
    customer: {
      name: DEMO_BUYER.displayName,
      email: DEMO_BUYER.email,
      phone: '0901234567',
      address: '12 Nguyễn Huệ, Quận 1',
      city: 'Thành phố Hồ Chí Minh',
    },
    paymentMethod: order.key === 'cancelled-exclusion' ? 'bank_transfer' : 'cod',
    notes: NAMESPACE.ORDER_NOTE,
    couponCode: null,
    items: order.lines.map((line) => ({
      productId: listingIds[line.listingKey],
      variantId: null,
      quantity: line.quantity,
      expectedUnitPrice: listingsByKey[line.listingKey].sale_price || listingsByKey[line.listingKey].price,
    })),
  };
}

const FULFILLMENT_STAGES = ['awaiting_confirmation', 'confirmed', 'preparing', 'shipped', 'completed'];

async function driveItemToCompleted(sellerToken, item) {
  const currentIndex = FULFILLMENT_STAGES.indexOf(item.fulfillment_status);
  if (currentIndex === -1 || item.fulfillment_status === 'completed') return;
  for (let i = Math.max(currentIndex, 0) + 1; i < FULFILLMENT_STAGES.length; i++) {
    const next = FULFILLMENT_STAGES[i];
    const res = await api('PATCH', `/api/seller/orders/items/${item.id}/fulfillment`, { status: next }, sellerToken);
    if (res.status !== 200) {
      throw new Error(`Fulfillment transition to ${next} failed for item ${item.id}: ${res.status} ${JSON.stringify(res.body)}`);
    }
  }
}

async function ensureOrder(order, buyer, sellers, listingIds, listingsByKey) {
  const idempotencyKey = deterministicUuid(`order:${order.key}`);
  if (DRY) {
    log(`  [WOULD CREATE/REPLAY] order "${order.key}" (outcome=${order.outcome})`);
    return;
  }

  const payload = buildCheckoutPayload(order, listingIds, listingsByKey);
  const checkout = await api('POST', '/api/orders', payload, buyer.token, { 'Idempotency-Key': idempotencyKey });
  let orderId;
  if (checkout.status === 200) {
    orderId = checkout.body.data.id;
    if (checkout.body.data.idempotent_replay) {
      stats.ordersReplayed += 1;
      log(`  [REPLAYED] order "${order.key}" -> ${orderId}`);
    } else {
      stats.ordersCreated += 1;
      log(`  [CREATED] order "${order.key}" -> ${orderId}`);
    }
  } else if (checkout.body?.error?.code === 'CHECKOUT_IDEMPOTENCY_CONFLICT') {
    // This exact order already exists from an earlier run whose checkout
    // payload had different display-only fields (e.g. an earlier buyer
    // display name/address) — the atomic RPC correctly refuses to replay a
    // reused idempotency key against changed content. Resolve the real
    // order id from the idempotency record itself (never guessed) and
    // patch only cosmetic, non-financial display fields directly — never
    // order_items, snapshots, totals, or inventory.
    const { data: idem, error: idemErr } = await supabaseAdmin
      .from('checkout_idempotency')
      .select('order_id')
      .eq('buyer_id', buyer.id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (idemErr) throw idemErr;
    if (!idem?.order_id) throw new Error(`Could not resolve existing order id for "${order.key}" from checkout_idempotency.`);
    orderId = idem.order_id;
    const { data: currentOrder } = await supabaseAdmin
      .from('orders').select('customer_name, customer_email, customer_phone, shipping_address, city, notes').eq('id', orderId).maybeSingle();
    const alreadyCurrent = currentOrder
      && currentOrder.customer_name === payload.customer.name
      && currentOrder.customer_email === payload.customer.email
      && currentOrder.customer_phone === payload.customer.phone
      && currentOrder.shipping_address === payload.customer.address
      && currentOrder.city === payload.customer.city
      && currentOrder.notes === payload.notes;
    if (alreadyCurrent) {
      stats.ordersReplayed += 1;
      log(`  [EXISTS] order "${order.key}" -> ${orderId}`);
    } else {
      await supabaseAdmin.from('orders').update({
        customer_name: payload.customer.name,
        customer_email: payload.customer.email,
        customer_phone: payload.customer.phone,
        shipping_address: payload.customer.address,
        city: payload.customer.city,
        notes: payload.notes,
      }).eq('id', orderId);
      stats.ordersReplayed += 1;
      log(`  [DISPLAY FIELDS UPDATED] order "${order.key}" -> ${orderId}`);
    }
  } else {
    throw new Error(`Checkout failed for order "${order.key}": ${checkout.status} ${JSON.stringify(checkout.body)}`);
  }

  if (order.outcome === 'cancelled') {
    const cancel = await api('POST', `/api/orders/${orderId}/cancel`, undefined, buyer.token);
    if (cancel.status !== 200) {
      throw new Error(`Cancel failed for order "${order.key}": ${cancel.status} ${JSON.stringify(cancel.body)}`);
    }
    log(`  [CANCELLED] order "${order.key}"`);
    return;
  }

  const { data: items, error } = await supabaseAdmin
    .from('order_items')
    .select('id, seller_id, fulfillment_status')
    .eq('order_id', orderId)
    .order('id', { ascending: true });
  if (error) throw error;

  const tokenBySellerId = new Map(Object.values(sellers).map((s) => [s.id, s.token]));
  for (const item of items) {
    const sellerToken = tokenBySellerId.get(item.seller_id);
    if (!sellerToken) throw new Error(`No demo seller token available for order item ${item.id} (seller ${item.seller_id})`);
    await driveItemToCompleted(sellerToken, item);
  }
  log(`  [FULFILLED] order "${order.key}" — all items driven to completed`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  try {
    if (!isSupabaseAdminConfigured()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in backend/.env to run this seeder.');
    if (!DRY) await requireHealth();

    log(`\nStyleHub Phase 15 sustainability seeder — mode: ${MODE.toUpperCase()}`);
    log(`API base: ${API_BASE}\n`);

    log('== Legacy naming migration ==');
    await migrateLegacyIdentities();

    log('\n== Accounts ==');
    const sellers = {};
    for (const seller of DEMO_SELLERS) sellers[seller.key] = { ...await ensureAccount(seller), location: seller.location };
    const buyer = { ...await ensureAccount(DEMO_BUYER), location: DEMO_BUYER.location };

    log('\n== Listings ==');
    const listingIds = {};
    const listingsByKey = {};
    for (const listing of DEMO_LISTINGS) {
      listingsByKey[listing.key] = listing;
      const result = await ensureListing(listing, sellers);
      if (result && result.id) listingIds[listing.key] = result.id;
    }

    log('\n== Orders ==');
    if (!DRY) {
      for (const order of DEMO_ORDERS) {
        await ensureOrder(order, buyer, sellers, listingIds, listingsByKey);
      }
    } else {
      for (const order of DEMO_ORDERS) log(`  [WOULD CREATE/REPLAY] order "${order.key}" (outcome=${order.outcome})`);
    }

    log('\n== Summary ==');
    log(JSON.stringify(stats, null, 2));

    if (!DRY && SHOW_CREDENTIALS) {
      log('\n== Demo account credentials (derived, not stored anywhere — copy now) ==');
      for (const account of DEMO_ACCOUNTS) {
        log(`  ${account.email}  /  ${deriveDemoPassword(account.username)}`);
      }
      log('These are deterministically derived from STYLEHUB_AUTH_SECRET and are never written to any file.');
    }

    log(DRY ? '\nDry run complete — no writes performed.' : '\nApply complete.');
  } catch (err) {
    console.error('\nSEEDER ERROR:', err.message || err);
    process.exitCode = 1;
  }
})();
