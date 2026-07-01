import { Container } from '../../../components/ui/Container';
import { ProductCard } from '../../../components/product/ProductCard';
import { getProductsByCategorySlug, getCategoryBySlug } from '../../../lib/catalog';
import { notFound } from 'next/navigation';
import { siteConfig } from '../../../constants/site';
import { Metadata } from 'next';

export const revalidate = 60; // Revalidate cache every 60 seconds

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  try {
    const { data: category } = await getCategoryBySlug(params.slug);
    if (!category) return {};
    
    return {
      title: `${category.name} | ${siteConfig.name}`,
      description: category.description || `Explore ${category.name} on StyleHub.`,
    };
  } catch (e) {
    return {};
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = params;

  let categoryName = slug.replace('-', ' ');
  let categoryDesc = `Explore items in the ${categoryName} category.`;
  let products: import('../../../types/product').Product[] = [];
  let meta: Record<string, unknown> | null = null;

  try {
    const res = await getProductsByCategorySlug(slug);
    if (!res) {
      notFound();
    }
    
    products = res.data || [];
    meta = res.meta || null;
    
    if (meta?.category) {
      categoryName = meta.category.name || categoryName;
      if (meta.category.description) {
        categoryDesc = meta.category.description;
      }
    }
  } catch (error) {
    // If category fetch fails, we'll gracefully show error state instead of breaking the build
    return (
      <Container className="py-10">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold capitalize">{categoryName}</h1>
        </div>
        <div className="text-center py-20 bg-red-50 border border-red-100 rounded-lg">
          <h2 className="text-xl font-medium text-red-700">Oops! Something went wrong.</h2>
          <p className="text-red-600 mt-2">We couldn&apos;t load the products at this time. Please try again later.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold capitalize">{categoryName}</h1>
        <p className="text-gray-500 mt-2">{categoryDesc}</p>
      </div>
      
      {products && products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product: import('../../../types/product').Product) => (
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
          <p className="text-gray-500 mt-2">There are currently no items in this category.</p>
        </div>
      )}
    </Container>
  );
}
