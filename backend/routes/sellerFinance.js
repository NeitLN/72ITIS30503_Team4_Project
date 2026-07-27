const express = require('express');
const router = express.Router();
const sellerFinanceService = require('../services/sellerFinanceService');
const { authenticateUser, requireSeller } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

// `handleServiceError` is not exported by utils/apiResponse — every other
// seller route (sellerListings.js, sellerOrders.js) defines its own local
// copy rather than importing one that doesn't exist. Matching that pattern.
function handleServiceError(err, res, fallback) {
  if (err.status) return error(res, err.status, err.message, err.details, err.code);
  console.error(fallback, err);
  return error(res, 500, 'Đã xảy ra lỗi hệ thống.');
}

// authenticateUser must run before requireSeller — requireSeller only checks
// req.user truthiness and role, it never decodes the token itself. Without
// authenticateUser here, every request (valid token or not) was rejected
// with 401, since req.user was never populated.
router.use(authenticateUser, requireSeller);

// GET /api/seller/finance/summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await sellerFinanceService.getFinanceSummary(req.user.id);
    return success(res, summary);
  } catch (err) {
    return handleServiceError(err, res, 'Lỗi tải tổng quan tài chính:');
  }
});

// GET /api/seller/finance/ledger
router.get('/ledger', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const ledger = await sellerFinanceService.getFinanceLedger(req.user.id, { page, limit });
    return success(res, ledger.data, ledger.meta);
  } catch (err) {
    return handleServiceError(err, res, 'Lỗi tải sổ cái tài chính:');
  }
});

module.exports = router;
