const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const conversationService = require('../services/conversationService');
const { authenticateUser } = require('../middleware/auth');
const { success, error: sendError } = require('../utils/apiResponse');

// Simple rate limiter for messaging
const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP/user to 30 requests per windowMs
  message: 'Bạn đang gửi tin nhắn quá nhanh, vui lòng chờ một lát.',
  standardHeaders: true,
  legacyHeaders: false,
});

const reportRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Bạn đã đạt giới hạn báo cáo, vui lòng thử lại sau.',
  standardHeaders: true,
  legacyHeaders: false,
});

// List conversations
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data, meta } = await conversationService.listMyConversations(req.user.id, req.query);
    return success(res, data, meta);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 503, 'Hệ thống chưa được cấu hình.');
    }
    console.error(`Error listing conversations for user ${req.user.id}:`, err);
    return sendError(res, 500, 'Không thể tải danh sách cuộc trò chuyện.', err.message);
  }
});

// Create/Get order conversation
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return sendError(res, 422, 'Vui lòng cung cấp mã đơn hàng.');
    }
    const conversationId = await conversationService.getOrCreateOrderConversation(req.user.id, order_id);
    return success(res, { id: conversationId });
  } catch (err) {
    if (err instanceof conversationService.ConversationError) {
      return sendError(res, err.status, err.message);
    }
    if (err.code === '22P02') {
      return sendError(res, 422, 'Mã đơn hàng không hợp lệ.');
    }
    console.error(`Error creating conversation for order ${req.body?.order_id}:`, err);
    return sendError(res, 500, 'Không thể tạo cuộc trò chuyện.', err.message);
  }
});

// Get conversation details
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const conv = await conversationService.getConversation(req.user.id, req.params.id);
    if (!conv) {
      return sendError(res, 404, 'Không tìm thấy cuộc trò chuyện.');
    }
    return success(res, conv);
  } catch (err) {
    console.error(`Error fetching conversation ${req.params.id}:`, err);
    return sendError(res, 500, 'Không thể tải thông tin cuộc trò chuyện.', err.message);
  }
});

// List messages
router.get('/:id/messages', authenticateUser, async (req, res) => {
  try {
    const { data, meta } = await conversationService.listMessages(req.user.id, req.params.id, req.query);
    return success(res, data, meta);
  } catch (err) {
    if (err instanceof conversationService.ConversationError) {
      return sendError(res, err.status, err.message);
    }
    console.error(`Error listing messages for conv ${req.params.id}:`, err);
    return sendError(res, 500, 'Không thể tải tin nhắn.', err.message);
  }
});

// Send message
router.post('/:id/messages', authenticateUser, messageRateLimit, async (req, res) => {
  try {
    const { body } = req.body;
    const msg = await conversationService.sendMessage(req.user.id, req.params.id, body);
    return success(res, msg);
  } catch (err) {
    if (err instanceof conversationService.ConversationError) {
      return sendError(res, err.status, err.message);
    }
    if (err.code === '22P02') {
      return sendError(res, 404, 'Không tìm thấy cuộc trò chuyện.');
    }
    console.error(`Error sending message in conv ${req.params.id}:`, err);
    return sendError(res, 500, 'Không thể gửi tin nhắn.', err.message);
  }
});

// Mark conversation read
router.patch('/:id/read', authenticateUser, async (req, res) => {
  try {
    await conversationService.markConversationRead(req.user.id, req.params.id);
    return success(res, { message: 'Đã đánh dấu đã đọc' });
  } catch (err) {
    if (err instanceof conversationService.ConversationError) {
      return sendError(res, err.status, err.message);
    }
    console.error(`Error marking conv read ${req.params.id}:`, err);
    return sendError(res, 500, 'Không thể cập nhật trạng thái đã đọc.', err.message);
  }
});

// Report message (Note: mounted at /messages/:id/report instead of /conversations/:id)
// We'll handle this in the same router but use the message ID as param.
// The route path in server.js will be /api/conversations, so this would be /api/conversations/messages/:id/report
// which is a bit weird. Let's make it a separate route file or just mount it cleanly.
// For simplicity, we can mount an extra express router or handle it here.
// Let's create a separate messages route for this.
// Wait, the prompt says POST /api/messages/:id/report. I will create routes/messages.js.

module.exports = router;