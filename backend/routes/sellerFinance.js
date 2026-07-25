const express = require('express');
const router = express.Router();
const sellerFinanceService = require('../services/sellerFinanceService');
const { requireAuth } = require('../middleware/auth');
const { success, error, handleServiceError } = require('../utils/apiResponse');

router.use(requireAuth);

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
