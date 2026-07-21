import { apiFetch } from './api';

export interface BrandOption {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  source?: 'catalog' | 'seller_declared';
  verification_status?: 'verified' | 'pending' | 'rejected';
}

export async function getBrands() {
  return apiFetch<{ success: boolean; data: BrandOption[] }>('/api/brands', { next: { revalidate: 3600 } });
}

/** Only brands with at least one active product — for the Shop filter,
 * so it never offers an option with zero matching results. */
export async function getShopFilterBrands() {
  return apiFetch<{ success: boolean; data: BrandOption[] }>('/api/brands?scope=shop-filter', { next: { revalidate: 60 } });
}
