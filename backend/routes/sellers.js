const express = require('express');
const router = express.Router();
const sellerService = require('../services/sellerService');
const productService = require('../services/productService');
const { success, error } = require('../utils/apiResponse');

// Get seller profile details by username
router.get('/:username', async (req, res) => {
  try {
    const seller = await sellerService.getSellerByUsername(req.params.username);
    
    if (!seller) {
      return error(res, 404, 'Seller not found');
    }
    
    return success(res, seller);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Service Unavailable: Database not configured');
    }
    console.error(`Error fetching seller profile ${req.params.username}:`, err);
    return error(res, 500, 'Internal Server Error', err.message);
  }
});

// Get all products listed by a specific seller
router.get('/:username/products', async (req, res) => {
  try {
    // Verify seller exists first
    const seller = await sellerService.getSellerByUsername(req.params.username);
    if (!seller) {
      return error(res, 404, 'Seller not found');
    }

    const { data, meta } = await productService.getProducts({
      ...req.query,
      seller: req.params.username
    });
    
    return success(res, data, meta);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Service Unavailable: Database not configured');
    }
    console.error(`Error fetching products for seller ${req.params.username}:`, err);
    return error(res, 500, 'Internal Server Error', err.message);
  }
});

module.exports = router;
