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
      // Fallback to normal products if no featured
      const fallback = await getProducts({ limit: '4' });
      products = fallback.data || [];
    }
  } catch {
    // Graceful failure
  }

  if (!products || products.length === 0) {
    return (
      <section className="py-20">
        <Container>
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Featured Drops</h2>
              <p className="text-gray-500 mt-2">Curated streetwear and vintage finds.</p>
            </div>
          </div>
          <div className="bg-gray-50 border rounded-lg p-10 text-center">
            <p className="text-gray-500">Products are currently unavailable. Check back soon.</p>
          </div>
        </Container>
      </section>
    );
  }

  // Ensure max 4 products for the grid to look clean
  const displayProducts = products.slice(0, 4);

  return (
    <section className="py-20">
      <Container>
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Featured Drops</h2>
            <p className="text-gray-500 mt-2">Curated streetwear and vintage finds.</p>
          </div>
          <Link href={ROUTES.SHOP} className="hidden sm:block text-sm font-semibold hover:underline">
            View All &rarr;
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        <div className="mt-8 text-center sm:hidden">
          <Link href={ROUTES.SHOP} className="text-sm font-semibold underline">
            View All Products
          </Link>
        </div>
      </Container>
    </section>
  );
};
