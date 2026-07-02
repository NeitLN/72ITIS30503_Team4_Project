const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const { success, error } = require('../utils/apiResponse');

// Create a new order (POST /api/orders)
router.post('/', async (req, res) => {
  try {
    const order = await orderService.createOrder(req.body);
    return success(res, order, { message: 'Order created successfully' });
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Service Unavailable: Database not configured');
    }
    console.error('Error creating order in API:', err);
    return error(res, 500, 'Internal Server Error', err.message);
  }
});

// Get all orders (GET /api/orders)
router.get('/', async (req, res) => {
  try {
    const orders = await orderService.getOrders();
    return success(res, orders);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Service Unavailable: Database not configured');
    }
    console.error('Error fetching orders list in API:', err);
    return error(res, 500, 'Internal Server Error', err.message);
  }
});

// Get specific order detail (GET /api/orders/:id)
router.get('/:id', async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    
    if (!order) {
      return error(res, 404, 'Order not found');
    }
    
    return success(res, order);
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Service Unavailable: Database not configured');
    }
    console.error(`Error fetching order ${req.params.id}:`, err);
    return error(res, 500, 'Internal Server Error', err.message);
  }
});

// Update order status (PATCH /api/orders/:id/status)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return error(res, 400, 'Status field is required');
    }
    
    const updatedOrder = await orderService.updateOrderStatus(req.params.id, status);
    return success(res, updatedOrder, { message: `Order status updated to ${status}` });
  } catch (err) {
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return error(res, 503, 'Service Unavailable: Database not configured');
    }
    console.error(`Error transitioning status for order ${req.params.id}:`, err);
    return error(res, 500, 'Internal Server Error', err.message);
  }
});

module.exports = router;
