const express = require('express');
const { authenticateUser, requireDatabaseAdmin } = require('../middleware/auth');
const adminOverviewService = require('../services/adminOverviewService');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();
router.use(authenticateUser, requireDatabaseAdmin);

router.get('/overview', async (req, res) => {
  try {
    const overview = await adminOverviewService.getOverview(req.user);
    return success(res, overview);
  } catch (err) {
    if (err?.status) return error(res, err.status, err.message, err.details, err.code);
    console.error('Admin overview failed:', err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', undefined, 'INTERNAL_ERROR');
  }
});

module.exports = router;
