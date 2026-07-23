import Link from 'next/link';
import { Container } from '../../../components/ui/Container';
import { ProductCard } from '../../../components/product/ProductCard';
import { ShopEmptyState } from '../../../components/shop/ShopEmptyState';
import { getProductsByCategorySlug, getCategoryBySlug } from '../../../lib/catalog';
import { Product } from '../../../types/product';
import { Category } from '../../../types/category';
import { notFound } from 'next/navigation';

import { ROUTES } from '../../../constants/routes';
import { Metadata } from 'next';

export const revalidate = 60; // Revalidate cache every 60 seconds

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

import { buildTitle, SITE_URL } from '../../../lib/seo';

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { data: category } = await getCategoryBySlug(slug);
    const fallbackName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    if (!category) {
      return {
        title: `Tin đăng ${fallbackName}`,
        description: `Duyệt tin đăng C2C cho ${fallbackName.toLowerCase()} và các sản phẩm thời trang địa phương trên StyleHub.`,
      };
    }

    // Raw name here: the root layout's title template already appends " — StyleHub".
    const title = `Tin đăng ${category.name}`;
    const description = category.description || `Duyệt tin đăng C2C cho ${category.name.toLowerCase()} và các sản phẩm thời trang địa phương trên StyleHub.`;

    return {
      title,
      description,
      openGraph: {
        title: buildTitle(title),
        description,
        type: 'website',
        url: `${SITE_URL}/category/${slug}`,
      }
    };
  } catch {
    return {
      title: 'Danh mục tin đăng',
      description: 'Duyệt tin đăng C2C cho các sản phẩm thời trang địa phương trên StyleHub.',
    };
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
  } catch (err) {
    // A category that genuinely doesn't exist should 404, not show a
    // "connection issue" message that wrongly implies the backend is down.
    if (err instanceof Error && /not found/i.test(err.message)) {
      notFound();
    }
    hasError = true;
  }

  const count = meta?.count ?? (hasError ? null : products.length);

  return (
    <>
      {/* Curated collection header */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-12 sm:py-16">
          <nav aria-label="Đường dẫn điều hướng" className="mb-5">
            <Link
              href={ROUTES.SHOP}
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 transition-colors hover:text-neutral-900"
            >
              ← Tất cả tin đăng
            </Link>
          </nav>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-500">
            Bộ sưu tập chọn lọc
          </p>
          <h1 className="font-display text-4xl font-black uppercase tracking-tight text-neutral-900 sm:text-6xl">
            {categoryName}
          </h1>
          {categoryDesc && (
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600">{categoryDesc}</p>
          )}
          {count != null && count > 0 && (
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
              {count} tin đăng từ cộng đồng
            </p>
          )}
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        {hasError ? (
          <ShopEmptyState variant="error" />
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {meta?.count != null && (
              <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                Hiển thị {products.length} trong {meta.count} tin đăng
              </p>
            )}
          </>
        ) : (
          <ShopEmptyState variant="empty" title={`Chưa có tin đăng nào trong ${categoryName}.`} body="Hãy là người đầu tiên đăng bán trong danh mục này." actionText="Xem tất cả tin đăng" actionHref={ROUTES.SHOP} />
        )}
      </Container>
    </>
  );
}







