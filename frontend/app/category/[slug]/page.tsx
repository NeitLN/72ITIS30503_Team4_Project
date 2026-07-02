import Link from 'next/link';
import { Container } from '../../../components/ui/Container';
import { ProductCard } from '../../../components/product/ProductCard';
import { ShopEmptyState } from '../../../components/shop/ShopEmptyState';
import { getProductsByCategorySlug, getCategoryBySlug } from '../../../lib/catalog';
import { Product } from '../../../types/product';
import { Category } from '../../../types/category';
import { notFound } from 'next/navigation';
import { siteConfig } from '../../../constants/site';
import { ROUTES } from '../../../constants/routes';
import { Metadata } from 'next';

export const revalidate = 60; // Revalidate cache every 60 seconds

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { data: category } = await getCategoryBySlug(slug);
    if (!category) return {};

    return {
      title: `${category.name} | ${siteConfig.name}`,
      description: category.description || `Explore ${category.name} listings on StyleHub.`,
    };
  } catch {
    return {};
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  let categoryName = slug.replace(/-/g, ' ');
  let categoryDesc: string | null = null;
  let products: Product[] = [];
  let meta: { category?: Category; count?: number } | null = null;
  let hasError = false;

  try {
    const res = await getProductsByCategorySlug(slug);
    if (!res) {
      notFound();
    }

    products = res.data || [];
    meta = res.meta || null;

    if (meta?.category) {
      categoryName = meta.category.name || categoryName;
      categoryDesc = meta.category.description || null;
    }
  } catch {
    hasError = true;
  }

  const count = meta?.count ?? (hasError ? null : products.length);

  return (
    <>
      {/* Curated collection header */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-5">
            <Link
              href={ROUTES.SHOP}
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 transition-colors hover:text-neutral-900"
            >
              ← All listings
            </Link>
          </nav>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-500">
            Curated collection
          </p>
          <h1 className="font-display text-4xl font-black uppercase tracking-tight text-neutral-900 sm:text-6xl">
            {categoryName}
          </h1>
          {categoryDesc && (
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600">{categoryDesc}</p>
          )}
          {count != null && count > 0 && (
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
              {count} {count === 1 ? 'listing' : 'listings'} from the community
            </p>
          )}
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        {hasError ? (
          <ShopEmptyState variant="error" />
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {meta?.count != null && (
              <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                Showing {products.length} of {meta.count} listings
              </p>
            )}
          </>
        ) : (
          <ShopEmptyState variant="empty" />
        )}
      </Container>
    </>
  );
}
