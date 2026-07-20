const express = require('express');
const router = express.Router();
const sellerService = require('../services/sellerService');
const productService = require('../services/productService');
const impactService = require('../services/impactService');
const { success, error } = require('../utils/apiResponse');

router.get('/:username/impact', async (req, res) => {
  try {
    const impact = await impactService.getPublicSellerImpact(req.params.username);
    if (!impact) return error(res, 404, 'Không tìm thấy người bán.');
    return success(res, impact);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error(`Error fetching seller impact ${req.params.username}:`, err);
    return error(res, 500, 'Không thể tải dữ liệu tác động của người bán.');
  }
});

// Get seller profile details by username
router.get('/:username', async (req, res) => {
  try {
    const seller = await sellerService.getSellerByUsername(req.params.username);
    
    if (!seller) {
      return error(res, 404, 'Không tìm thấy người bán.');
    }
    
    return success(res, seller);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error(`Error fetching seller profile ${req.params.username}:`, err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', err.message);
  }
});

// Get all products listed by a specific seller
router.get('/:username/products', async (req, res) => {
  try {
    // Verify seller exists first
    const seller = await sellerService.getSellerByUsername(req.params.username);
    if (!seller) {
      return error(res, 404, 'Không tìm thấy người bán.');
    }

    const { data, meta } = await productService.getProducts({
      ...req.query,
      seller: seller.username // normalized value resolved above, not the raw param
    });
    
    return success(res, data, meta);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error(`Error fetching products for seller ${req.params.username}:`, err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', err.message);
  }
});

module.exports = router;
