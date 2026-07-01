import { apiFetch } from './api';
import { Product } from '../types/product';
import { Category } from '../types/category';

export async function getProducts(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<{ success: boolean; data: Product[]; meta: Record<string, unknown> }>(`/api/products${query}`, { next: { revalidate: 60 } });
}

export async function getFeaturedProducts() {
  return apiFetch<{ success: boolean; data: Product[]; meta: Record<string, unknown> }>('/api/products/featured', { next: { revalidate: 60 } });
}

export async function getProductBySlug(slug: string) {
  return apiFetch<{ success: boolean; data: Product }>(`/api/products/${slug}`, { next: { revalidate: 60 } });
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
  return apiFetch<{ success: boolean; data: Product[]; meta: { category?: Category; count?: number; page?: number; limit?: number } }>(`/api/categories/${slug}/products${query}`, { next: { revalidate: 60 } });
}
