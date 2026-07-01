const express = require('express');
const router = express.Router();
const productService = require('../services/productService');
const { success, error } = require('../utils/apiResponse');

router.get('/', async (req, res) => {
  try {
    const { data, meta } = await productService.getProducts(req.query);
    return success(res, data, meta);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Service Unavailable: Database not configured');
    }
    console.error('Error fetching products:', err);
    return error(res, 500, 'Internal Server Error', err.message);
  }
});

router.get('/featured', async (req, res) => {
  try {
    const { data, meta } = await productService.getFeaturedProducts();
    return success(res, data, meta);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Service Unavailable: Database not configured');
    }
    console.error('Error fetching featured products:', err);
    return error(res, 500, 'Internal Server Error', err.message);
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    
    if (!product) {
      return error(res, 404, 'Product not found');
    }
    
    // If it's a variable product, fetch variants
    if (product.product_type === 'variable') {
      const variants = await productService.getProductVariants(product.id);
      product.variants = variants;
    }
    
    return success(res, product);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Service Unavailable: Database not configured');
    }
    console.error(`Error fetching product ${req.params.slug}:`, err);
    return error(res, 500, 'Internal Server Error', err.message);
  }
});

module.exports = router;
