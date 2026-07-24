const crypto = require('crypto');
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { ServiceError, fromRpcError } = require('../utils/serviceError');
const { getOrderPayment, normalizePayment, toSafeCheckoutPayment } = require('./paymentService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_RE = UUID_RE;
const MAX_ITEMS = 100;
const MAX_QUANTITY = 999;
const FREE_SHIPPING_THRESHOLD = 500000;
const STANDARD_SHIPPING_FEE = 30000;

function checkDb() {
  if (!isSupabaseAdminConfigured()) {
    throw new ServiceError('DATABASE_NOT_CONFIGURED', 'Hệ thống chưa được cấu hình.', 503);
  }
}

function requireText(value, label, maxLength) {
  const normalized = String(value || '').trim();
  if (!normalized || normalized.length > maxLength) {
    throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', `${label} không hợp lệ.`, 422);
  }
  return normalized;
}

function normalizeCustomer(customer) {
  if (!customer || typeof customer !== 'object') {
    throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Thông tin giao hàng không hợp lệ.', 422);
  }

  const name = requireText(customer.name, 'Họ và tên', 160);
  const email = requireText(customer.email, 'Email', 320).toLowerCase();
  const phone = requireText(customer.phone, 'Số điện thoại', 20);
  const address = requireText(customer.address, 'Địa chỉ giao hàng', 1000);
  const city = requireText(customer.city, 'Tỉnh/thành phố', 160);

  if (name.length < 2) {
    throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Vui lòng nhập họ và tên.', 422);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Vui lòng nhập email hợp lệ.', 422);
  }
  if (!/^0[0-9]{9}$/.test(phone)) {
    throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Số điện thoại Việt Nam không hợp lệ.', 422);
  }

  return { name, email, phone, address, city };
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > MAX_ITEMS) {
    throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Giỏ hàng không hợp lệ.', 422);
  }

  const grouped = new Map();
  for (const raw of rawItems) {
    const productId = String(raw?.productId || '').trim().toLowerCase();
    const variantId = raw?.variantId == null || raw.variantId === ''
      ? null
      : String(raw.variantId).trim().toLowerCase();
    const quantity = Number(raw?.quantity);
    const expectedRaw = raw?.expectedUnitPrice ?? raw?.unitPrice;
    const expectedUnitPrice = expectedRaw == null || expectedRaw === '' ? null : Number(expectedRaw);

    if (!UUID_RE.test(productId) || (variantId !== null && !UUID_RE.test(variantId))) {
      throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Mã sản phẩm hoặc phân loại không hợp lệ.', 422);
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Số lượng sản phẩm không hợp lệ.', 422);
    }
    if (expectedUnitPrice !== null && (!Number.isFinite(expectedUnitPrice) || expectedUnitPrice < 0)) {
      throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Giá tham chiếu không hợp lệ.', 422);
    }

    const key = `${productId}:${variantId || ''}`;
    const existing = grouped.get(key);
    if (existing) {
      if (existing.expectedUnitPrice !== expectedUnitPrice) {
        throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Giỏ hàng có các dòng sản phẩm bị trùng giá.', 422);
      }
      existing.quantity += quantity;
      if (existing.quantity > MAX_QUANTITY) {
        throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Số lượng sản phẩm vượt quá mức cho phép.', 422);
      }
    } else {
      grouped.set(key, { productId, variantId, quantity, expectedUnitPrice });
    }
  }

  return [...grouped.values()].sort((a, b) => {
    const productCompare = a.productId.localeCompare(b.productId);
    return productCompare || String(a.variantId || '').localeCompare(String(b.variantId || ''));
  });
}

function normalizeCouponCode(value) {
  if (value == null || String(value).trim() === '') return null;
  const code = String(value).trim().toUpperCase();
  if (code.length > 80 || !/^[A-Z0-9_-]+$/.test(code)) {
    throw new ServiceError('COUPON_INVALID', 'Mã giảm giá không hợp lệ.', 400);
  }
  return code;
}

function normalizeCheckoutPayload(payload, { requireCustomer = true } = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new ServiceError('INVALID_CHECKOUT_PAYLOAD', 'Yêu cầu thanh toán không hợp lệ.', 422);
  }

  const payment = normalizePayment(payload);
  const items = normalizeItems(payload.items);
  const couponCode = normalizeCouponCode(payload.couponCode);

  const notes = payload.notes == null ? null : String(payload.notes).trim().slice(0, 2000) || null;
  return {
    customer: requireCustomer ? normalizeCustomer(payload.customer) : null,
    paymentMethod: payment.method,
    paymentDetails: payment.details,
    notes,
    couponCode,
    items,
  };
}

function buildFingerprint(normalized) {
  const canonical = JSON.stringify({
    customer: normalized.customer,
    paymentMethod: normalized.paymentMethod,
    paymentDetails: normalized.paymentDetails,
    notes: normalized.notes,
    couponCode: normalized.couponCode,
    items: normalized.items,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function mapCheckoutResult(result) {
  const mapped = {
    id: result.id,
    order_code: result.orderCode,
    status: result.status,
    payment_method: result.paymentMethod,
    subtotal: Number(result.subtotal),
    shipping_fee: Number(result.shippingFee),
    discount_amount: Number(result.discountAmount),
    total_amount: Number(result.totalAmount),
    items: result.items || [],
    idempotent_replay: Boolean(result.idempotentReplay),
    message: result.message,
  };
  if (result.payment) mapped.payment = toSafeCheckoutPayment(result.payment);
  return mapped;
}

async function quoteOrder(user, payload) {
  checkDb();
  const normalized = normalizeCheckoutPayload(payload, { requireCustomer: false });

  const { data, error } = await supabaseAdmin.rpc('stylehub_checkout_quote', {
    p_buyer_id: user.id,
    p_items: normalized.items,
    p_coupon_code: normalized.couponCode,
    p_enforce_expected_prices: false,
  });

  if (error) {
    console.error('Checkout quote RPC failed:', { code: error.code });
    throw fromRpcError(error, 'Không thể kiểm tra giỏ hàng. Vui lòng thử lại.');
  }

  return {
    items: data.items || [],
    subtotal: Number(data.subtotal),
    shipping_fee: Number(data.shippingFee),
    discount_amount: Number(data.discountAmount),
    total_amount: Number(data.totalAmount),
    price_changes: data.priceChanges || [],
    requires_review: Boolean(data.requiresReview),
    coupon: data.coupon ? {
      code: data.coupon.code,
      discount_type: data.coupon.discountType,
      discount_value: Number(data.coupon.discountValue),
    } : null,
  };
}

async function createOrder(user, payload, idempotencyKey) {
  checkDb();
  if (!IDEMPOTENCY_KEY_RE.test(String(idempotencyKey || ''))) {
    throw new ServiceError('INVALID_IDEMPOTENCY_KEY', 'Thiếu hoặc sai định dạng Idempotency-Key.', 400);
  }

  const normalized = normalizeCheckoutPayload(payload);
  const fingerprint = buildFingerprint(normalized);

  const rpcArgs = {
    p_buyer_id: user.id,
    p_idempotency_key: idempotencyKey,
    p_request_fingerprint: fingerprint,
    p_customer: normalized.customer,
    p_payment_method: normalized.paymentMethod,
    p_notes: normalized.notes,
    p_coupon_code: normalized.couponCode,
    p_items: normalized.items,
  };
  const rpcName = normalized.paymentMethod === 'simulated_card'
    ? 'stylehub_checkout_atomic_v2'
    : 'stylehub_checkout_atomic';
  if (normalized.paymentMethod === 'simulated_card') {
    rpcArgs.p_payment_details = normalized.paymentDetails;
  }

  const { data, error } = await supabaseAdmin.rpc(rpcName, rpcArgs);

  if (error) {
    console.error('Atomic checkout RPC failed:', { code: error.code });
    throw fromRpcError(error, 'Không thể tạo đơn hàng. Vui lòng thử lại.');
  }

  return mapCheckoutResult(data);
}

async function listMyOrders(userId) {
  checkDb();
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_code, status, payment_method, subtotal, shipping_fee, discount_amount, total_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new ServiceError('ORDER_LIST_FAILED', 'Không thể tải danh sách đơn hàng của bạn.', 500);
  return data;
}

async function listAllOrders(filters = {}, page = 1, pageSize = 20) {
  checkDb();

  function applyFilters(q) {
    if (filters.orderStatus) {
      if (!['pending', 'processing', 'completed', 'cancelled'].includes(filters.orderStatus)) {
        throw new ServiceError('INVALID_ORDER_STATUS', 'Trạng thái đơn hàng không hợp lệ.', 400);
      }
      q = q.eq('status', filters.orderStatus);
    }

    if (filters.paymentMethod) {
      if (!['cod', 'bank_transfer', 'simulated_card'].includes(filters.paymentMethod)) {
        throw new ServiceError('INVALID_PAYMENT_METHOD', 'Phương thức thanh toán không hợp lệ.', 400);
      }
      q = q.eq('payment_method', filters.paymentMethod);
    }

    if (filters.query && typeof filters.query === 'string') {
      const qs = filters.query.trim();
      if (qs.length > 0) {
        if (qs.length > 100) {
          throw new ServiceError('INVALID_QUERY', 'Từ khóa tìm kiếm quá dài.', 400);
        }

        const isUuid = UUID_RE.test(qs);
        if (isUuid) {
          q = q.eq('id', qs);
        } else {
          const safeQuery = qs.replace(/[%_\\]/g, '\\$&');
          q = q.or(`order_code.ilike.%${safeQuery}%,customer_name.ilike.%${safeQuery}%,customer_email.ilike.%${safeQuery}%`);
        }
      }
    }
    return q;
  }

  let countQuery = supabaseAdmin.from('orders').select('id', { count: 'exact', head: true });
  countQuery = applyFilters(countQuery);

  const { count, error: countError } = await countQuery;
  if (countError) {
    console.error('List all orders count error:', countError);
    throw new ServiceError('ORDER_LIST_FAILED', 'Không thể tải danh sách đơn hàng.', 500);
  }

  const totalItems = count || 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  let resultData = [];

  const from = (page - 1) * pageSize;

  if (totalItems > 0 && from < totalItems) {
    let dataQuery = supabaseAdmin
      .from('orders')
      .select('id, order_code, user_id, customer_name, customer_email, customer_phone, status, payment_method, subtotal, shipping_fee, discount_amount, total_amount, created_at, updated_at');

    dataQuery = applyFilters(dataQuery);
    dataQuery = dataQuery.order('created_at', { ascending: false }).order('id', { ascending: false });

    const to = from + pageSize - 1;
    dataQuery = dataQuery.range(from, to);

    const { data, error } = await dataQuery;
    if (error) {
      console.error('List all orders DB error:', error);
      throw new ServiceError('ORDER_LIST_FAILED', 'Không thể tải danh sách đơn hàng.', 500);
    }
    resultData = data || [];
  }

  return {
    data: resultData,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages
    }
  };
}

async function getOrderById(orderId, user) {
  checkDb();
  if (!UUID_RE.test(String(orderId || ''))) {
    throw new ServiceError('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.', 404);
  }

  const isAdmin = user.role === 'admin';

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, city, status, payment_method, subtotal, shipping_fee, discount_amount, total_amount, created_at, updated_at')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order || (!isAdmin && order.user_id !== user.id)) {
    throw new ServiceError('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.', 404);
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('id, product_id, variant_id, product_name, product_slug, variant_name, image_url, sku, size, condition, unit_price, price, quantity, line_total, fulfillment_status, lifecycle_type_snapshot, claim_source_snapshot, created_at, seller_id')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (itemsError) throw new ServiceError('ORDER_LOAD_FAILED', 'Không thể tải chi tiết đơn hàng.', 500);

  let payments = [];
  let paymentAllocations = [];
  let paymentEvents = [];

  if (isAdmin) {
    const [payRes, allocRes, eventsRes] = await Promise.all([
      supabaseAdmin.from('payments').select('id,state,payment_method,currency,gross_amount,platform_fee_total,seller_amount_total,card_brand,card_last_four,held_at,refunded_at,released_at').eq('order_id', orderId).order('created_at', { ascending: false }),
      supabaseAdmin.from('payment_allocations').select('id,payment_id,seller_id,state,gross_amount,platform_fee,seller_net_amount,released_at,created_at').eq('order_id', orderId).order('created_at', { ascending: false }),
      supabaseAdmin.from('payment_events').select('id,payment_id,event_type,previous_state,new_state,message,created_at').eq('order_id', orderId).order('created_at', { ascending: false }),
    ]);

    payments = payRes.data || [];
    paymentAllocations = allocRes.data || [];
    paymentEvents = eventsRes.data || [];

    return {
      ...order,
      items: items || [],
      payments,
      paymentAllocations,
      paymentEvents
    };
  } else {
    const payment = await getOrderPayment(orderId);
    return { ...order, items: items || [], ...(payment ? { payment } : {}) };
  }
}

async function cancelOrder(user, orderId) {
  checkDb();
  if (!UUID_RE.test(String(orderId || ''))) {
    throw new ServiceError('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.', 404);
  }

  const { data, error } = await supabaseAdmin.rpc('stylehub_cancel_order', {
    p_actor_id: user.id,
    p_actor_role: user.role === 'admin' ? 'admin' : 'buyer',
    p_order_id: orderId,
  });
  if (error) throw fromRpcError(error, 'Không thể hủy đơn hàng. Vui lòng thử lại.');
  return {
    id: data.id,
    order_code: data.orderCode,
    status: data.status,
    cancelled_items: Number(data.cancelledItems || 0),
    restored_items: Number(data.restoredItems || 0),
    payment_state: data.paymentState || null,
    idempotent_replay: Boolean(data.idempotentReplay),
    message: data.message,
  };
}

function isAllowedStatusTransition(currentStatus, nextStatus) {
  const allowed = {
    pending: ['processing', 'cancelled'],
    processing: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };
  return Boolean(allowed[currentStatus]?.includes(nextStatus));
}

async function updateOrderStatus(orderId, nextStatus, actor) {
  checkDb();

  const { data: currentOrder } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle();
  if (!currentOrder) throw new ServiceError('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.', 404);
  if (!isAllowedStatusTransition(currentOrder.status, nextStatus)) {
    throw new ServiceError('INVALID_ORDER_TRANSITION', 'Không thể chuyển đơn hàng sang trạng thái này.', 409);
  }

  if (nextStatus === 'cancelled') return cancelOrder(actor, orderId);

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', currentOrder.status)
    .select('id, order_code, status, updated_at')
    .maybeSingle();
  if (error || !data) {
    throw new ServiceError('ORDER_STATE_CONFLICT', 'Trạng thái đơn hàng vừa thay đổi. Vui lòng tải lại.', 409);
  }
  return data;
}

function calculateTotals(items, appliedCoupon = null) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.unitPrice) * Number(item.quantity)), 0);
  const shipping_fee = subtotal > FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : STANDARD_SHIPPING_FEE;
  let discount_amount = 0;
  if (appliedCoupon?.discount_type === 'percentage') {
    discount_amount = subtotal * (Number(appliedCoupon.discount_value) / 100);
    if (appliedCoupon.maximum_discount_amount != null) {
      discount_amount = Math.min(discount_amount, Number(appliedCoupon.maximum_discount_amount));
    }
  } else if (appliedCoupon?.discount_type === 'fixed') {
    discount_amount = Math.min(Number(appliedCoupon.discount_value), subtotal + shipping_fee);
  } else if (appliedCoupon?.discount_type === 'free_shipping') {
    discount_amount = shipping_fee;
  }
  return {
    subtotal,
    shipping_fee,
    discount_amount,
    total_amount: Math.max(0, subtotal + shipping_fee - discount_amount),
  };
}

module.exports = {
  UUID_RE,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  createOrder,
  quoteOrder,
  listMyOrders,
  listAllOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  calculateTotals,
  normalizeItems,
  buildFingerprint,
};
