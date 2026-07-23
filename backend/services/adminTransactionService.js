const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { ServiceError, fromRpcError } = require('../utils/serviceError');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PAGE_SIZE = 50;
const ORDER_STATUSES = new Set(['pending', 'processing', 'completed', 'cancelled']);
const PAYMENT_STATES = new Set(['pending', 'held', 'failed', 'refunded', 'released', 'disputed']);
const PAYMENT_METHODS = new Set(['cod', 'bank_transfer', 'simulated_card']);
const SORT_FIELDS = new Set(['created_at', 'total_amount', 'order_code', 'status']);
const DIRECTIONS = new Set(['asc', 'desc']);
const ACTIONS = new Set(['processing', 'completed', 'cancelled']);

function checkDb() {
  if (!isSupabaseAdminConfigured()) {
    throw new ServiceError('DATABASE_NOT_CONFIGURED', 'Hệ thống chưa được cấu hình.', 503);
  }
}

function invalidQuery(message) {
  throw new ServiceError('INVALID_TRANSACTION_QUERY', message, 400);
}

function parseDate(value, label) {
  if (value == null || value === '') return null;
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) invalidQuery(`${label} không hợp lệ.`);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    invalidQuery(`${label} không hợp lệ.`);
  }
  return text;
}

function normalizeAdminTransactionQuery(raw = {}) {
  const page = Number(raw.page ?? 1);
  const requestedPageSize = Number(raw.pageSize ?? 20);
  if (!Number.isInteger(page) || page < 1) invalidQuery('Trang không hợp lệ.');
  if (!Number.isInteger(requestedPageSize) || requestedPageSize < 1) invalidQuery('Kích thước trang không hợp lệ.');

  const orderStatus = raw.orderStatus ? String(raw.orderStatus).trim().toLowerCase() : null;
  const paymentState = raw.paymentState ? String(raw.paymentState).trim().toLowerCase() : null;
  const paymentMethod = raw.paymentMethod ? String(raw.paymentMethod).trim().toLowerCase() : null;
  const sort = String(raw.sort || 'created_at').trim().toLowerCase();
  const direction = String(raw.direction || 'desc').trim().toLowerCase();
  const search = String(raw.search || '').trim();
  const dateFrom = parseDate(raw.dateFrom, 'Ngày bắt đầu');
  const dateTo = parseDate(raw.dateTo, 'Ngày kết thúc');

  if (orderStatus && !ORDER_STATUSES.has(orderStatus)) invalidQuery('Trạng thái đơn hàng không hợp lệ.');
  if (paymentState && !PAYMENT_STATES.has(paymentState)) invalidQuery('Trạng thái thanh toán không hợp lệ.');
  if (paymentMethod && !PAYMENT_METHODS.has(paymentMethod)) invalidQuery('Phương thức thanh toán không hợp lệ.');
  if (!SORT_FIELDS.has(sort)) invalidQuery('Tiêu chí sắp xếp không hợp lệ.');
  if (!DIRECTIONS.has(direction)) invalidQuery('Thứ tự sắp xếp không hợp lệ.');
  if (search.length > 100 || (search && !/^[\p{L}\p{N}@._\-\s]+$/u.test(search))) {
    invalidQuery('Từ khóa tìm kiếm không hợp lệ.');
  }
  if (dateFrom && dateTo && dateFrom > dateTo) invalidQuery('Khoảng ngày không hợp lệ.');

  return {
    page,
    pageSize: Math.min(requestedPageSize, MAX_PAGE_SIZE),
    orderStatus,
    paymentState,
    paymentMethod,
    sort,
    direction,
    search: search || null,
    dateFrom,
    dateTo,
  };
}

function normalizeAdminAction(raw = {}) {
  const action = String(raw.action || '').trim().toLowerCase();
  const expectedOrderUpdatedAt = String(raw.expectedOrderUpdatedAt || '').trim();
  const idempotencyKey = String(raw.idempotencyKey || '').trim().toLowerCase();
  const reason = String(raw.reason || '').trim() || null;
  const expectedPaymentVersion = raw.expectedPaymentVersion == null
    ? null
    : Number(raw.expectedPaymentVersion);

  if (!ACTIONS.has(action)) {
    throw new ServiceError('INVALID_ADMIN_TRANSACTION_ACTION', 'Thao tác quản trị giao dịch không hợp lệ.', 400);
  }
  if (!expectedOrderUpdatedAt || Number.isNaN(Date.parse(expectedOrderUpdatedAt))) {
    throw new ServiceError('TRANSACTION_STATE_CONFLICT', 'Thiếu phiên bản giao dịch. Vui lòng tải lại.', 409);
  }
  if (!UUID_RE.test(idempotencyKey)) {
    throw new ServiceError('INVALID_IDEMPOTENCY_KEY', 'Idempotency key không hợp lệ.', 400);
  }
  if (expectedPaymentVersion !== null
      && (!Number.isInteger(expectedPaymentVersion) || expectedPaymentVersion < 1)) {
    throw new ServiceError('TRANSACTION_STATE_CONFLICT', 'Phiên bản thanh toán không hợp lệ.', 409);
  }
  if (['completed', 'cancelled'].includes(action) && !reason) {
    throw new ServiceError('ADMIN_REASON_REQUIRED', 'Vui lòng nhập lý do cho thao tác này.', 422);
  }
  if (reason && reason.length > 1000) {
    throw new ServiceError('ADMIN_REASON_REQUIRED', 'Lý do không được vượt quá 1000 ký tự.', 422);
  }

  return { action, expectedOrderUpdatedAt, expectedPaymentVersion, idempotencyKey, reason };
}

function toSafeAdminPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    state: row.state,
    method: row.payment_method,
    currency: row.currency,
    gross_amount: Number(row.gross_amount),
    platform_fee_total: Number(row.platform_fee_total),
    seller_amount_total: Number(row.seller_amount_total),
    card_brand: row.card_brand || null,
    last_four: row.card_last_four || null,
    version: Number(row.version),
    held_at: row.held_at || null,
    refunded_at: row.refunded_at || null,
    released_at: row.released_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function safeBuyer(row) {
  if (!row) return null;
  return { id: row.id, full_name: row.full_name || null, email: row.email || null };
}

async function verifyAdminActor(user) {
  checkDb();
  if (!user?.id || !UUID_RE.test(String(user.id))) {
    throw new ServiceError('ADMIN_REQUIRED', 'Yêu cầu quyền quản trị viên.', 403);
  }
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,role')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new ServiceError('ADMIN_AUTHORIZATION_FAILED', 'Không thể xác minh quyền quản trị.', 503);
  if (!data || data.role !== 'admin') {
    throw new ServiceError('ADMIN_REQUIRED', 'Yêu cầu quyền quản trị viên.', 403);
  }
  return data;
}

async function getTransactionSummary(user) {
  await verifyAdminActor(user);
  const { data, error } = await supabaseAdmin.rpc('stylehub_admin_transaction_summary', {
    p_actor_id: user.id,
  });
  if (error) throw fromRpcError(error, 'Không thể tải tổng quan giao dịch.');
  return {
    total_transactions: Number(data.totalTransactions || 0),
    pending_orders: Number(data.pendingOrders || 0),
    processing_orders: Number(data.processingOrders || 0),
    completed_orders: Number(data.completedOrders || 0),
    cancelled_orders: Number(data.cancelledOrders || 0),
    held_payments: Number(data.heldPayments || 0),
    held_amount: Number(data.heldAmount || 0),
    released_payments: Number(data.releasedPayments || 0),
    refunded_payments: Number(data.refundedPayments || 0),
    failed_payments: Number(data.failedPayments || 0),
  };
}

async function matchingOrderIdsForPaymentState(state) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('order_id')
    .eq('payment_method', 'simulated_card')
    .eq('state', state)
    .limit(10000);
  if (error) throw new ServiceError('TRANSACTION_LIST_FAILED', 'Không thể tải danh sách giao dịch.', 500);
  return (data || []).map((row) => row.order_id);
}

async function matchingSearchParts(search) {
  const pattern = `%${search}%`;
  const [{ data: users, error: userError }, { data: payments, error: paymentError }] = await Promise.all([
    supabaseAdmin.from('users').select('id').or(`full_name.ilike.${pattern},email.ilike.${pattern}`).limit(100),
    UUID_RE.test(search)
      ? supabaseAdmin.from('payments').select('id,order_id').or(`id.eq.${search},order_id.eq.${search}`).limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (userError || paymentError) throw new ServiceError('TRANSACTION_LIST_FAILED', 'Không thể tìm kiếm giao dịch.', 500);
  return {
    userIds: (users || []).map((row) => row.id),
    orderIds: (payments || []).map((row) => row.order_id),
  };
}

async function hydrateTransactionRows(orders) {
  if (!orders.length) return [];
  const orderIds = orders.map((order) => order.id);
  const buyerIds = [...new Set(orders.map((order) => order.user_id))];
  const [{ data: payments, error: paymentError }, { data: buyers, error: buyerError }] = await Promise.all([
    supabaseAdmin
      .from('payments')
      .select('id,order_id,state,payment_method,currency,gross_amount,platform_fee_total,seller_amount_total,card_brand,card_last_four,version,held_at,refunded_at,released_at,created_at,updated_at')
      .in('order_id', orderIds),
    supabaseAdmin.from('users').select('id,full_name,email').in('id', buyerIds),
  ]);
  if (paymentError || buyerError) throw new ServiceError('TRANSACTION_LIST_FAILED', 'Không thể tải dữ liệu giao dịch.', 500);
  const paymentByOrder = new Map((payments || []).map((payment) => [payment.order_id, payment]));
  const buyerById = new Map((buyers || []).map((buyer) => [buyer.id, buyer]));
  return orders.map((order) => {
    const payment = paymentByOrder.get(order.id) || null;
    return {
      id: payment?.id || order.id,
      order_id: order.id,
      payment_id: payment?.id || null,
      order_code: order.order_code,
      order_status: order.status,
      payment_method: order.payment_method,
      payment_state: payment?.state || null,
      total_amount: Number(order.total_amount),
      buyer: safeBuyer(buyerById.get(order.user_id)),
      payment: toSafeAdminPayment(payment),
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  });
}

async function listTransactions(user, rawQuery) {
  await verifyAdminActor(user);
  const filters = normalizeAdminTransactionQuery(rawQuery);
  let query = supabaseAdmin
    .from('orders')
    .select('id,order_code,user_id,status,payment_method,total_amount,created_at,updated_at', { count: 'exact' });

  if (filters.orderStatus) query = query.eq('status', filters.orderStatus);
  if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
  if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) {
    const exclusiveEnd = new Date(`${filters.dateTo}T00:00:00.000Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    query = query.lt('created_at', exclusiveEnd.toISOString());
  }

  if (filters.paymentState) {
    const ids = await matchingOrderIdsForPaymentState(filters.paymentState);
    if (!ids.length) return { rows: [], meta: { ...filters, total: 0, totalPages: 0 } };
    query = query.in('id', ids);
  }

  if (filters.search) {
    const matches = await matchingSearchParts(filters.search);
    const clauses = [`order_code.ilike.%${filters.search}%`];
    if (UUID_RE.test(filters.search)) clauses.push(`id.eq.${filters.search}`);
    if (matches.userIds.length) clauses.push(`user_id.in.(${matches.userIds.join(',')})`);
    if (matches.orderIds.length) clauses.push(`id.in.(${matches.orderIds.join(',')})`);
    query = query.or(clauses.join(','));
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  query = query
    .order(filters.sort, { ascending: filters.direction === 'asc' })
    .order('id', { ascending: filters.direction === 'asc' })
    .range(from, to);
  const { data, error, count } = await query;
  if (error) throw new ServiceError('TRANSACTION_LIST_FAILED', 'Không thể tải danh sách giao dịch.', 500);
  const rows = await hydrateTransactionRows(data || []);
  const total = Number(count || 0);
  return {
    rows,
    meta: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / filters.pageSize),
      sort: filters.sort,
      direction: filters.direction,
    },
  };
}

async function resolveOrderId(transactionId) {
  if (!UUID_RE.test(String(transactionId || ''))) {
    throw new ServiceError('TRANSACTION_NOT_FOUND', 'Không tìm thấy giao dịch.', 404);
  }
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select('order_id')
    .eq('id', transactionId)
    .maybeSingle();
  if (error) throw new ServiceError('TRANSACTION_LOAD_FAILED', 'Không thể tải giao dịch.', 500);
  return payment?.order_id || transactionId;
}

function validActions(orderStatus) {
  if (orderStatus === 'pending') return ['processing', 'cancelled'];
  if (orderStatus === 'processing') return ['completed', 'cancelled'];
  return [];
}

async function getTransaction(user, transactionId) {
  await verifyAdminActor(user);
  const orderId = await resolveOrderId(transactionId);
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id,order_code,user_id,status,payment_method,subtotal,shipping_fee,discount_amount,total_amount,created_at,updated_at')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) throw new ServiceError('TRANSACTION_LOAD_FAILED', 'Không thể tải giao dịch.', 500);
  if (!order) throw new ServiceError('TRANSACTION_NOT_FOUND', 'Không tìm thấy giao dịch.', 404);

  const [{ data: buyer, error: buyerError }, { data: payment, error: paymentError }] = await Promise.all([
    supabaseAdmin.from('users').select('id,full_name,email').eq('id', order.user_id).maybeSingle(),
    supabaseAdmin
      .from('payments')
      .select('id,order_id,state,payment_method,currency,gross_amount,platform_fee_total,seller_amount_total,card_brand,card_last_four,version,held_at,refunded_at,released_at,created_at,updated_at')
      .eq('order_id', order.id)
      .maybeSingle(),
  ]);
  if (buyerError || paymentError) throw new ServiceError('TRANSACTION_LOAD_FAILED', 'Không thể tải giao dịch.', 500);

  let allocations = [];
  let paymentEvents = [];
  if (payment) {
    const [{ data: allocationRows, error: allocationError }, { data: eventRows, error: eventError }] = await Promise.all([
      supabaseAdmin
        .from('payment_allocations')
        .select('id,seller_id,state,gross_amount,platform_fee,seller_net_amount,created_at,updated_at')
        .eq('payment_id', payment.id)
        .order('seller_id'),
      supabaseAdmin
        .from('payment_events')
        .select('id,previous_state,new_state,event_type,actor_type,actor_id,reason,created_at')
        .eq('payment_id', payment.id)
        .order('created_at')
        .order('id'),
    ]);
    if (allocationError || eventError) throw new ServiceError('TRANSACTION_LOAD_FAILED', 'Không thể tải lịch sử giao dịch.', 500);
    const sellerIds = (allocationRows || []).map((row) => row.seller_id);
    const { data: sellers, error: sellerError } = sellerIds.length
      ? await supabaseAdmin.from('users').select('id,full_name,username').in('id', sellerIds)
      : { data: [], error: null };
    if (sellerError) throw new ServiceError('TRANSACTION_LOAD_FAILED', 'Không thể tải phân bổ giao dịch.', 500);
    const sellerById = new Map((sellers || []).map((seller) => [seller.id, seller]));
    allocations = (allocationRows || []).map((row) => ({
      id: row.id,
      state: row.state,
      gross_amount: Number(row.gross_amount),
      platform_fee: Number(row.platform_fee),
      seller_net_amount: Number(row.seller_net_amount),
      seller: sellerById.has(row.seller_id) ? {
        id: row.seller_id,
        full_name: sellerById.get(row.seller_id).full_name || null,
        username: sellerById.get(row.seller_id).username || null,
      } : { id: row.seller_id, full_name: null, username: null },
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
    paymentEvents = eventRows || [];
  }

  const { data: adminEvents, error: adminEventError } = await supabaseAdmin
    .from('admin_transaction_events')
    .select('id,actor_id,action,reason,previous_order_status,new_order_status,previous_payment_state,new_payment_state,created_at')
    .eq('order_id', order.id)
    .order('created_at')
    .order('id');
  if (adminEventError) throw new ServiceError('TRANSACTION_LOAD_FAILED', 'Không thể tải lịch sử quản trị.', 500);

  const actorIds = [...new Set((adminEvents || []).map((event) => event.actor_id).filter(Boolean))];
  const { data: actors, error: actorError } = actorIds.length
    ? await supabaseAdmin.from('users').select('id,full_name').in('id', actorIds)
    : { data: [], error: null };
  if (actorError) throw new ServiceError('TRANSACTION_LOAD_FAILED', 'Không thể tải lịch sử quản trị.', 500);
  const actorById = new Map((actors || []).map((actor) => [actor.id, actor]));

  const events = [
    ...paymentEvents.map((event) => ({ ...event, source: 'payment' })),
    ...(adminEvents || []).map((event) => ({
      ...event,
      source: 'admin',
      actor_name: actorById.get(event.actor_id)?.full_name || null,
    })),
  ].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));

  return {
    id: payment?.id || order.id,
    order: {
      id: order.id,
      order_code: order.order_code,
      status: order.status,
      payment_method: order.payment_method,
      subtotal: Number(order.subtotal),
      shipping_fee: Number(order.shipping_fee),
      discount_amount: Number(order.discount_amount || 0),
      total_amount: Number(order.total_amount),
      created_at: order.created_at,
      updated_at: order.updated_at,
    },
    buyer: safeBuyer(buyer),
    payment: toSafeAdminPayment(payment),
    allocations,
    events,
    valid_actions: validActions(order.status),
  };
}

async function transitionTransaction(user, transactionId, rawAction) {
  await verifyAdminActor(user);
  const action = normalizeAdminAction(rawAction);
  const orderId = await resolveOrderId(transactionId);
  const { data, error } = await supabaseAdmin.rpc('stylehub_admin_transition_transaction', {
    p_actor_id: user.id,
    p_order_id: orderId,
    p_next_status: action.action,
    p_expected_order_updated_at: action.expectedOrderUpdatedAt,
    p_expected_payment_version: action.expectedPaymentVersion,
    p_reason: action.reason,
    p_idempotency_key: action.idempotencyKey,
  });
  if (error) throw fromRpcError(error, 'Không thể cập nhật giao dịch.');
  const transaction = await getTransaction(user, orderId);
  return {
    result: {
      order_id: data.orderId,
      payment_id: data.paymentId || null,
      order_status: data.orderStatus,
      order_updated_at: data.orderUpdatedAt || transaction.order.updated_at,
      payment_state: data.paymentState || null,
      payment_version: data.paymentVersion == null ? transaction.payment?.version || null : Number(data.paymentVersion),
      idempotent_replay: Boolean(data.idempotentReplay),
      event_id: data.eventId,
      message: data.message,
    },
    transaction,
  };
}

module.exports = {
  MAX_PAGE_SIZE,
  normalizeAdminTransactionQuery,
  normalizeAdminAction,
  toSafeAdminPayment,
  verifyAdminActor,
  getTransactionSummary,
  listTransactions,
  getTransaction,
  transitionTransaction,
};
