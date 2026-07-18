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
        return error(res, 422, 'Unsupported file type. Only JPEG, PNG, and WebP are allowed.', { images: 'Unsupported file type.' });
      }
      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return error(res, 422, 'One or more images exceed the 5MB limit.', { images: 'File too large.' });
      }
      if (uploadErr.code === 'LIMIT_FILE_COUNT' || uploadErr.code === 'LIMIT_UNEXPECTED_FILE') {
        return error(res, 422, `A maximum of ${listingService.MAX_IMAGES} photos is allowed.`, { images: 'Too many files.' });
      }
      console.error('Upload middleware error:', uploadErr);
      return error(res, 400, 'Failed to process uploaded files.');
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
      if (err instanceof listingService.ListingValidationError) {
        return error(res, err.status, err.message, err.fieldErrors);
      }
      if (err.status) {
        return error(res, err.status, err.message);
      }
      console.error('Create listing error:', err);
      return error(res, 500, 'Failed to create listing.');
    }
  });
});

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
