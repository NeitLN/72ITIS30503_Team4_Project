import type { ProductSustainability } from '../lib/productJourney';

export interface Seller {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  location?: string;
  seller_rating?: number | string;
  sold_count?: number;
  is_verified_seller?: boolean;
}

export interface Brand {
  name?: string;
  slug?: string;
  is_local?: boolean;
  country?: string;
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
}
