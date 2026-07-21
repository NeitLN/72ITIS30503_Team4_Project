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

/** Brand equality/search normalization mirrors the backend without removing
 * Vietnamese diacritics: NFC, case-folding, trim, and whitespace collapse. */
export function normalizeBrandText(value: string): string {
  return String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

export function findEquivalentBrand(value: string, brands: BrandOption[]): BrandOption | undefined {
  const target = normalizeBrandText(value);
  return target ? brands.find((brand) => normalizeBrandText(brand.name) === target) : undefined;
}

export async function getBrands() {
  return apiFetch<{ success: boolean; data: BrandOption[] }>('/api/brands', { next: { revalidate: 3600 } });
}

/** Only brands with at least one active product — for the Shop filter,
 * so it never offers an option with zero matching results. */
export async function getShopFilterBrands() {
  // This dataset changes as soon as a seller publishes or hides a listing.
  // Fetch it fresh for each server-rendered Shop request so a newly active
  // brand is immediately searchable. Filtering the returned options remains
  // client-side, so typing never creates per-keystroke API traffic.
  return apiFetch<{ success: boolean; data: BrandOption[] }>('/api/brands?scope=shop-filter', { cache: 'no-store' });
}
