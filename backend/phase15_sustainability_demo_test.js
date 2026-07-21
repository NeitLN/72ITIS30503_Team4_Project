/**
 * Phase 15 — sustainability demo dataset + deployment-readiness regression
 * suite. Unlike Phase 11-14's disposable per-run fixtures, Phase 15's demo
 * dataset is meant to be RETAINED in the development database for the
 * lecturer demo, so this suite does not create-then-delete its own users —
 * it drives the real seeder/validator/cleanup-dry-run scripts (the exact
 * commands documented in docs/sustainability-demo-data.md) as child
 * processes and asserts on their exit codes plus the resulting database
 * state. It never performs a real (non-dry-run) cleanup.
 *
 * Requires the backend running at PHASE15_API_BASE (default
 * http://127.0.0.1:8080) and backend/.env configured.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: [path.join(__dirname, '.env'), path.join(__dirname, '../.env')], quiet: true });

const { supabaseAdmin, isSupabaseAdminConfigured } = require('./lib/supabase');
const { NAMESPACE, DEMO_SELLERS, DEMO_LISTINGS, DEMO_ACCOUNTS } = require('./data/sustainabilityDemoCatalog');
const { CIRCULAR_LIFECYCLE_TYPES } = require('./constants/sustainability');

const FORBIDDEN_WORDING_RE = /\b(demo|test|sample)\b/i;
function findForbiddenWording(rows, fields) {
  const hits = [];
  for (const row of rows) {
    for (const field of fields) {
      const value = row[field];
      if (typeof value === 'string' && FORBIDDEN_WORDING_RE.test(value)) {
        hits.push(`${row.id || row.email || '?'}.${field}: "${value.slice(0, 80)}"`);
      }
    }
  }
  return hits;
}

const API_BASE = process.env.PHASE15_API_BASE || 'http://127.0.0.1:8080';
const checks = [];
function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}
async function api(method, pathname, payload, token) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}
function runScript(relativePath, args) {
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, relativePath), ...args], {
      cwd: __dirname,
      encoding: 'utf8',
      env: process.env,
    });
    return { code: 0, out };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}
async function countRows(table, filters) {
  let q = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
  for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
  const { count, error } = await q;
  if (error) throw error;
  return count;
}
function deriveDemoPassword(username) {
  const crypto = require('crypto');
  const secret = process.env.STYLEHUB_AUTH_SECRET;
  const digest = crypto.createHmac('sha256', secret).update(`stylehub-phase15-demo-password:${username}`).digest('base64url');
  return `Ph15-${digest.slice(0, 24)}!`;
}

(async () => {
  try {
    if (!isSupabaseAdminConfigured()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in backend/.env.');
    const health = await api('GET', '/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);

    // ---- Preconditions: the retained Phase 15 dataset already exists ----
    const before = {
      users: await countRows('users', {}).catch(() => null),
      seed: await countRows('products', { listing_source: 'seed' }),
      demoProducts: await countRows('products', { listing_source: 'user' }).catch(() => null),
    };

    // ---- 1. Dry-run changes nothing ----
    const dryRun1 = runScript('scripts/seedSustainabilityDemo.js', ['--dry-run']);
    check('Seeder dry-run exits 0', dryRun1.code === 0, dryRun1.out.slice(-400));
    const afterDry = { seed: await countRows('products', { listing_source: 'seed' }) };
    check('Dry-run does not change seed catalog count', afterDry.seed === before.seed);

    // ---- 2. Second apply is idempotent (this suite assumes --apply has
    // already been run at least once as part of the documented Phase 15
    // workflow; running it again here proves zero duplicates / zero
    // unintended updates without requiring this test to be first) ----
    const apply2 = runScript('scripts/seedSustainabilityDemo.js', ['--apply']);
    check('Seeder apply exits 0', apply2.code === 0, apply2.out.slice(-400));
    const summaryMatch = apply2.out.match(/\{\s*"accountsCreated"[\s\S]*?"ordersReplayed"[\s\S]*?\}/);
    const summary = summaryMatch ? JSON.parse(summaryMatch[0]) : null;
    check('Rerunning --apply creates zero new accounts', summary && summary.accountsCreated === 0, JSON.stringify(summary));
    check('Rerunning --apply creates zero new listings', summary && summary.listingsCreated === 0, JSON.stringify(summary));
    check('Rerunning --apply creates zero new orders (idempotent replay instead)', summary && summary.ordersCreated === 0 && summary.ordersReplayed >= 1, JSON.stringify(summary));

    // ---- 3. Validator passes cleanly ----
    const validate = runScript('scripts/validateSustainabilityDemo.js', []);
    check('Validator script exits 0 (all Phase 15 dataset checks pass)', validate.code === 0, validate.out.slice(-800));

    // ---- 4. Namespace + honesty checks on the resolved dataset ----
    const managedEmails = DEMO_ACCOUNTS.map((a) => a.email);
    const { data: demoUsers, error: usersErr } = await supabaseAdmin
      .from('users').select('id, email, role, username, full_name, bio').in('email', managedEmails);
    if (usersErr) throw usersErr;
    check('Exactly the manifest accounts exist', demoUsers.length === DEMO_ACCOUNTS.length, `found=${demoUsers.length}`);
    check('Every account email is on the reserved example.test domain', demoUsers.every((u) => u.email.endsWith(`@${NAMESPACE.EMAIL_DOMAIN}`)));
    const userWordingHits = findForbiddenWording(demoUsers, ['username', 'full_name', 'bio']);
    check('No account username/display name/bio contains demo/test/sample wording', userWordingHits.length === 0, userWordingHits.join(' | '));

    const demoUserIds = demoUsers.map((u) => u.id);
    const { data: demoProducts, error: prodErr } = await supabaseAdmin
      .from('products').select('id, name, description, slug, seller_id, status, stock, listing_source').in('seller_id', demoUserIds).eq('listing_source', 'user');
    if (prodErr) throw prodErr;
    check('Exactly the manifest listings exist', demoProducts.length === DEMO_LISTINGS.length, `found=${demoProducts.length}`);
    check('No listing has negative stock', demoProducts.every((p) => Number(p.stock) >= 0));
    const productWordingHits = findForbiddenWording(demoProducts, ['name', 'description', 'slug']);
    check('No listing name/description/slug contains demo/test/sample wording', productWordingHits.length === 0, productWordingHits.join(' | '));

    const productIds = demoProducts.map((p) => p.id);
    const { data: journeys, error: journeyErr } = await supabaseAdmin
      .from('product_sustainability').select('product_id, lifecycle_type, claim_source, material, repair_history, upcycle_details, product_story').in('product_id', productIds);
    if (journeyErr) throw journeyErr;
    check('Every Product Journey claim source is seller_declared (not verified/certified)', journeys.every((j) => j.claim_source === 'seller_declared'));
    const journeyWordingHits = findForbiddenWording(journeys.map((j) => ({ id: j.product_id, ...j })), ['material', 'repair_history', 'upcycle_details', 'product_story']);
    check('No Product Journey text contains demo/test/sample wording', journeyWordingHits.length === 0, journeyWordingHits.join(' | '));
    for (const type of CIRCULAR_LIFECYCLE_TYPES) {
      const count = journeys.filter((j) => j.lifecycle_type === type).length;
      check(`Manifest covers circular lifecycle "${type}"`, count >= 2, `count=${count}`);
    }

    // ---- 5. Orders: real checkout path, multi-seller, qty>1, cancellation exclusion ----
    const { data: demoOrders, error: ordersErr } = await supabaseAdmin
      .from('orders').select('id, user_id, notes').in('user_id', demoUserIds);
    if (ordersErr) throw ordersErr;
    check('At least one order resolved by seller/buyer relational namespace', demoOrders.length >= 1);
    const orderIds = demoOrders.map((o) => o.id);
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('order_items').select('order_id, seller_id, quantity, fulfillment_status, lifecycle_type_snapshot, claim_source_snapshot').in('order_id', orderIds);
    if (itemsErr) throw itemsErr;
    const sellersPerOrder = new Map();
    for (const item of items) {
      if (!sellersPerOrder.has(item.order_id)) sellersPerOrder.set(item.order_id, new Set());
      sellersPerOrder.get(item.order_id).add(item.seller_id);
    }
    check('At least one demo order spans 2+ sellers (multi-seller checkout)', [...sellersPerOrder.values()].some((s) => s.size >= 2));
    check('At least one demo order item has quantity > 1', items.some((i) => Number(i.quantity) > 1));
    check('At least one demo order item is completed', items.some((i) => i.fulfillment_status === 'completed'));
    check('At least one demo order item is cancelled and excluded from completion', items.some((i) => i.fulfillment_status === 'cancelled'));
    check('Every demo order item snapshot is immutably seller_declared', items.every((i) => i.claim_source_snapshot === 'seller_declared'));

    // ---- 6. Impact metrics are non-zero and internally consistent ----
    const platform = (await api('GET', '/api/sustainability/impact')).body.data;
    check('Platform active circular listings is non-zero', platform.metrics.activeCircularListings > 0, `=${platform.metrics.activeCircularListings}`);
    check('Platform completed circular units is non-zero', platform.metrics.completedCircularUnits > 0, `=${platform.metrics.completedCircularUnits}`);
    const breakdownTotal = CIRCULAR_LIFECYCLE_TYPES.reduce((sum, k) => sum + Number(platform.activeLifecycleBreakdown[k] || 0), 0);
    check('Active lifecycle breakdown sums to the active circular total', breakdownTotal === platform.metrics.activeCircularListings);
    const completedBreakdownTotal = CIRCULAR_LIFECYCLE_TYPES.reduce((sum, k) => sum + Number(platform.completedLifecycleBreakdown[k] || 0), 0);
    check('Completed lifecycle breakdown sums to the completed circular total', completedBreakdownTotal === platform.metrics.completedCircularUnits);

    // ---- 7. Seller isolation via real login (derived, never-stored password) ----
    const hanoiEmail = DEMO_SELLERS.find((s) => s.key === 'hanoi').email;
    const sellerA = demoUsers.find((u) => u.email === hanoiEmail);
    const login = await api('POST', '/api/auth/login', { email: sellerA.email, password: deriveDemoPassword(sellerA.username) });
    check('Demo seller can log in with its deterministically derived password', login.status === 200);
    if (login.status === 200) {
      const myImpact = await api('GET', '/api/profile/me/impact', undefined, login.body.data.token);
      check('Demo seller private impact only reflects its own attributed listings', myImpact.body.data.metrics.activeUserListings <= DEMO_LISTINGS.length);
    }

    // ---- 8. Cleanup dry-run resolves exactly this namespace, nothing else ----
    const cleanupDry = runScript('scripts/cleanupSustainabilityDemo.js', ['--dry-run']);
    check('Cleanup dry-run exits 0', cleanupDry.code === 0);
    check('Cleanup dry-run resolves exactly the manifest account count', new RegExp(`${DEMO_ACCOUNTS.length} users`).test(cleanupDry.out));
    check('Cleanup dry-run resolves exactly the manifest listing count', new RegExp(`${DEMO_LISTINGS.length} products`).test(cleanupDry.out));
    check('Cleanup dry-run performs no deletion (dry run only)', /Dry run only/.test(cleanupDry.out));

    // ---- 9. Protected seed catalog + disclosure copy ----
    const { count: seedAfter } = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('listing_source', 'seed');
    check('Verified seed catalog remains exactly 148 products', seedAfter === 148, `seed=${seedAfter}`);

    const sustainabilityPageSrc = fs.readFileSync(path.join(__dirname, '../frontend/app/sustainability/page.tsx'), 'utf8');
    check('Sustainability page carries the academic-transparency disclosure', /sustainability-disclosure/.test(sustainabilityPageSrc) && /coursework/i.test(sustainabilityPageSrc));
    const homeSectionSrc = fs.readFileSync(path.join(__dirname, '../frontend/components/home/CircularImpactSection.tsx'), 'utf8');
    const homeWordingHit = FORBIDDEN_WORDING_RE.test(homeSectionSrc);
    check('Homepage Circular Impact section contains no demo/test/sample wording', !homeWordingHit);

    // ---- 10. No secret values written to tracked source files ----
    const catalogSrc = fs.readFileSync(path.join(__dirname, 'data/sustainabilityDemoCatalog.js'), 'utf8');
    check('Demo catalog data file contains no password/secret literal', !/password\s*[:=]\s*['"][^'"]+['"]/i.test(catalogSrc));
    const seederSrc = fs.readFileSync(path.join(__dirname, 'scripts/seedSustainabilityDemo.js'), 'utf8');
    check('Seeder derives passwords at runtime rather than hardcoding one', /deriveDemoPassword/.test(seederSrc) && !/Ph15-[A-Za-z0-9_-]{10,}/.test(seederSrc));

    console.log(`\nPHASE15 SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((v) => !v)) process.exitCode = 1;
  } catch (err) {
    console.error('PHASE15 TEST ERROR:', err.message || err);
    process.exitCode = 1;
  }
})();
