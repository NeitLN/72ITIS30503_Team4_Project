import { Container } from '../../components/ui/Container';
import { ProductCard } from '../../components/product/ProductCard';
import { ShopHero } from '../../components/shop/ShopHero';
import { ShopFilters } from '../../components/shop/ShopFilters';
import { ShopEmptyState } from '../../components/shop/ShopEmptyState';
import { getProducts, getCategories } from '../../lib/catalog';
import { getShopFilterBrands } from '../../lib/brands';
import { Product } from '../../types/product';
import { Category } from '../../types/category';
import { BrandOption } from '../../lib/brands';
import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 60; // Revalidate cache every 60 seconds

export const metadata: Metadata = {
  title: 'Chợ Thời Trang C2C',
  description: 'Duyệt tin đăng thời trang C2C theo danh mục, thương hiệu, tình trạng và từ khóa — sản phẩm mới và đã qua sử dụng từ nhiều người bán trên StyleHub.',
};

interface ShopPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    condition?: string;
    brand?: string;
    lifecycle?: string;
    sort?: string;
    page?: string;
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
  if (params.lifecycle) apiParams.lifecycle = params.lifecycle;
  if (params.sort) apiParams.sort = params.sort;
  if (params.page) apiParams.page = params.page;

  let products: Product[] = [];
  let count: number | null = null;
  let page = Math.max(Number.parseInt(params.page || '1', 10) || 1, 1);
  let limit = 20;
  let categories: Category[] = [];
  let brands: BrandOption[] = [];
  let hasError = false;

  try {
    const res = await getProducts(apiParams);
    products = res.data || [];
    const metaCount = res.meta?.count;
    count = typeof metaCount === 'number' ? metaCount : products.length;
    page = typeof res.meta?.page === 'number' ? res.meta.page : page;
    limit = typeof res.meta?.limit === 'number' ? res.meta.limit : limit;
  } catch {
    hasError = true;
  }

  const totalPages = count == null ? 1 : Math.max(Math.ceil(count / limit), 1);
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && key !== 'page') query.set(key, value);
    });
    if (nextPage > 1) query.set('page', String(nextPage));
    const suffix = query.toString();
    return suffix ? `/shop?${suffix}` : '/shop';
  };

  try {
    const res = await getCategories();
    categories = res.data || [];
  } catch {
    // Toolbar renders without category chips
  }

  try {
    const res = await getShopFilterBrands();
    brands = res.data || [];
  } catch {
    // Toolbar renders without brand options
  }

  return (
    <>
      <ShopHero />
      <Container className="py-10 sm:py-14">
        {hasError ? (
          <ShopEmptyState variant="error" />
        ) : (
          <>
            <ShopFilters categories={categories} brands={brands} initialFilters={params} />

            {count != null && products.length > 0 && (
              <div className="mb-6 flex justify-between items-baseline border-b border-neutral-100 pb-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                  Hiển thị {products.length} trong {count} tin đăng
                </p>
              </div>
            )}

            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav aria-label="Phân trang tin đăng" className="mt-10 flex items-center justify-between border-t border-neutral-200 pt-5 font-mono text-xs">
                    {page > 1 ? (
                      <Link href={pageHref(page - 1)} className="border border-neutral-300 px-3 py-2 uppercase tracking-wider hover:border-neutral-900">← Trước</Link>
                    ) : <span />}
                    <span className="text-neutral-500">Trang {page} / {totalPages}</span>
                    {page < totalPages ? (
                      <Link href={pageHref(page + 1)} className="border border-neutral-300 px-3 py-2 uppercase tracking-wider hover:border-neutral-900">Sau →</Link>
                    ) : <span />}
                  </nav>
                )}
              </>
            ) : (
              <ShopEmptyState variant="empty" />
            )}
          </>
        )}
      </Container>
    </>
  );
}

