/**
 * Phase 8.2 — private dispute evidence upload/read routes.
 * Mounted at /api/disputes alongside the (Phase 8.3) disputes router.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const disputeEvidenceService = require('../services/disputeEvidenceService');
const { authenticateUser, requireAuth } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: disputeEvidenceService.MAX_BYTES, files: disputeEvidenceService.MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (!disputeEvidenceService.ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
    cb(null, true);
  },
});

function handleUploadErrors(uploadErr, res) {
  if (uploadErr.message === 'UNSUPPORTED_FILE_TYPE') {
    return error(res, 422, 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.', { evidence: 'Định dạng ảnh không được hỗ trợ.' });
  }
  if (uploadErr.code === 'LIMIT_FILE_SIZE') {
    return error(res, 422, 'Một hoặc nhiều tệp vượt quá giới hạn 5MB.', { evidence: 'Tệp quá lớn.' });
  }
  if (uploadErr.code === 'LIMIT_FILE_COUNT' || uploadErr.code === 'LIMIT_UNEXPECTED_FILE') {
    return error(res, 422, `Chỉ được tải tối đa ${disputeEvidenceService.MAX_FILES} tệp minh chứng.`, { evidence: 'Quá nhiều tệp.' });
  }
  console.error('Dispute evidence upload middleware error:', uploadErr);
  return error(res, 400, 'Không thể xử lý tệp đã tải lên.');
}

function handleServiceError(err, res, fallback) {
  if (err.status) return error(res, err.status, err.message, err.fieldErrors);
  console.error(fallback, err);
  return error(res, 500, 'Đã xảy ra lỗi hệ thống.');
}

router.use(authenticateUser, requireAuth);

// POST /api/disputes/:disputeId/evidence
router.post('/:disputeId/evidence', (req, res) => {
  upload.array('evidence', disputeEvidenceService.MAX_FILES)(req, res, async (uploadErr) => {
    if (uploadErr) return handleUploadErrors(uploadErr, res);
    try {
      const result = await disputeEvidenceService.uploadEvidence(req.user.id, req.params.disputeId, req.files);
      return success(res, result);
    } catch (err) {
      return handleServiceError(err, res, `Upload evidence for dispute ${req.params.disputeId} error:`);
    }
  });
});

// GET /api/disputes/:disputeId/evidence
router.get('/:disputeId/evidence', async (req, res) => {
  try {
    const result = await disputeEvidenceService.getEvidence(req.user.id, req.params.disputeId, req.user.role === 'admin');
    return success(res, result);
  } catch (err) {
    return handleServiceError(err, res, `Get evidence for dispute ${req.params.disputeId} error:`);
  }
});

module.exports = router;
