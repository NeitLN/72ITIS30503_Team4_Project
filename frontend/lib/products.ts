import { getSupabaseClient } from "@/lib/supabase";

export type Product = {
  id: string;
  brand: string;
  name: string;
  slug: string;
  price: number;
  category_slug: string;
  image_url: string;
  description: string;
  seller_name: string;
  condition: string;
  size: string;
  location: string;
  is_negotiable: boolean;
  created_at: string;
};

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error("Supabase environment variables are not configured.");
    return [];
  }

  let query = supabase
    .from("products")
    .select(
      "id, brand, name, slug, price, category_slug, image_url, description, seller_name, condition, size, location, is_negotiable, created_at",
    )
    .order("created_at", { ascending: false });

  if (categorySlug) {
    query = query.eq("category_slug", categorySlug);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Could not load products from Supabase:", error.message);
    return [];
  }

  return (data ?? []).map((product) => ({
    ...product,
    price: Number(product.price),
  })) as Product[];
}
