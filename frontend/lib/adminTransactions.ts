import { getApiBaseUrl } from './api';
import { getStoredToken } from './auth';

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type PaymentState = 'pending' | 'held' | 'failed' | 'refunded' | 'released' | 'disputed';
export type AdminTransactionAction = 'processing' | 'completed' | 'cancelled';

export type SafePayment = {
  id: string;
  state: PaymentState;
  method: string;
  currency: string;
  gross_amount: number;
  platform_fee_total: number;
  seller_amount_total: number;
  card_brand: string | null;
  last_four: string | null;
  version: number;
  held_at: string | null;
  refunded_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminTransactionRow = {
  id: string;
  order_id: string;
  payment_id: string | null;
  order_code: string;
  order_status: OrderStatus;
  payment_method: string;
  payment_state: PaymentState | null;
  total_amount: number;
  buyer: { id: string; full_name: string | null; email: string | null } | null;
  payment: SafePayment | null;
  created_at: string;
  updated_at: string;
};

export type AdminTransactionSummary = {
  total_transactions: number;
  pending_orders: number;
  processing_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  held_payments: number;
  held_amount: number;
  released_payments: number;
  refunded_payments: number;
  failed_payments: number;
};

export type AdminTransactionDetail = {
  id: string;
  order: {
    id: string;
    order_code: string;
    status: OrderStatus;
    payment_method: string;
    subtotal: number;
    shipping_fee: number;
    discount_amount: number;
    total_amount: number;
    created_at: string;
    updated_at: string;
  };
  buyer: { id: string; full_name: string | null; email: string | null } | null;
  payment: SafePayment | null;
  allocations: Array<{
    id: string;
    state: string;
    gross_amount: number;
    platform_fee: number;
    seller_net_amount: number;
    seller: { id: string; full_name: string | null; username: string | null };
    created_at: string;
    updated_at: string;
  }>;
  events: Array<Record<string, string | number | null>>;
  valid_actions: AdminTransactionAction[];
};

export type AdminTransactionFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  paymentState?: string;
  orderStatus?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
};

export type AdminTransactionMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: string;
  direction: string;
};

export class AdminTransactionApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code = 'ADMIN_TRANSACTION_REQUEST_FAILED', status = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AdminTransactionApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function adminTransactionRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new AdminTransactionApiError('Không thể kết nối tới máy chủ.', 'NETWORK_ERROR', 0);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const apiError = payload.error || {};
    throw new AdminTransactionApiError(
      apiError.message || `Yêu cầu thất bại (${response.status}).`,
      apiError.code || 'ADMIN_TRANSACTION_REQUEST_FAILED',
      response.status,
      apiError.details,
    );
  }
  return payload as T;
}

export async function getAdminTransactionSummary(signal?: AbortSignal) {
  const response = await adminTransactionRequest<{ success: true; data: AdminTransactionSummary }>('/api/admin/transactions/summary', { signal });
  return response.data;
}

export async function listAdminTransactions(filters: AdminTransactionFilters, signal?: AbortSignal) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const response = await adminTransactionRequest<{
    success: true;
    data: AdminTransactionRow[];
    meta: AdminTransactionMeta;
  }>(`/api/admin/transactions?${params.toString()}`, { signal });
  return { transactions: response.data, meta: response.meta };
}

export async function getAdminTransaction(id: string) {
  const response = await adminTransactionRequest<{ success: true; data: AdminTransactionDetail }>(
    `/api/admin/transactions/${encodeURIComponent(id)}`,
  );
  return response.data;
}

export async function runAdminTransactionAction(
  id: string,
  body: {
    action: AdminTransactionAction;
    expectedOrderUpdatedAt: string;
    expectedPaymentVersion: number | null;
    idempotencyKey: string;
    reason: string | null;
  },
) {
  const response = await adminTransactionRequest<{
    success: true;
    data: { result: Record<string, unknown>; transaction: AdminTransactionDetail };
  }>(`/api/admin/transactions/${encodeURIComponent(id)}/actions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data;
}
