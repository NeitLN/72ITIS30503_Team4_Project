import { Container } from '../../components/ui/Container';
import { ProductCard } from '../../components/product/ProductCard';
import { ShopHero } from '../../components/shop/ShopHero';
import { ShopToolbar } from '../../components/shop/ShopToolbar';
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

export default async function ShopPage() {
  let products: Product[] = [];
  let count: number | null = null;
  let categories: Category[] = [];
  let hasError = false;

  try {
    const res = await getProducts();
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
            <ShopToolbar count={count} categories={categories} />
            {products.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <ShopEmptyState variant="empty" />
            )}
            {count != null && products.length > 0 && (
              <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                Showing {products.length} of {count} listings
              </p>
            )}
          </>
        )}
      </Container>
    </>
  );
}
