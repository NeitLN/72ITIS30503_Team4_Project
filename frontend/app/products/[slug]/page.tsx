import Link from 'next/link';
import { Container } from '../../../components/ui/Container';
import { ProductImageGallery } from '../../../components/product/ProductImageGallery';
import { SellerMiniCard } from '../../../components/marketplace/SellerMiniCard';
import { ConditionBadge } from '../../../components/marketplace/ConditionBadge';
import { ListingBadge } from '../../../components/marketplace/ListingBadge';
import { ProductActions } from '../../../components/product/ProductActions';
import { ProductJourneyDetails } from '../../../components/sustainability/ProductJourneyDetails';
import { getProductBySlug } from '../../../lib/catalog';
import { formatVND, getListingView } from '../../../lib/format';
import { notFound } from 'next/navigation';

import { ROUTES } from '../../../constants/routes';
import { Metadata } from 'next';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

import { buildTitle, SITE_URL } from '../../../lib/seo';

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { data: product } = await getProductBySlug(slug);
    
    if (!product) {
      return {
        title: 'Tin Đăng Thời Trang',
        description: 'Xem tin đăng thời trang C2C trên StyleHub.',
      };
    }

    const listing = getListingView(product);
    // Raw name here: the root layout's title template already appends " — StyleHub".
    const title = listing.name;
    const description = `Xem tin đăng thời trang C2C này trên StyleHub. ${listing.condition}, kích thước ${listing.size}. Được đăng bởi ${listing.sellerHandle} tại ${listing.sellerLocation}.`;

    return {
      title,
      description,
      openGraph: {
        title: buildTitle(listing.name),
        description,
        type: 'website',
        url: `${SITE_URL}/products/${slug}`,
        images: listing.imageUrl ? [{ url: listing.imageUrl, alt: listing.imageAlt }] : undefined,
      }
    };
  } catch {
    return {
      title: 'Tin Đăng Thời Trang',
      description: 'Xem tin đăng thời trang C2C trên StyleHub.',
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product;
  try {
    const res = await getProductBySlug(slug);
    product = res.data;
  } catch {
    notFound();
  }

  if (!product) {
    notFound();
  }

  const listing = getListingView(product);

  const detailRows: Array<{ label: string; value: string }> = [
    { label: 'Tình trạng', value: listing.condition },
    { label: 'Kích thước', value: listing.size },
    { label: 'Thương hiệu', value: listing.brandName ?? 'Độc lập / không thương hiệu' },
    { label: 'Danh mục', value: listing.categoryName ?? 'Chưa phân loại' },
    { label: 'Gửi từ', value: listing.sellerLocation },
    ...(product.sku ? [{ label: 'SKU', value: product.sku }] : []),
    { label: 'Trạng thái', value: listing.isSoldOut ? 'Đã bán' : 'Còn hàng' },
  ];

  return (
    <Container className="py-8 sm:py-12">
      {/* Breadcrumb back to the marketplace */}
      <nav aria-label="Đường dẫn điều hướng" className="mb-6">
        <Link
          href={ROUTES.SHOP}
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 transition-colors hover:text-neutral-900"
        >
          ← Chợ
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: photos */}
        <div>
          <ProductImageGallery
            images={product.images ?? []}
            fallbackUrl={listing.imageUrl}
            alt={listing.imageAlt}
          />
        </div>

        {/* Right: listing panel */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ConditionBadge condition={product.condition} />
            {listing.isSoldOut && <ListingBadge variant="sold">Đã bán</ListingBadge>}
            {product.brand?.is_local && <ListingBadge variant="inverse">Thương hiệu địa phương</ListingBadge>}
            {product.is_negotiable && !listing.isSoldOut && <ListingBadge>Có thể trả giá</ListingBadge>}
          </div>

          {listing.brandName && (
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              {listing.brandName}
            </p>
          )}
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-neutral-900 sm:text-4xl">
            {listing.name}
          </h1>
          <p className="mt-2 font-mono text-xs text-neutral-600">
            Kích thước {listing.size} · {listing.condition} · {listing.sellerLocation}
          </p>

          <p className="mt-6 font-mono text-3xl font-bold text-neutral-900">
            {formatVND(listing.salePrice ?? listing.price)}
            {listing.salePrice != null && (
              <span className="ml-3 align-middle text-base font-normal text-red-800 line-through">
                {formatVND(listing.price)}
              </span>
            )}
          </p>

          {/* Client-side actions (Cart + Buyout routing) */}
          <ProductActions product={product} />

          {/* Item details — hang-tag table */}
          <section aria-label="Chi tiết sản phẩm" className="mt-10 border border-neutral-200">
            <div className="border-b border-neutral-200 px-4 py-2">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Thông tin sản phẩm
              </h2>
            </div>
            <dl>
              {detailRows.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-baseline justify-between gap-4 px-4 py-2.5 ${i > 0 ? 'border-t border-neutral-100' : ''}`}
                >
                  <dt className="text-sm text-neutral-500">{row.label}</dt>
                  <dd className="text-right text-sm font-medium text-neutral-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <ProductJourneyDetails journey={product.sustainability} />

          <div className="mt-6">
            <SellerMiniCard listing={listing} />
          </div>

          {/* Safe marketplace note */}
          <aside className="mt-6 border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Giao dịch an toàn
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
              Kiểm tra đánh giá của người bán và nhãn tình trạng trước khi mua. Giữ mọi trao đổi
              trên StyleHub, và ưu tiên gặp ở nơi công cộng khi nhận hàng trực tiếp.
            </p>
          </aside>

          {product.description && (
            <section aria-label="Mô tả sản phẩm" className="mt-10">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                Mô tả từ người bán
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {product.description}
              </p>
            </section>
          )}
        </div>
      </div>
    </Container>
  );
}


