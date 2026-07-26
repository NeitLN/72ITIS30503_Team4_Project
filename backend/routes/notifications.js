const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { authenticateUser } = require('../middleware/auth');
const { success, error: sendError } = require('../utils/apiResponse');

// Get unread count
router.get('/unread-count', authenticateUser, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return success(res, { count });
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 503, 'Hệ thống chưa được cấu hình.');
    }
    console.error(`Error fetching unread count for user ${req.user.id}:`, err);
    return sendError(res, 500, 'Không thể tải số lượng thông báo.', err.message);
  }
});

// List notifications
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data, meta } = await notificationService.listMyNotifications(req.user.id, req.query);
    return success(res, data, meta);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 503, 'Hệ thống chưa được cấu hình.');
    }
    console.error(`Error listing notifications for user ${req.user.id}:`, err);
    return sendError(res, 500, 'Không thể tải danh sách thông báo.', err.message);
  }
});

// Mark all read
router.patch('/read-all', authenticateUser, async (req, res) => {
  try {
    const affectedCount = await notificationService.markAllNotificationsRead(req.user.id);
    return success(res, { affectedCount });
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 503, 'Hệ thống chưa được cấu hình.');
    }
    console.error(`Error marking all read for user ${req.user.id}:`, err);
    return sendError(res, 500, 'Không thể cập nhật trạng thái thông báo.', err.message);
  }
});

// Mark one read
router.patch('/:id/read', authenticateUser, async (req, res) => {
  try {
    const notif = await notificationService.markNotificationRead(req.user.id, req.params.id);
    if (!notif) {
      return sendError(res, 404, 'Không tìm thấy thông báo.');
    }
    return success(res, notif);
  } catch (err) {
    if (err.code === '22P02') { // invalid UUID
      return sendError(res, 404, 'Không tìm thấy thông báo.');
    }
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 503, 'Hệ thống chưa được cấu hình.');
    }
    console.error(`Error marking read for user ${req.user.id} notif ${req.params.id}:`, err);
    return sendError(res, 500, 'Không thể cập nhật trạng thái thông báo.', err.message);
  }
});

module.exports = router;