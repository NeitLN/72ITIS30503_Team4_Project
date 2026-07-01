import { Container } from '../../components/ui/Container';
import { ProductCard } from '../../components/product/ProductCard';
import { getProducts } from '../../lib/catalog';

export const revalidate = 60; // Revalidate cache every 60 seconds

export default async function ShopPage() {
  let products: import('../../types/product').Product[] = [];
  let meta: Record<string, unknown> | null = null;
  let hasError = false;

  try {
    const res = await getProducts();
    products = res.data || [];
    meta = res.meta || null;
  } catch (error) {
    hasError = true;
  }

  if (hasError) {
    return (
      <Container className="py-10">
        <h1 className="text-3xl font-bold mb-8">All Products</h1>
        <div className="text-center py-20 bg-red-50 border border-red-100 rounded-lg">
          <h2 className="text-xl font-medium text-red-700">Oops! Something went wrong.</h2>
          <p className="text-red-600 mt-2">We couldn&apos;t load the products at this time. Please try again later.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>
      
      {products && products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {meta?.count && (
            <p className="mt-8 text-sm text-gray-500 text-center">
              Showing {products.length} of {String(meta.count)} products
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-medium text-gray-700">No products found</h2>
          <p className="text-gray-500 mt-2">Check back later for new arrivals.</p>
        </div>
      )}
    </Container>
  );
}
