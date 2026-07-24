const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const { authenticateUser, requireAuth, requireAdmin } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

function handleOrderError(err, res, fallbackMessage) {
  if (err.status) {
    return error(res, err.status, err.message, err.details, err.code);
  }
  console.error(fallbackMessage, err);
  return error(res, 500, 'Đã xảy ra lỗi hệ thống.', undefined, 'INTERNAL_ERROR');
}

// Apply authenticateUser middleware to all routes in this file
router.use(authenticateUser);

// POST /api/orders
router.post('/', requireAuth, async (req, res) => {
  try {
    const idempotencyKey = req.get('Idempotency-Key');
    const order = await orderService.createOrder(req.user, req.body, idempotencyKey);
    return success(res, order);
  } catch (err) {
    return handleOrderError(err, res, 'Create order route error:');
  }
});

// POST /api/orders/preview — authoritative, read-only cart pricing.
router.post('/preview', requireAuth, async (req, res) => {
  try {
    const quote = await orderService.quoteOrder(req.user, req.body);
    return success(res, quote);
  } catch (err) {
    return handleOrderError(err, res, 'Checkout preview error:');
  }
});

// POST /api/orders/validate-coupon — coupon and totals are resolved from
// authoritative product rows, never from client prices.
router.post('/validate-coupon', requireAuth, async (req, res) => {
  try {
    if (!req.body?.code || !String(req.body.code).trim()) {
      return error(res, 400, 'Vui lòng nhập mã giảm giá.', undefined, 'COUPON_INVALID');
    }
    const quote = await orderService.quoteOrder(req.user, {
      items: req.body.items,
      couponCode: req.body.code,
      paymentMethod: 'cod',
    });
    return success(res, {
      coupon: quote.coupon,
      totals: {
        subtotal: quote.subtotal,
        shipping_fee: quote.shipping_fee,
        discount_amount: quote.discount_amount,
        total_amount: quote.total_amount,
      },
      price_changes: quote.price_changes,
      requires_review: quote.requires_review,
      message: 'Áp dụng mã giảm giá thành công.',
    });
  } catch (err) {
    return handleOrderError(err, res, 'Coupon validation error:');
  }
});

// GET /api/orders/my
router.get('/my', requireAuth, async (req, res) => {
  try {
    const orders = await orderService.listMyOrders(req.user.id);
    return success(res, orders);
  } catch (err) {
    console.error('List my orders error:', err);
    return error(res, 500, err.message || 'Không thể tải danh sách đơn hàng.');
  }
});

// GET /api/orders
router.get('/', requireAdmin, async (req, res) => {
  try {
    const filters = {
      query: req.query.query,
      orderStatus: req.query.orderStatus,
      paymentMethod: req.query.paymentMethod,
    };

    let page = 1;
    let pageSize = 20;

    if (req.query.page !== undefined) {
      const parsedPage = Number(req.query.page);
      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        return error(res, 400, 'Tham số page không hợp lệ.');
      }
      page = parsedPage;
    }

    if (req.query.pageSize !== undefined) {
      const parsedSize = Number(req.query.pageSize);
      if (![10, 20, 50].includes(parsedSize)) {
        return error(res, 400, 'Tham số pageSize không hợp lệ.');
      }
      pageSize = parsedSize;
    }

    const result = await orderService.listAllOrders(filters, page, pageSize);
    return success(res, result);
  } catch (err) {
    if (err.status) return error(res, err.status, err.message, err.details, err.code);
    console.error('List all orders error:', err);
    return error(res, 500, err.message || 'Không thể tải danh sách đơn hàng.');
  }
});

// GET /api/orders/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);
    return success(res, order);
  } catch (err) {
    return handleOrderError(err, res, `Get order ${req.params.id} error:`);
  }
});

// POST /api/orders/:id/cancel — buyer-owned, exactly-once cancellation.
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const result = await orderService.cancelOrder(req.user, req.params.id);
    return success(res, result);
  } catch (err) {
    return handleOrderError(err, res, `Cancel order ${req.params.id} error:`);
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return error(res, 400, 'Vui lòng cung cấp trạng thái đơn hàng.');
    }

    const updatedOrder = await orderService.updateOrderStatus(req.params.id, status, req.user);
    return success(res, updatedOrder);
  } catch (err) {
    return handleOrderError(err, res, `Update order status ${req.params.id} error:`);
  }
});

module.exports = router;
