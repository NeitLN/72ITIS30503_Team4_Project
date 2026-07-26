import type { ProductSustainability } from '../lib/productJourney';

export interface Seller {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  location?: string;
  seller_rating?: number | string;
  sold_count?: number;
}

export interface Brand {
  name?: string;
  slug?: string;
  is_local?: boolean;
  country?: string;
  /** 'catalog' = curated StyleHub catalog brand; 'seller_declared' = typed
   * in by a seller at listing time (see docs/seller-declared-brand-workflow.md). */
  source?: 'catalog' | 'seller_declared';
  /** 'verified' for every existing catalog brand; a brand a seller creates
   * is always 'pending' — StyleHub does not independently verify it. */
  verification_status?: 'verified' | 'pending' | 'rejected';
}

export interface CategoryRef {
  name?: string;
  slug?: string;
}

export interface ProductImage {
  image_url: string;
  alt_text?: string;
  sort_order?: number;
  is_primary?: boolean;
}

export interface Product {
  id: string;
  seller_id?: string;
  category_id?: string;
  brand_id?: string;
  name?: string;
  title?: string;
  slug: string;
  description?: string;
  product_type?: 'simple' | 'variable';
  inventory_mode?: 'simple' | 'variant';
  condition: string;
  price: number;
  sale_price?: number | null;
  sku?: string;
  stock_quantity?: number;
  stock?: number;
  stock_status?: 'in_stock' | 'out_of_stock';
  location?: string;
  is_negotiable?: boolean;
  thumbnail_url?: string;
  thumbnail?: string;
  image_url?: string;
  image?: string;
  status?: 'draft' | 'active' | 'hidden' | 'sold' | 'archived';
  is_featured?: boolean;
  created_at?: string;

  // Relations (populated by the API via joins)
  seller?: Seller | null;
  brand?: Brand | null;
  category?: CategoryRef | null;
  images?: ProductImage[];
  variants?: Record<string, unknown>[];
  sustainability?: ProductSustainability;

  // Flat UI mappings (some endpoints return these instead of relations)
  size?: string;
  seller_name?: string;
  sellerName?: string;
  sellerUsername?: string;
  category_slug?: string;
  imageUrl?: string;
  /** Seller Dashboard's flat listing endpoints return these alongside the
   * flat `brand` name string instead of a nested `brand` relation object —
   * see backend/services/sellerListingService.js. */
  brand_source?: 'catalog' | 'seller_declared' | null;
  brand_verification_status?: 'verified' | 'pending' | 'rejected' | null;
}
