const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const { authenticateUser, requireAuth, requireAdmin } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

// Apply authenticateUser middleware to all routes in this file
router.use(authenticateUser);

// POST /api/orders
router.post('/', requireAuth, async (req, res) => {
  try {
    const order = await orderService.createOrder(req.user, req.body);
    return success(res, order);
  } catch (err) {
    console.error('Create order route error:', err);
    if (err.status) {
      return error(res, err.status, err.message);
    }
    return error(res, 400, err.message || 'Failed to create order');
  }
});

// GET /api/orders/my
router.get('/my', requireAuth, async (req, res) => {
  try {
    const orders = await orderService.listMyOrders(req.user.id);
    return success(res, orders);
  } catch (err) {
    console.error('List my orders error:', err);
    return error(res, 500, err.message || 'Failed to list orders');
  }
});

// GET /api/orders
router.get('/', requireAdmin, async (req, res) => {
  try {
    const orders = await orderService.listAllOrders();
    return success(res, orders);
  } catch (err) {
    console.error('List all orders error:', err);
    return error(res, 500, err.message || 'Failed to retrieve orders list');
  }
});

// GET /api/orders/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);
    return success(res, order);
  } catch (err) {
    if (err.status) {
      return error(res, err.status, err.message);
    }
    console.error(`Get order ${req.params.id} error:`, err);
    return error(res, 500, 'Failed to fetch order details');
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return error(res, 400, 'Status field is required');
    }
    
    const updatedOrder = await orderService.updateOrderStatus(req.params.id, status);
    return success(res, updatedOrder);
  } catch (err) {
    if (err.status) {
      return error(res, err.status, err.message);
    }
    console.error(`Update order status ${req.params.id} error:`, err);
    return error(res, 500, err.message || 'Failed to update status');
  }
});

// POST /api/orders/validate-coupon
router.post('/validate-coupon', requireAuth, async (req, res) => {
  try {
    const { code, items } = req.body;
    
    if (!code || !code.trim()) {
      return error(res, 400, 'Coupon code is required');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return error(res, 400, 'Cart items are required to validate coupon');
    }

    const rawSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const coupon = await orderService.validateCouponCode(code, rawSubtotal);
    const totals = orderService.calculateTotals(items, coupon);

    return success(res, {
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      },
      totals: {
        subtotal: totals.subtotal,
        shipping_fee: totals.shipping_fee,
        discount_amount: totals.discount_amount,
        total_amount: totals.total_amount
      },
      message: 'Coupon applied successfully.'
    });
  } catch (err) {
    if (err.status) {
      return error(res, err.status, err.message);
    }
    console.error('Coupon validation error:', err);
    return error(res, 500, 'Failed to validate coupon');
  }
});

module.exports = router;
