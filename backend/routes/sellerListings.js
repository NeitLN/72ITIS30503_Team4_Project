const express = require('express');
const router = express.Router();
const multer = require('multer');
const sellerListingService = require('../services/sellerListingService');
const listingService = require('../services/listingService');
const { authenticateUser, requireAuth } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: listingService.MAX_IMAGE_BYTES, files: listingService.MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (!listingService.ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
    cb(null, true);
  },
});

function handleUploadErrors(uploadErr, res) {
  if (uploadErr.message === 'UNSUPPORTED_FILE_TYPE') {
    return error(res, 422, 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.', { images: 'Định dạng ảnh không được hỗ trợ.' });
  }
  if (uploadErr.code === 'LIMIT_FILE_SIZE') {
    return error(res, 422, 'Một hoặc nhiều ảnh vượt quá giới hạn 5MB.', { images: 'Ảnh quá lớn.' });
  }
  if (uploadErr.code === 'LIMIT_FILE_COUNT' || uploadErr.code === 'LIMIT_UNEXPECTED_FILE') {
    return error(res, 422, `Chỉ được đăng tối đa ${listingService.MAX_IMAGES} ảnh.`, { images: 'Quá nhiều ảnh.' });
  }
  console.error('Seller listing upload middleware error:', uploadErr);
  return error(res, 400, 'Không thể xử lý tệp đã tải lên.');
}

function handleServiceError(err, res, fallback) {
  if (err.status) return error(res, err.status, err.message, err.fieldErrors);
  console.error(fallback, err);
  return error(res, 500, 'Đã xảy ra lỗi hệ thống.');
}

router.use(authenticateUser, requireAuth);

// GET /api/seller/listings
router.get('/', async (req, res) => {
  try {
    const result = await sellerListingService.listMyListings(req.user.id, req.query);
    return success(res, result.data, result.meta);
  } catch (err) {
    return handleServiceError(err, res, 'List my listings error:');
  }
});

// GET /api/seller/listings/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await sellerListingService.getMyListingStats(req.user.id);
    return success(res, stats);
  } catch (err) {
    return handleServiceError(err, res, 'Get my listing stats error:');
  }
});

// GET /api/seller/listings/:id
router.get('/:id', async (req, res) => {
  try {
    const listing = await sellerListingService.getMyListingById(req.user.id, req.params.id);
    return success(res, listing);
  } catch (err) {
    return handleServiceError(err, res, `Get my listing ${req.params.id} error:`);
  }
});

// PATCH /api/seller/listings/:id — field edits only, never status or images.
router.patch('/:id', async (req, res) => {
  try {
    const listing = await sellerListingService.updateMyListing(req.user.id, req.params.id, req.body || {});
    return success(res, listing);
  } catch (err) {
    return handleServiceError(err, res, `Update my listing ${req.params.id} error:`);
  }
});

// POST /api/seller/listings/:id/status — the only way to change visibility.
router.post('/:id/status', async (req, res) => {
  try {
    const listing = await sellerListingService.transitionStatus(req.user.id, req.params.id, req.body?.status);
    return success(res, listing);
  } catch (err) {
    return handleServiceError(err, res, `Transition status for listing ${req.params.id} error:`);
  }
});

// POST /api/seller/listings/:id/images
router.post('/:id/images', (req, res) => {
  upload.array('images', listingService.MAX_IMAGES)(req, res, async (uploadErr) => {
    if (uploadErr) return handleUploadErrors(uploadErr, res);
    try {
      const listing = await sellerListingService.addImages(req.user.id, req.params.id, req.files);
      return success(res, listing);
    } catch (err) {
      return handleServiceError(err, res, `Add images to listing ${req.params.id} error:`);
    }
  });
});

// PATCH /api/seller/listings/:id/images/reorder
router.patch('/:id/images/reorder', async (req, res) => {
  try {
    const listing = await sellerListingService.reorderImages(req.user.id, req.params.id, req.body?.imageIds);
    return success(res, listing);
  } catch (err) {
    return handleServiceError(err, res, `Reorder images for listing ${req.params.id} error:`);
  }
});

// DELETE /api/seller/listings/:id/images/:imageId
router.delete('/:id/images/:imageId', async (req, res) => {
  try {
    const listing = await sellerListingService.removeImage(req.user.id, req.params.id, req.params.imageId);
    return success(res, listing);
  } catch (err) {
    return handleServiceError(err, res, `Remove image from listing ${req.params.id} error:`);
  }
});

module.exports = router;
