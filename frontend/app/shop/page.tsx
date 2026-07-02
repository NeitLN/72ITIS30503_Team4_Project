import { Container } from '../../components/ui/Container';
import { ProductCard } from '../../components/product/ProductCard';
import { ShopHero } from '../../components/shop/ShopHero';
import { ShopFilters } from '../../components/shop/ShopFilters';
import { ShopEmptyState } from '../../components/shop/ShopEmptyState';
import { getProducts, getCategories } from '../../lib/catalog';
import { Product } from '../../types/product';
import { Category } from '../../types/category';
import { Metadata } from 'next';

export const revalidate = 60; // Revalidate cache every 60 seconds

export const metadata: Metadata = {
  title: 'Marketplace',
  description:
    'Discover local brands, pre-loved pieces, and streetwear listings from sellers across Vietnam.',
};

interface ShopPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    condition?: string;
    brand?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  // Build API parameters from URL search parameters
  const apiParams: Record<string, string> = {};
  if (params.search) apiParams.search = params.search;
  if (params.category) apiParams.category = params.category;
  if (params.condition) apiParams.condition = params.condition;
  if (params.brand) apiParams.brand = params.brand;

  let products: Product[] = [];
  let count: number | null = null;
  let categories: Category[] = [];
  let hasError = false;

  try {
    const res = await getProducts(apiParams);
    products = res.data || [];
    const metaCount = res.meta?.count;
    count = typeof metaCount === 'number' ? metaCount : products.length;
  } catch {
    hasError = true;
  }

  try {
    const res = await getCategories();
    categories = res.data || [];
  } catch {
    // Toolbar renders without category chips
  }

  return (
    <>
      <ShopHero />
      <Container className="py-10 sm:py-14">
        {hasError ? (
          <ShopEmptyState variant="error" />
        ) : (
          <>
            <ShopFilters categories={categories} initialFilters={params} />

            {count != null && products.length > 0 && (
              <div className="mb-6 flex justify-between items-baseline border-b border-neutral-100 pb-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                  Showing {products.length} of {count} listings
                </p>
              </div>
            )}

            {products.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <ShopEmptyState variant="empty" />
            )}
          </>
        )}
      </Container>
    </>
  );
}
