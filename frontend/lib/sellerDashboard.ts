import { getApiBaseUrl } from './api';
import { getStoredToken } from './auth';
import type { ProductSustainability } from './productJourney';

export interface SellerListingImage {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface SellerListing {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_slug: string;
  brand: string | null;
  brand_id: string | null;
  condition: string;
  size: string;
  price: number;
  sale_price: number | null;
  stock: number;
  location: string;
  is_negotiable: boolean;
  status: 'draft' | 'active' | 'hidden' | 'sold' | 'archived';
  image_url: string | null;
  thumbnail: string | null;
  is_featured: boolean;
  listing_source: 'user';
  seller_id: string;
  created_at: string;
  updated_at: string;
  images: SellerListingImage[];
  sustainability: ProductSustainability;
}

export interface SellerListingStats {
  activeListings: number;
  hiddenOrDraftListings: number;
  soldUnits: number;
  ordersRequiringAction: number;
  grossMerchandiseValue: number;
}

export interface SellerOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_slug: string | null;
  image_url: string | null;
  size: string | null;
  condition: string | null;
  quantity: number;
  unit_price: number | null;
  price: number | null;
  line_total: number | null;
  fulfillment_status: string;
  created_at: string;
  order: {
    id: string;
    order_code: string;
    status: string;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    shipping_address: string;
    city: string;
  } | null;
}

type ApiResult<T> =
  | { success: true; data: T; meta?: { page: number; limit: number; count: number } }
  | { success: false; error: { message: string; details?: Record<string, string> } };

function authHeaders(extra?: Record<string, string>) {
  const token = getStoredToken();
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function authedJson<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: authHeaders({ 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> | undefined) }),
  });
  return res.json();
}

export async function getMyListingStats(): Promise<ApiResult<SellerListingStats>> {
  return authedJson('/api/seller/listings/stats');
}

export async function getMyListings(params: {
  page?: number; limit?: number; status?: string; category?: string; search?: string; sort?: string;
} = {}): Promise<ApiResult<SellerListing[]>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return authedJson(`/api/seller/listings${qs ? `?${qs}` : ''}`);
}

export async function getMyListing(id: string): Promise<ApiResult<SellerListing>> {
  return authedJson(`/api/seller/listings/${id}`);
}

export async function deleteDraftListing(id: string): Promise<ApiResult<{ deleted: true }>> {
  return authedJson(`/api/seller/listings/${id}`, { method: 'DELETE' });
}

export async function duplicateListing(id: string): Promise<ApiResult<SellerListing>> {
  return authedJson(`/api/seller/listings/${id}/duplicate`, { method: 'POST' });
}

export async function updateMyListing(id: string, fields: Record<string, unknown>): Promise<ApiResult<SellerListing>> {
  return authedJson(`/api/seller/listings/${id}`, { method: 'PATCH', body: JSON.stringify(fields) });
}

export async function transitionListingStatus(id: string, status: string): Promise<ApiResult<SellerListing>> {
  return authedJson(`/api/seller/listings/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
}

export async function addListingImages(id: string, files: File[]): Promise<ApiResult<SellerListing>> {
  const form = new FormData();
  files.forEach((f) => form.append('images', f));
  const res = await fetch(`${getApiBaseUrl()}/api/seller/listings/${id}/images`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return res.json();
}

export async function reorderListingImages(id: string, imageIds: string[]): Promise<ApiResult<SellerListing>> {
  return authedJson(`/api/seller/listings/${id}/images/reorder`, { method: 'PATCH', body: JSON.stringify({ imageIds }) });
}

export async function removeListingImage(id: string, imageId: string): Promise<ApiResult<SellerListing>> {
  return authedJson(`/api/seller/listings/${id}/images/${imageId}`, { method: 'DELETE' });
}

export async function getMyOrderItems(params: {
  page?: number; limit?: number; status?: string;
} = {}): Promise<ApiResult<SellerOrderItem[]>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return authedJson(`/api/seller/orders${qs ? `?${qs}` : ''}`);
}

export async function getMyOrder(orderId: string): Promise<ApiResult<{ order: SellerOrderItem['order']; items: SellerOrderItem[]; myTotal: number }>> {
  return authedJson(`/api/seller/orders/${orderId}`);
}

export async function updateFulfillmentStatus(itemId: string, status: string): Promise<ApiResult<{ id: string; fulfillment_status: string }>> {
  return authedJson(`/api/seller/orders/items/${itemId}/fulfillment`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export interface SellerFinanceSummary {
  gross_revenue: number;
  escrow_amount: number;
  released_amount: number;
  refunded_amount: number;
  disputed_amount: number;
  available_balance: number;
  paid_out_amount: number;
  platform_fees: number;
  pending_orders: number;
  payout_method: {
    status: string;
    label: string;
  };
}

export interface SellerFinanceLedgerEntry {
  id: string;
  order_code: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  state: string;
  payment_method: string;
  created_at: string;
  released_at: string | null;
}

export async function getSellerFinanceSummary(): Promise<ApiResult<SellerFinanceSummary>> {
  return authedJson('/api/seller/finance/summary');
}

export async function getSellerFinanceLedger(params: { page?: number; limit?: number } = {}): Promise<ApiResult<SellerFinanceLedgerEntry[]>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return authedJson(`/api/seller/finance/ledger${qs ? `?${qs}` : ''}`);
}
