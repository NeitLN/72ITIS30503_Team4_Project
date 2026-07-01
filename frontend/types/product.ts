export interface Product {
  id: string;
  seller_id?: string;
  category_id?: string;
  brand_id?: string;
  name: string;
  slug: string;
  description?: string;
  product_type?: 'simple' | 'variable';
  condition: string;
  price: number;
  sale_price?: number | null;
  sku?: string;
  stock_quantity?: number;
  stock_status?: 'in_stock' | 'out_of_stock';
  location?: string;
  thumbnail_url?: string;
  status?: 'draft' | 'active' | 'sold' | 'archived';
  is_featured?: boolean;
  
  // Frontend UI mappings (optional, populated via joins)
  size?: string;
  sellerName?: string;
  sellerUsername?: string;
  imageUrl?: string;
}

