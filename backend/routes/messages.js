const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const conversationService = require('../services/conversationService');
const { authenticateUser, requireAuth } = require('../middleware/auth');
const { success, error: sendError } = require('../utils/apiResponse');

router.use(authenticateUser, requireAuth);

const reportRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    error: {
      message: 'Bạn đã đạt giới hạn báo cáo, vui lòng thử lại sau.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id
});

// Report message
router.post('/:id/report', reportRateLimit, async (req, res) => {
  try {
    const { reason } = req.body;
    await conversationService.reportMessage(req.user.id, req.params.id, reason);
    return success(res, { message: 'Đã gửi báo cáo.' });
  } catch (err) {
    if (err instanceof conversationService.ConversationError) {
      return sendError(res, err.status, err.message);
    }
    console.error(`Error reporting message ${req.params.id}:`, err);
    return sendError(res, 500, 'Không thể gửi báo cáo.', err.message);
  }
});

module.exports = router;