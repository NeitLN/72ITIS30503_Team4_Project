const express = require('express');
const router = express.Router();
const multer = require('multer');
const profileService = require('../services/profileService');
const impactService = require('../services/impactService');
const { authenticateUser, requireAuth } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: profileService.MAX_AVATAR_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!profileService.ALLOWED_AVATAR_MIME.has(file.mimetype)) {
      return cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
    cb(null, true);
  },
});

router.use(authenticateUser);

// Identity is taken exclusively from the verified token. Query/body user IDs
// are intentionally ignored so this private aggregate cannot be spoofed.
router.get('/me/impact', requireAuth, async (req, res) => {
  try {
    return success(res, await impactService.getProfileImpact(req.user.id));
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') return error(res, 503, 'Hệ thống chưa được cấu hình.');
    console.error('Get my circular impact error:', err);
    return error(res, 500, 'Không thể tải dữ liệu tác động của bạn.');
  }
});

// GET /api/profile/me — the authenticated user's own editable profile.
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await profileService.getMyProfile(req.user.id);
    return success(res, profile);
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    console.error('Get my profile error:', err);
    return error(res, 500, 'Không thể tải hồ sơ.');
  }
});

// PATCH /api/profile/me — updates only display_name/username/bio/location.
// id/role/email/password/is_verified/rating/created_at in the body are
// never read — see services/profileService.js.
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const profile = await profileService.updateMyProfile(req.user.id, req.body || {});
    return success(res, profile);
  } catch (err) {
    if (err instanceof profileService.ProfileValidationError) {
      return error(res, err.status, err.message, err.fieldErrors);
    }
    if (err.status) return error(res, err.status, err.message, err.fieldErrors);
    console.error('Update my profile error:', err);
    return error(res, 500, 'Không thể cập nhật hồ sơ.');
  }
});

// POST /api/profile/me/avatar — single-file multipart upload.
router.post('/me/avatar', requireAuth, (req, res) => {
  upload.single('avatar')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.message === 'UNSUPPORTED_FILE_TYPE') {
        return error(res, 422, 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.', { avatar: 'Định dạng ảnh không được hỗ trợ.' });
      }
      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return error(res, 422, 'Ảnh vượt quá giới hạn 5MB.', { avatar: 'Ảnh quá lớn.' });
      }
      if (uploadErr.code === 'LIMIT_UNEXPECTED_FILE' || uploadErr.code === 'LIMIT_FILE_COUNT') {
        return error(res, 422, 'Chỉ được chọn một ảnh đại diện.', { avatar: 'Chỉ được chọn một ảnh.' });
      }
      console.error('Avatar upload middleware error:', uploadErr);
      return error(res, 400, 'Không thể xử lý tệp đã tải lên.');
    }

    try {
      const profile = await profileService.uploadAvatar(req.user.id, req.file);
      return success(res, profile);
    } catch (err) {
      if (err.status) return error(res, err.status, err.message, err.fieldErrors);
      console.error('Avatar upload error:', err);
      return error(res, 500, 'Không thể tải lên ảnh đại diện.');
    }
  });
});

module.exports = router;
