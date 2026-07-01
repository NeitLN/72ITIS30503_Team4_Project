export interface Category {
  id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  image?: string;
  sort_order?: number;
  display_order?: number;
  is_active?: boolean;
  children?: Category[];
}

