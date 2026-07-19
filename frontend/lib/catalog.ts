import { apiFetch } from './api';
import { Product } from '../types/product';
import { Category } from '../types/category';

export async function getProducts(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<{ success: boolean; data: Product[]; meta: Record<string, unknown> }>(`/api/products${query}`, { cache: 'no-store' });
}

export async function getFeaturedProducts() {
  return apiFetch<{ success: boolean; data: Product[]; meta: Record<string, unknown> }>('/api/products/featured', { cache: 'no-store' });
}

export async function getProductBySlug(slug: string) {
  return apiFetch<{ success: boolean; data: Product }>(`/api/products/${slug}`, { cache: 'no-store' });
}

export async function getCategories() {
  return apiFetch<{ success: boolean; data: Category[] }>('/api/categories', { next: { revalidate: 3600 } });
}

export async function getCategoryTree() {
  return apiFetch<{ success: boolean; data: Category[] }>('/api/categories/tree', { next: { revalidate: 3600 } });
}

export async function getCategoryBySlug(slug: string) {
  return apiFetch<{ success: boolean; data: Category }>(`/api/categories/${slug}`, { next: { revalidate: 3600 } });
}

export async function getProductsByCategorySlug(slug: string, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<{ success: boolean; data: Product[]; meta: { category?: Category; count?: number; page?: number; limit?: number } }>(`/api/categories/${slug}/products${query}`, { cache: 'no-store' });
}

export interface SellerProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
  is_verified_seller: boolean;
  active_listing_count: number;
  sold_count: number;
  seller_rating: number | null;
  review_count: number;
}

export async function getSellerByUsername(username: string) {
  return apiFetch<{ success: boolean; data: SellerProfile }>(`/api/sellers/${username}`, { cache: 'no-store' });
}

export async function getProductsBySeller(username: string, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<{ success: boolean; data: Product[]; meta: Record<string, unknown> }>(`/api/sellers/${username}/products${query}`, { cache: 'no-store' });
}
