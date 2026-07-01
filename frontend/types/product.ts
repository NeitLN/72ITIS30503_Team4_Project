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
  condition: string;
  price: number;
  sale_price?: number | null;
  sku?: string;
  stock_quantity?: number;
  stock?: number;
  stock_status?: 'in_stock' | 'out_of_stock';
  location?: string;
  thumbnail_url?: string;
  image?: string;
  status?: 'draft' | 'active' | 'sold' | 'archived';
  is_featured?: boolean;
  created_at?: string;
  
  // Relations
  seller?: Record<string, unknown>;
  brand?: Record<string, unknown>;
  category?: Record<string, unknown>;
  images?: Record<string, unknown>[];
  variants?: Record<string, unknown>[];
  
  // Frontend UI mappings (optional, populated via joins)
  size?: string;
  sellerName?: string;
  sellerUsername?: string;
  imageUrl?: string;
}

