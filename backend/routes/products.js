const express = require('express');
const router = express.Router();
const multer = require('multer');
const productService = require('../services/productService');
const listingService = require('../services/listingService');
const { authenticateUser, requireAuth } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: listingService.MAX_IMAGE_BYTES, files: listingService.MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (!listingService.ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
    cb(null, true);
  },
});

// POST /api/products — create a real, persistent user listing.
// Auth required. seller_id/status/slug/image URLs are NEVER taken from the
// request body — see services/listingService.js for the full trust boundary.
router.post('/', authenticateUser, requireAuth, (req, res) => {
  upload.array('images', listingService.MAX_IMAGES)(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.message === 'UNSUPPORTED_FILE_TYPE') {
        return error(res, 422, 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.', { images: 'Định dạng ảnh không được hỗ trợ.' });
      }
      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return error(res, 422, 'Một hoặc nhiều ảnh vượt quá giới hạn 5MB.', { images: 'Ảnh quá lớn.' });
      }
      if (uploadErr.code === 'LIMIT_FILE_COUNT' || uploadErr.code === 'LIMIT_UNEXPECTED_FILE') {
        return error(res, 422, `Chỉ được đăng tối đa ${listingService.MAX_IMAGES} ảnh.`, { images: 'Quá nhiều ảnh.' });
      }
      console.error('Upload middleware error:', uploadErr);
      return error(res, 400, 'Không thể xử lý tệp đã tải lên.');
    }

    try {
      const product = await listingService.createListing(req.user, req.body, req.files);
      return res.status(201).json({
        success: true,
        data: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          status: product.status,
          thumbnail: product.thumbnail,
        },
      });
    } catch (err) {
      if (err.status) {
        return error(res, err.status, err.message, err.fieldErrors);
      }
      console.error('Create listing error:', err);
      return error(res, 500, 'Không thể tạo tin đăng. Vui lòng thử lại.');
    }
  });
});

router.get('/', async (req, res) => {
  try {
    const { data, meta } = await productService.getProducts(req.query);
    return success(res, data, meta);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error('Error fetching products:', err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', err.message);
  }
});

router.get('/featured', async (req, res) => {
  try {
    const { data, meta } = await productService.getFeaturedProducts();
    return success(res, data, meta);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error('Error fetching featured products:', err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', err.message);
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    
    if (!product) {
      return error(res, 404, 'Không tìm thấy sản phẩm.');
    }
    
    // If it's a variable product, fetch variants
    if (product.inventory_mode === 'variant' || product.product_type === 'variable') {
      const variants = await productService.getProductVariants(product.id);
      product.variants = variants;
    }
    
    return success(res, product);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Dịch vụ tạm thời không khả dụng: hệ thống chưa được cấu hình.');
    }
    console.error(`Error fetching product ${req.params.slug}:`, err);
    return error(res, 500, 'Đã xảy ra lỗi hệ thống.', err.message);
  }
});

module.exports = router;
