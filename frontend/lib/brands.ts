import { apiFetch } from './api';

export interface BrandOption {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

export async function getBrands() {
  return apiFetch<{ success: boolean; data: BrandOption[] }>('/api/brands', { next: { revalidate: 3600 } });
}
