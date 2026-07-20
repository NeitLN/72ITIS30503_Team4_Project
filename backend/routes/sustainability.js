const express = require('express');
const impactService = require('../services/impactService');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();

router.get('/impact', async (req, res) => {
  try {
    return success(res, await impactService.getPlatformImpact());
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error('Get platform impact error:', err);
    return error(res, 500, 'Không thể tải dữ liệu tác động tuần hoàn.');
  }
});

module.exports = router;
