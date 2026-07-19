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
const { isValidFulfillmentTransition, FULFILLMENT_STATUSES } = require('../constants/listingStatus');

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

async function getMyProductIds(userId) {
  const { data } = await supabaseAdmin.from('products').select('id').eq('seller_id', userId);
  return (data || []).map((p) => p.id);
}

async function attachOrderContext(items) {
  if (!items.length) return items;
  const orderIds = [...new Set(items.map((i) => i.order_id))];
  const { data: orders } = await supabaseAdmin.from('orders').select(ORDER_CONTEXT_COLUMNS).in('id', orderIds);
  const byId = new Map((orders || []).map((o) => [o.id, o]));
  return items.map((item) => ({ ...item, order: byId.get(item.order_id) || null }));
}

async function listMyOrderItems(userId, query = {}) {
  checkDb();
  const productIds = await getMyProductIds(userId);
  if (!productIds.length) return { data: [], meta: { page: 1, limit: 20, count: 0 } };

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
    .in('product_id', productIds);
  if (query.status) base = base.eq('fulfillment_status', query.status);

  const { data, error, count } = await base.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;

  const withOrder = await attachOrderContext(data || []);
  return { data: withOrder, meta: { page, limit, count: count || 0 } };
}

async function getMyOrderById(userId, orderId) {
  checkDb();
  const productIds = await getMyProductIds(userId);

  const { data: items, error } = await supabaseAdmin
    .from('order_items')
    .select('id, order_id, product_id, product_name, product_slug, image_url, size, condition, quantity, unit_price, price, line_total, fulfillment_status, created_at')
    .eq('order_id', orderId)
    .in('product_id', productIds.length ? productIds : ['00000000-0000-0000-0000-000000000000']);
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

  const { data: item, error: itemErr } = await supabaseAdmin
    .from('order_items')
    .select('id, order_id, product_id, fulfillment_status')
    .eq('id', orderItemId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!item) throw new SellerOrderError('Không tìm thấy mục đơn hàng.', 404);

  // Ownership: the item's product must belong to the authenticated seller.
  // A product_id that doesn't resolve to this seller (someone else's item,
  // or a null/foreign seller_id) is treated identically to "not found" —
  // never a 403 that would confirm the item exists for another seller.
  const { data: product } = await supabaseAdmin.from('products').select('id, seller_id').eq('id', item.product_id).maybeSingle();
  if (!product || product.seller_id !== userId) {
    throw new SellerOrderError('Không tìm thấy mục đơn hàng.', 404);
  }

  // No real payment-status system exists yet — the closest honest proxy is
  // the shared order's own status. A cancelled order must never have its
  // items progressed toward shipped/completed by any seller.
  const { data: order } = await supabaseAdmin.from('orders').select('status').eq('id', item.order_id).maybeSingle();
  if (order && order.status === 'cancelled' && nextStatus !== 'cancelled') {
    throw new SellerOrderError('Không thể cập nhật trạng thái xử lý cho đơn hàng đã bị hủy.', 409);
  }

  if (!isValidFulfillmentTransition(item.fulfillment_status, nextStatus)) {
    throw new SellerOrderError(
      `Không thể chuyển trạng thái xử lý từ '${item.fulfillment_status}' sang '${nextStatus}'.`,
      409,
    );
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('order_items')
    .update({ fulfillment_status: nextStatus })
    .eq('id', orderItemId)
    .eq('fulfillment_status', item.fulfillment_status) // compare-and-swap against the state we just validated
    .select('id, order_id, product_id, fulfillment_status')
    .maybeSingle();
  if (updErr) throw updErr;
  if (!updated) {
    throw new SellerOrderError('Trạng thái đã được thay đổi bởi một yêu cầu khác. Vui lòng tải lại trang.', 409);
  }

  return updated;
}

module.exports = {
  SellerOrderError,
  listMyOrderItems,
  getMyOrderById,
  updateFulfillmentStatus,
};
