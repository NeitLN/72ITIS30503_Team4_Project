/**
 * Phase 9 — authenticated seller order fulfillment.
 *
 * `orders.status` is a single value for the whole order and can legitimately
 * be shared by multiple sellers (verified against live data — see the
 * Phase 9 report). This file NEVER lets a seller read or write that shared
 * `orders.status`; it only ever exposes the seller's OWN `order_items` rows
 * (via product_id -> products.seller_id) and their independent
 * `fulfillment_status`. Order-level aggregate money fields
 * (`total_amount`, `subtotal`, `discount_amount`) are never selected here —
 * those can include another seller's items' value, so they're computed
 * fresh from only the caller's own line items when a total is needed.
 */
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { FULFILLMENT_STATUSES } = require('../constants/listingStatus');
const { fromRpcError } = require('../utils/serviceError');

class SellerOrderError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status || 422;
  }
}

const checkDb = () => {
  if (!isSupabaseAdminConfigured()) {
    throw new SellerOrderError('Hệ thống chưa được cấu hình.', 503);
  }
};

// Minimal, operationally-necessary order fields only — never the buyer's
// email, payment method detail, notes, or any order-level money total that
// could reveal another seller's share of a shared order.
const ORDER_CONTEXT_COLUMNS = 'id, order_code, status, created_at, customer_name, customer_phone, shipping_address, city';

async function attachOrderContext(items) {
  if (!items.length) return items;
  const orderIds = [...new Set(items.map((i) => i.order_id))];
  const { data: orders } = await supabaseAdmin.from('orders').select(ORDER_CONTEXT_COLUMNS).in('id', orderIds);
  const byId = new Map((orders || []).map((o) => [o.id, o]));
  return items.map((item) => ({ ...item, order: byId.get(item.order_id) || null }));
}

async function listMyOrderItems(userId, query = {}) {
  checkDb();

  if (query.status && !FULFILLMENT_STATUSES.includes(query.status)) {
    throw new SellerOrderError('Trạng thái lọc không hợp lệ.', 400);
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || 20;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 50) limit = 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let base = supabaseAdmin
    .from('order_items')
    .select('id, order_id, product_id, product_name, product_slug, image_url, size, condition, quantity, unit_price, price, line_total, fulfillment_status, created_at', { count: 'exact' })
    .eq('seller_id', userId);
  if (query.status) base = base.eq('fulfillment_status', query.status);

  const { data, error, count } = await base.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;

  const withOrder = await attachOrderContext(data || []);
  return { data: withOrder, meta: { page, limit, count: count || 0 } };
}

async function getMyOrderById(userId, orderId) {
  checkDb();

  const { data: items, error } = await supabaseAdmin
    .from('order_items')
    .select('id, order_id, product_id, product_name, product_slug, image_url, size, condition, quantity, unit_price, price, line_total, fulfillment_status, created_at')
    .eq('order_id', orderId)
    .eq('seller_id', userId);
  if (error) throw error;

  // Zero matching items means this seller has no relationship to the order
  // at all — a safe 404, not a 403 that would confirm the order exists.
  if (!items || items.length === 0) {
    throw new SellerOrderError('Không tìm thấy đơn hàng.', 404);
  }

  const { data: order } = await supabaseAdmin.from('orders').select(ORDER_CONTEXT_COLUMNS).eq('id', orderId).maybeSingle();
  const myTotal = items.reduce((sum, i) => sum + Number(i.line_total ?? (Number(i.unit_price ?? i.price ?? 0) * (i.quantity || 1))), 0);

  return { order, items, myTotal };
}

async function updateFulfillmentStatus(userId, orderItemId, nextStatus) {
  checkDb();

  if (!FULFILLMENT_STATUSES.includes(String(nextStatus || ''))) {
    throw new SellerOrderError('Trạng thái không hợp lệ.', 400);
  }

  const { data, error } = await supabaseAdmin.rpc('stylehub_transition_order_item', {
    p_seller_id: userId,
    p_order_item_id: orderItemId,
    p_next_status: nextStatus,
  });
  if (error) {
    throw fromRpcError(error, 'Không thể cập nhật trạng thái xử lý.');
  }

  return {
    id: data.id,
    order_id: data.orderId,
    product_id: data.productId,
    fulfillment_status: data.fulfillmentStatus,
    order_status: data.orderStatus,
    idempotent_replay: Boolean(data.idempotentReplay),
    inventory: data.inventory,
  };
}

module.exports = {
  SellerOrderError,
  listMyOrderItems,
  getMyOrderById,
  updateFulfillmentStatus,
};
