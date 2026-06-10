import { getSupabaseClient } from "@/lib/supabase";

export type ProductImage = {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type ProductVariant = {
  id: string;
  title: string;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
  size: string;
  color: string | null;
};

export type ProductReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  brand: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  category_slug: string;
  thumbnail: string;
  image_url: string;
  description: string;
  seller_name: string;
  condition: string;
  size: string;
  location: string;
  is_negotiable: boolean;
  stock: number;
  created_at: string;
  average_rating: number;
  review_count: number;
};

export type ProductDetails = Product & {
  images: ProductImage[];
  variants: ProductVariant[];
  reviews: ProductReview[];
  related_products: Product[];
};

export type ProductQuery = {
  category?: string;
  brand?: string;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  limit?: number;
};

type ProductRow = Omit<Product, "average_rating" | "review_count">;

const productFields =
  "id, brand, name, slug, price, sale_price, category_slug, thumbnail, image_url, description, seller_name, condition, size, location, is_negotiable, stock, created_at";

function normalizeProduct(row: Record<string, unknown>): ProductRow {
  return {
    ...(row as unknown as ProductRow),
    price: Number(row.price),
    sale_price: row.sale_price === null ? null : Number(row.sale_price),
    thumbnail: String(row.thumbnail ?? row.image_url),
  };
}

async function addRatings(products: ProductRow[]): Promise<Product[]> {
  const supabase = getSupabaseClient();

  if (!supabase || products.length === 0) {
    return products.map((product) => ({
      ...product,
      average_rating: 0,
      review_count: 0,
    }));
  }

  const { data } = await supabase
    .from("reviews")
    .select("product_id, rating")
    .eq("status", "published")
    .in("product_id", products.map((product) => product.id));

  const ratings = new Map<string, number[]>();
  (data ?? []).forEach((review) => {
    const values = ratings.get(review.product_id) ?? [];
    values.push(review.rating);
    ratings.set(review.product_id, values);
  });

  return products.map((product) => {
    const values = ratings.get(product.id) ?? [];
    return {
      ...product,
      average_rating: values.length
        ? values.reduce((total, rating) => total + rating, 0) / values.length
        : 0,
      review_count: values.length,
    };
  });
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error("Supabase environment variables are not configured.");
    return [];
  }

  let request = supabase
    .from("products")
    .select(productFields)
    .eq("status", "active");

  if (query.category) request = request.eq("category_slug", query.category);
  if (query.brand) request = request.eq("brand", query.brand);
  if (query.search) request = request.ilike("name", `%${query.search}%`);

  if (query.sort === "price_asc") {
    request = request.order("price", { ascending: true });
  } else if (query.sort === "price_desc") {
    request = request.order("price", { ascending: false });
  } else {
    request = request.order("created_at", { ascending: false });
  }

  if (query.limit) request = request.limit(query.limit);

  const { data, error } = await request;

  if (error) {
    console.error("Could not load products from Supabase:", error.message);
    return [];
  }

  return addRatings((data ?? []).map(normalizeProduct));
}

export async function getProductBrands(): Promise<string[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("products")
    .select("brand")
    .eq("status", "active")
    .order("brand");

  if (error) return [];
  return Array.from(new Set((data ?? []).map((row) => row.brand)));
}

export async function getProductBySlug(slug: string): Promise<ProductDetails | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: productData, error } = await supabase
    .from("products")
    .select(productFields)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !productData) return null;

  const productRow = normalizeProduct(productData);
  const [{ data: imageData }, { data: variantData }, { data: reviewData }, related] =
    await Promise.all([
      supabase
        .from("product_images")
        .select("id, url, alt_text, sort_order, is_primary")
        .eq("product_id", productRow.id)
        .order("is_primary", { ascending: false })
        .order("sort_order"),
      supabase
        .from("product_variants")
        .select("id, title, price, sale_price, stock, status")
        .eq("product_id", productRow.id)
        .order("title"),
      supabase
        .from("reviews")
        .select("id, rating, title, comment, created_at")
        .eq("product_id", productRow.id)
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      getProducts({ category: productRow.category_slug, limit: 5 }),
    ]);

  const reviews = (reviewData ?? []) as ProductReview[];
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;

  const variants = (variantData ?? []).map((variant) => {
    const [sizePart, colorPart] = variant.title.split(" / ");
    return {
      ...variant,
      price: Number(variant.price),
      sale_price: variant.sale_price === null ? null : Number(variant.sale_price),
      size: sizePart.replace(/^Size /, ""),
      color: colorPart ?? null,
    };
  }) as ProductVariant[];

  return {
    ...productRow,
    average_rating: averageRating,
    review_count: reviews.length,
    images: (imageData ?? []) as ProductImage[],
    variants,
    reviews,
    related_products: related
      .filter((product) => product.id !== productRow.id)
      .slice(0, 4),
  };
}
