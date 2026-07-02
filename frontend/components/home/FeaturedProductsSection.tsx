import { Container } from '../ui/Container';
import { ProductCard } from '../product/ProductCard';
import { getFeaturedProducts, getProducts } from '../../lib/catalog';
import { Product } from '../../types/product';
import Link from 'next/link';
import { ROUTES } from '../../constants/routes';

export const FeaturedProductsSection = async () => {
  let products: Product[] = [];

  try {
    const res = await getFeaturedProducts();
    if (res.data && res.data.length > 0) {
      products = res.data;
    } else {
      // Fallback to latest listings if nothing is featured
      const fallback = await getProducts({ limit: '4' });
      products = fallback.data || [];
    }
  } catch {
    // Graceful failure — empty state below
  }

  const displayProducts = products.slice(0, 4);

  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              From the community
            </p>
            <h2 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              Featured listings
            </h2>
          </div>
          <Link
            href={ROUTES.SHOP}
            className="hidden whitespace-nowrap border-b border-neutral-900 pb-0.5 text-sm font-semibold text-neutral-900 transition-colors hover:text-neutral-500 sm:block"
          >
            View all listings
          </Link>
        </div>

        {displayProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="border border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
              No listings yet
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Listings are currently unavailable. Check back soon — or be the first to sell.
            </p>
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link href={ROUTES.SHOP} className="border-b border-neutral-900 pb-0.5 text-sm font-semibold">
            View all listings
          </Link>
        </div>
      </Container>
    </section>
  );
};
