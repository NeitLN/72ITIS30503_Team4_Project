/**
 * Phase 8.2 — private dispute evidence storage.
 *
 * Security model: the caller (routes/disputeEvidence.js) has already run
 * every request through `authenticateUser` + `requireAuth`, so `userId` here
 * is always the verified `req.user.id` — never anything from the request
 * body. Participation (buyer/seller on the target dispute) is re-derived
 * from the database on every call, never trusted from the client. All
 * Storage/DB access uses the service-role client (bypasses RLS); the
 * `dispute-evidence` bucket is private — objects are only ever reachable via
 * short-lived signed URLs issued after that participation check.
 */
const crypto = require('crypto');
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');

const BUCKET = 'dispute-evidence';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 300;

const TERMINAL_STATUSES = new Set(['approved', 'rejected', 'resolved', 'cancelled']);

class DisputeEvidenceError extends Error {
  constructor(status, message, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors || undefined;
  }
}

function checkDb() {
  if (!isSupabaseAdminConfigured()) {
    throw new DisputeEvidenceError(503, 'Hệ thống chưa được cấu hình.');
  }
}

function extFromMime(mimetype) {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'jpg';
}

function resolveRole(dispute, userId) {
  if (dispute.buyer_id === userId) return 'buyer';
  if (dispute.seller_id === userId) return 'seller';
  return null;
}

async function getDisputeRow(disputeId) {
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .select('id, buyer_id, seller_id, status, buyer_evidence, seller_evidence')
    .eq('id', disputeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new DisputeEvidenceError(404, 'Không tìm thấy khiếu nại.');
  return data;
}

function validateFile(file) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new DisputeEvidenceError(422, 'Định dạng tệp không được hỗ trợ.', { evidence: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.' });
  }
  if (!file.buffer || file.buffer.length === 0) {
    throw new DisputeEvidenceError(422, 'Tệp bị trống hoặc lỗi.', { evidence: 'Tệp bị trống hoặc lỗi.' });
  }
  if (file.size > MAX_BYTES) {
    throw new DisputeEvidenceError(422, 'Tệp quá lớn.', { evidence: 'Mỗi tệp tối đa 5MB.' });
  }
}

/**
 * Uploads 1+ evidence files for the authenticated user's own side (buyer or
 * seller) of a dispute, then atomically appends the resulting private paths
 * onto the dispute row via the service-role-only RPC. Any Storage objects
 * uploaded during a call that ultimately fails are rolled back — no orphans.
 */
async function uploadEvidence(userId, disputeId, files) {
  checkDb();
  if (!files || files.length === 0) {
    throw new DisputeEvidenceError(422, 'Vui lòng chọn ít nhất một tệp minh chứng.', { evidence: 'Vui lòng chọn ít nhất một tệp minh chứng.' });
  }

  const dispute = await getDisputeRow(disputeId);
  const role = resolveRole(dispute, userId);
  if (!role) {
    throw new DisputeEvidenceError(403, 'Bạn không có quyền truy cập khiếu nại này.');
  }
  if (TERMINAL_STATUSES.has(dispute.status)) {
    throw new DisputeEvidenceError(409, 'Khiếu nại đã kết thúc, không thể thêm minh chứng.');
  }

  const existing = role === 'buyer' ? dispute.buyer_evidence : dispute.seller_evidence;
  const existingCount = (existing || []).length;
  if (existingCount + files.length > MAX_FILES) {
    throw new DisputeEvidenceError(422, `Chỉ được tải tối đa ${MAX_FILES} tệp minh chứng.`, { evidence: `Chỉ được tải tối đa ${MAX_FILES} tệp minh chứng.` });
  }

  for (const file of files) validateFile(file);

  const uploadedPaths = [];
  try {
    for (const file of files) {
      const ext = extFromMime(file.mimetype);
      const objectPath = `disputes/${disputeId}/${role}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (upErr) throw upErr;
      uploadedPaths.push(objectPath);
    }

    const { data: updated, error: rpcErr } = await supabaseAdmin.rpc('stylehub_append_dispute_evidence', {
      p_dispute_id: disputeId,
      p_actor_role: role,
      p_paths: uploadedPaths,
    });
    if (rpcErr) throw rpcErr;

    try {
      await supabaseAdmin.from('dispute_events').insert({
        dispute_id: disputeId,
        actor_id: userId,
        actor_role: role,
        event_type: 'evidence_added',
        from_status: dispute.status,
        to_status: dispute.status,
        internal_metadata: { file_count: uploadedPaths.length },
      });
    } catch (eventErr) {
      // Audit-log failure must not undo a successfully persisted upload.
      console.error('dispute_events insert failed after evidence upload:', eventErr);
    }

    return {
      disputeId,
      role,
      addedCount: uploadedPaths.length,
      totalCount: role === 'buyer'
        ? (updated.buyer_evidence || []).length
        : (updated.seller_evidence || []).length,
    };
  } catch (err) {
    if (uploadedPaths.length) {
      await supabaseAdmin.storage.from(BUCKET).remove(uploadedPaths).catch(() => {});
    }
    if (err instanceof DisputeEvidenceError) throw err;
    console.error('Dispute evidence upload failed:', err.message || err);
    throw new DisputeEvidenceError(422, 'Không thể lưu minh chứng. Vui lòng thử lại.');
  }
}

/**
 * Returns short-lived signed URLs for a dispute's evidence, for the
 * authenticated participant (buyer or seller) or an admin. Both
 * participants can see both sides' evidence (dispute transparency); nobody
 * else gets anything back except a 403.
 */
async function getEvidence(userId, disputeId, isAdmin) {
  checkDb();
  const dispute = await getDisputeRow(disputeId);
  const role = resolveRole(dispute, userId);
  if (!role && !isAdmin) {
    throw new DisputeEvidenceError(403, 'Bạn không có quyền truy cập khiếu nại này.');
  }

  async function sign(paths) {
    const out = [];
    for (const path of paths || []) {
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error) {
        console.error('createSignedUrl failed for', path, error.message);
        continue;
      }
      const entry = { url: data.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
      if (isAdmin) entry.path = path;
      out.push(entry);
    }
    return out;
  }

  const [buyerEvidence, sellerEvidence] = await Promise.all([
    sign(dispute.buyer_evidence),
    sign(dispute.seller_evidence),
  ]);

  return { buyerEvidence, sellerEvidence };
}

module.exports = {
  BUCKET,
  ALLOWED_MIME,
  MAX_FILES,
  MAX_BYTES,
  DisputeEvidenceError,
  uploadEvidence,
  getEvidence,
};
