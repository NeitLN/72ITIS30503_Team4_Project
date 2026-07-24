import { getApiBaseUrl } from './api';
import { getStoredToken } from './auth';

export class OrderApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code = 'ORDER_REQUEST_FAILED', status = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'OrderApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function orderRequest(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new OrderApiError('Không thể kết nối tới máy chủ. Bạn có thể thử lại mà không lo tạo đơn trùng.', 'NETWORK_ERROR', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const apiError = data.error || {};
    throw new OrderApiError(
      apiError.message || data.message || `Yêu cầu thất bại (${response.status}).`,
      apiError.code || 'ORDER_REQUEST_FAILED',
      response.status,
      apiError.details,
    );
  }
  return data;
}

export function createOrder(payload: Record<string, unknown>, idempotencyKey: string) {
  return orderRequest('/api/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
}

export function previewOrder(payload: { items: Record<string, unknown>[]; couponCode?: string }) {
  return orderRequest('/api/orders/preview', { method: 'POST', body: JSON.stringify(payload) });
}

export function getOrderById(orderId: string) {
  return orderRequest(`/api/orders/${encodeURIComponent(orderId)}`);
}

export function cancelOrder(orderId: string) {
  return orderRequest(`/api/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' });
}

export function listAllOrdersForAdmin(filters?: { query?: string; orderStatus?: string; paymentMethod?: string }) {
  const params = new URLSearchParams();
  if (filters?.query) params.append('query', filters.query);
  if (filters?.orderStatus) params.append('orderStatus', filters.orderStatus);
  if (filters?.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return orderRequest(`/api/orders${queryStr}`);
}

export function updateOrderStatus(orderId: string, status: string) {
  return orderRequest(`/api/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function listMyOrders() {
  return orderRequest('/api/orders/my');
}

export function validateCoupon(payload: { code: string; items: Record<string, unknown>[] }) {
  return orderRequest('/api/orders/validate-coupon', { method: 'POST', body: JSON.stringify(payload) });
}
