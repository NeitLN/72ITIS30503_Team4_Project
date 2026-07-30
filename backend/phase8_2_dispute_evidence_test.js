/**
 * Phase 8.2 — private dispute evidence storage.
 *
 * Integration test — calls disputeEvidenceService functions directly (the
 * same trust boundary routes/disputeEvidence.js already enforces: userId is
 * always the authenticated caller's id, never client input) against real,
 * disposable database rows and real (tiny) Storage objects in the private
 * `dispute-evidence` bucket. Everything this test creates is deleted again
 * in a `finally` block; nothing here mutates or reads any real user's data.
 *
 * Requires SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY to point at a disposable
 * local Supabase instance with the `dispute-evidence` bucket already created
 * (see scripts/setupDisputeEvidenceBucket.js) and migrations applied through
 * 20260729010000. Never point this at the live/remote project.
 */
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { supabaseAdmin } = require('./lib/supabase');
const disputeEvidenceService = require('./services/disputeEvidenceService');

const BUCKET = disputeEvidenceService.BUCKET;
const run = `p82de${Date.now().toString(36)}`;
const checks = [];

function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function expectError(fn) {
  try {
    await fn();
    return { threw: false };
  } catch (err) {
    return { threw: true, err };
  }
}

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function makeFile({ mimetype = 'image/png', buffer = TINY_PNG, size } = {}) {
  return { mimetype, buffer, size: size ?? buffer.length };
}

async function createUser(label, role = 'customer') {
  const row = {
    id: crypto.randomUUID(),
    email: `${run}-${label}@stylehub.invalid`,
    full_name: `Phase8.2 QA ${label}`,
    username: `p82_${label.replace(/-/g, '_')}_${crypto.randomBytes(3).toString('hex')}`,
    password_hash: 'phase8.2-local-test-only',
    role,
  };
  const { data, error } = await supabaseAdmin.from('users').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

async function storageObjectExists(path) {
  const dir = path.split('/').slice(0, -1).join('/');
  const fileName = path.split('/').pop();
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(dir, { search: fileName });
  if (error) return false;
  return (data || []).some((f) => f.name === fileName);
}

async function listDisputeObjects(disputeId, role) {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(`disputes/${disputeId}/${role}`);
  if (error) return [];
  return data || [];
}

(async () => {
  const buyer = await createUser('buyer', 'customer');
  const seller = await createUser('seller', 'seller');
  const unrelated = await createUser('unrelated', 'customer');
  const admin = await createUser('admin', 'admin');
  const cleanupUserIds = [buyer, seller, unrelated, admin];
  const cleanupOrderIds = [];
  const cleanupItemIds = [];
  const cleanupDisputeIds = [];

  try {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders').insert({ user_id: buyer, status: 'completed', payment_status: 'paid', subtotal: 100, total: 100 })
      .select('id').single();
    if (orderErr) throw orderErr;
    cleanupOrderIds.push(order.id);

    const { data: item, error: itemErr } = await supabaseAdmin
      .from('order_items')
      .insert({ order_id: order.id, seller_id: seller, product_name: 'Phase8.2 item', quantity: 1, unit_price: 100, fulfillment_status: 'completed' })
      .select('id').single();
    if (itemErr) throw itemErr;
    cleanupItemIds.push(item.id);

    const { data: dispute, error: disputeErr } = await supabaseAdmin.rpc('stylehub_create_dispute', {
      p_buyer_id: buyer,
      p_order_item_id: item.id,
      p_reason: 'Phase8.2 evidence test dispute',
    });
    if (disputeErr) throw disputeErr;
    cleanupDisputeIds.push(dispute.id);

    // ---- Valid image upload ----
    const upload1 = await disputeEvidenceService.uploadEvidence(buyer, dispute.id, [makeFile()]);
    check('Valid image upload succeeds', upload1.role === 'buyer' && upload1.addedCount === 1);
    const buyerObjectsAfter1 = await listDisputeObjects(dispute.id, 'buyer');
    check('Uploaded object actually exists in the private bucket', buyerObjectsAfter1.length === 1);

    // ---- Invalid MIME rejected ----
    const badMime = await expectError(() => disputeEvidenceService.uploadEvidence(buyer, dispute.id, [makeFile({ mimetype: 'application/pdf' })]));
    check('Invalid MIME type rejected', badMime.threw && badMime.err.status === 422);

    // ---- Oversized file rejected ----
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 1);
    const oversized = await expectError(() => disputeEvidenceService.uploadEvidence(buyer, dispute.id, [makeFile({ buffer: bigBuffer, size: bigBuffer.length })]));
    check('Oversized file (>5MB) rejected', oversized.threw && oversized.err.status === 422);

    // ---- Cumulative sixth file rejected across separate calls ----
    await disputeEvidenceService.uploadEvidence(buyer, dispute.id, [makeFile(), makeFile(), makeFile()]);
    // buyer now has 1 (first) + 3 = 4
    const sixthAttempt = await expectError(() => disputeEvidenceService.uploadEvidence(buyer, dispute.id, [makeFile(), makeFile()]));
    // 4 existing + 2 new = 6 > 5, must reject before ever touching storage
    check('Sixth cumulative file across separate requests rejected', sixthAttempt.threw && sixthAttempt.err.status === 422);
    const buyerObjectsAfterCap = await listDisputeObjects(dispute.id, 'buyer');
    check('Rejected over-cap attempt uploaded nothing extra (still 4 objects)', buyerObjectsAfterCap.length === 4);

    // ---- Buyer/seller isolation: seller's own upload lands in seller_evidence, separate storage prefix ----
    const sellerUpload = await disputeEvidenceService.uploadEvidence(seller, dispute.id, [makeFile()]);
    check('Seller upload recorded under seller role', sellerUpload.role === 'seller' && sellerUpload.addedCount === 1);
    const sellerObjects = await listDisputeObjects(dispute.id, 'seller');
    check('Seller evidence stored under its own disputes/<id>/seller/ prefix, isolated from buyer/', sellerObjects.length === 1);

    // ---- Unrelated user cannot upload ----
    const unrelatedUpload = await expectError(() => disputeEvidenceService.uploadEvidence(unrelated, dispute.id, [makeFile()]));
    check('Unrelated user cannot upload evidence (403)', unrelatedUpload.threw && unrelatedUpload.err.status === 403);

    // ---- Duplicate path rejected at the append-RPC layer (race-condition defense) ----
    const { data: currentRow } = await supabaseAdmin.from('disputes').select('buyer_evidence').eq('id', dispute.id).single();
    const existingPath = currentRow.buyer_evidence[0];
    const dupRpc = await expectError(() => supabaseAdmin.rpc('stylehub_append_dispute_evidence', {
      p_dispute_id: dispute.id, p_actor_role: 'buyer', p_paths: [existingPath],
    }).then(({ error }) => { if (error) throw error; }));
    check('Append-RPC rejects re-adding an already-present evidence path (duplicate)', dupRpc.threw);

    // ---- Signed URL authorization ----
    const buyerView = await disputeEvidenceService.getEvidence(buyer, dispute.id, false);
    const sellerView = await disputeEvidenceService.getEvidence(seller, dispute.id, false);
    const adminView = await disputeEvidenceService.getEvidence(admin, dispute.id, true);
    check('Buyer can view signed evidence URLs (own + seller side)', buyerView.buyerEvidence.length === 4 && buyerView.sellerEvidence.length === 1);
    check('Seller can view signed evidence URLs (own + buyer side)', sellerView.buyerEvidence.length === 4 && sellerView.sellerEvidence.length === 1);
    check('Admin can view signed evidence URLs with raw paths included', adminView.buyerEvidence.every((e) => typeof e.path === 'string') && adminView.buyerEvidence[0].url.includes('token='));
    check('Non-admin DTOs never leak raw storage paths', buyerView.buyerEvidence.every((e) => e.path === undefined));

    const unrelatedView = await expectError(() => disputeEvidenceService.getEvidence(unrelated, dispute.id, false));
    check('Unrelated user denied read access to evidence (403)', unrelatedView.threw && unrelatedView.err.status === 403);

    // ---- Rollback on partial failure (Storage upload succeeds, DB append fails) ----
    const originalRpc = supabaseAdmin.rpc.bind(supabaseAdmin);
    let rpcCallCount = 0;
    supabaseAdmin.rpc = (fn, args) => {
      if (fn === 'stylehub_append_dispute_evidence') {
        rpcCallCount += 1;
        return Promise.resolve({ data: null, error: { message: 'forced failure for rollback test' } });
      }
      return originalRpc(fn, args);
    };
    const beforeRollbackObjects = await listDisputeObjects(dispute.id, 'seller');
    const forcedFailure = await expectError(() => disputeEvidenceService.uploadEvidence(seller, dispute.id, [makeFile()]));
    supabaseAdmin.rpc = originalRpc;
    check('Forced DB append failure surfaces as an error to the caller', forcedFailure.threw && rpcCallCount === 1);
    const afterRollbackObjects = await listDisputeObjects(dispute.id, 'seller');
    check('Storage object uploaded during a failed append is rolled back (no orphan)', afterRollbackObjects.length === beforeRollbackObjects.length);

    // ---- Terminal dispute rejects further evidence ----
    await supabaseAdmin.from('disputes').update({
      status: 'approved', resolved_at: new Date().toISOString(), resolved_by: admin,
      resolution_type: 'refund', resolution_reason: 'Phase8.2 QA closeout',
    }).eq('id', dispute.id);
    const terminalUpload = await expectError(() => disputeEvidenceService.uploadEvidence(buyer, dispute.id, [makeFile()]));
    check('Evidence upload rejected once dispute is terminal', terminalUpload.threw && terminalUpload.err.status === 409);
  } finally {
    // Exact cleanup, most-dependent rows first (RESTRICT/NO ACTION FKs).
    try {
      const allObjects = [
        ...(await listDisputeObjects(cleanupDisputeIds[0] || '__none__', 'buyer')).map((f) => `disputes/${cleanupDisputeIds[0]}/buyer/${f.name}`),
        ...(await listDisputeObjects(cleanupDisputeIds[0] || '__none__', 'seller')).map((f) => `disputes/${cleanupDisputeIds[0]}/seller/${f.name}`),
      ];
      if (allObjects.length) await supabaseAdmin.storage.from(BUCKET).remove(allObjects);
    } catch (cleanupErr) { console.error('cleanup: storage remove failed', cleanupErr); }
    try {
      if (cleanupDisputeIds.length) await supabaseAdmin.from('dispute_events').delete().in('dispute_id', cleanupDisputeIds);
    } catch (cleanupErr) { console.error('cleanup: dispute_events delete failed', cleanupErr); }
    try {
      if (cleanupDisputeIds.length) await supabaseAdmin.from('disputes').delete().in('id', cleanupDisputeIds);
    } catch (cleanupErr) { console.error('cleanup: disputes delete failed', cleanupErr); }
    try {
      if (cleanupItemIds.length) await supabaseAdmin.from('order_items').delete().in('id', cleanupItemIds);
    } catch (cleanupErr) { console.error('cleanup: order_items delete failed', cleanupErr); }
    try {
      if (cleanupOrderIds.length) await supabaseAdmin.from('orders').delete().in('id', cleanupOrderIds);
    } catch (cleanupErr) { console.error('cleanup: orders delete failed', cleanupErr); }
    try {
      await supabaseAdmin.from('users').delete().in('id', cleanupUserIds);
    } catch (cleanupErr) { console.error('cleanup: users delete failed', cleanupErr); }
  }

  console.log(`\nPHASE8.2 DISPUTE EVIDENCE TEST SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
  if (checks.some((v) => !v)) process.exitCode = 1;
})().catch((err) => {
  console.error('PHASE8.2 DISPUTE EVIDENCE TEST ERROR:', err);
  process.exitCode = 1;
});
