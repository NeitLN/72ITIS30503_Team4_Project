export interface Category {
  id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

