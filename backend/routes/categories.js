const express = require('express');
const router = express.Router();
const categoryService = require('../services/categoryService');
const { success, error } = require('../utils/apiResponse');

router.get('/', async (req, res) => {
  try {
    const categories = await categoryService.getCategories();
    return success(res, categories);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error('Error fetching categories:', err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', err.message);
  }
});

router.get('/tree', async (req, res) => {
  try {
    const categories = await categoryService.getCategories();
    const tree = categoryService.buildCategoryTree(categories);
    return success(res, tree);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error('Error fetching category tree:', err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', err.message);
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    
    if (!category) {
      return error(res, 404, 'Không tìm thấy danh mục.');
    }
    
    return success(res, category);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error(`Error fetching category ${req.params.slug}:`, err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', err.message);
  }
});

router.get('/:slug/products', async (req, res) => {
  try {
    const result = await categoryService.getProductsByCategorySlug(req.params.slug, req.query);
    
    if (!result) {
      return error(res, 404, 'Không tìm thấy danh mục.');
    }
    
    return success(res, result.products, {
      category: result.category,
      ...result.meta
    });
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error(`Error fetching products for category ${req.params.slug}:`, err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', err.message);
  }
});

module.exports = router;
