const express = require('express');
const router = express.Router();
const sellerOrderService = require('../services/sellerOrderService');
const { authenticateUser, requireAuth } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

function handleServiceError(err, res, fallback) {
  if (err.status) return error(res, err.status, err.message);
  console.error(fallback, err);
  return error(res, 500, 'Đã xảy ra lỗi hệ thống.');
}

router.use(authenticateUser, requireAuth);

// GET /api/seller/orders
router.get('/', async (req, res) => {
  try {
    const result = await sellerOrderService.listMyOrderItems(req.user.id, req.query);
    return success(res, result.data, result.meta);
  } catch (err) {
    return handleServiceError(err, res, 'List my seller orders error:');
  }
});

// GET /api/seller/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await sellerOrderService.getMyOrderById(req.user.id, req.params.id);
    return success(res, result);
  } catch (err) {
    return handleServiceError(err, res, `Get my seller order ${req.params.id} error:`);
  }
});

// PATCH /api/seller/orders/items/:itemId/fulfillment
router.patch('/items/:itemId/fulfillment', async (req, res) => {
  try {
    const updated = await sellerOrderService.updateFulfillmentStatus(req.user.id, req.params.itemId, req.body?.status);
    return success(res, updated);
  } catch (err) {
    return handleServiceError(err, res, `Update fulfillment for item ${req.params.itemId} error:`);
  }
});

module.exports = router;
