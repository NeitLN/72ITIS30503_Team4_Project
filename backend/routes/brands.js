const express = require('express');
const router = express.Router();
const brandService = require('../services/brandService');
const { success, error } = require('../utils/apiResponse');

// GET /api/brands — read-only list of active brands, for the Sell form and
// any other client that needs the real brand taxonomy instead of a
// hardcoded list.
// GET /api/brands?scope=shop-filter — only brands with at least one active
// product, for the Shop filter dropdown (never an empty-result option).
router.get('/', async (req, res) => {
  try {
    const data = req.query.scope === 'shop-filter'
      ? await brandService.getShopFilterBrands()
      : await brandService.getBrands();
    return success(res, data);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error('Error fetching brands:', err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.');
  }
});

module.exports = router;
