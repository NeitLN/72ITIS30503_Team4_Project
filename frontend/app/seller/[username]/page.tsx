import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '../../../components/ui/Container';
import { ProductCard } from '../../../components/product/ProductCard';
import { Button } from '../../../components/ui/Button';
import { getSellerByUsername, getProductsBySeller } from '../../../lib/catalog';
import { Product } from '../../../types/product';
import { formatVietnamDate } from '../../../lib/format';
import { displayVnLocation } from '../../../lib/vnLocations';

interface SellerPageProps {
  params: Promise<{
    username: string;
  }>;
}

import { buildTitle, SITE_URL } from '../../../lib/seo';

export async function generateMetadata({ params }: SellerPageProps): Promise<Metadata> {
  const { username } = await params;
  try {
    const { data: seller } = await getSellerByUsername(username);
    if (!seller) {
      return { title: 'Không tìm thấy người bán', description: 'Không tìm thấy gian hàng người bán này trên StyleHub.' };
    }
    // Raw title here: the root layout's title template already appends " — StyleHub".
    const title = `${seller.full_name} (@${seller.username})`;
    const description = seller.bio
      ? `${seller.bio} — Xem các tin đăng đang bán của ${seller.full_name} trên StyleHub.`
      : `Xem các tin đăng thời trang C2C đang bán của ${seller.full_name} trên StyleHub.`;

    return {
      title,
      description,
      openGraph: {
        title: buildTitle(title),
        description,
        type: 'profile',
        url: `${SITE_URL}/seller/${seller.username}`,
        images: seller.avatar_url ? [{ url: seller.avatar_url, alt: `Ảnh đại diện của ${seller.full_name}` }] : undefined,
      },
    };
  } catch {
    return { title: 'Không tìm thấy người bán', description: 'Không tìm thấy gian hàng người bán này trên StyleHub.' };
  }
}

export default async function SellerPage({ params }: SellerPageProps) {
  const { username } = await params;

  let seller;
  let products: Product[] = [];

  try {
    const sellerRes = await getSellerByUsername(username);
    seller = sellerRes.data;
  } catch {
    seller = null;
  }

  // A real 404 (HTTP status + Next.js not-found rendering), not just a
  // styled div with a 200 status — the backend already never fabricates a
  // profile for an unknown username (see backend/services/sellerService.js).
  if (!seller) {
    notFound();
  }

  try {
    const productsRes = await getProductsBySeller(seller.username);
    products = productsRes.data || [];
  } catch {
    products = [];
  }

  const initial = (seller.full_name || seller.username || 'S').charAt(0).toUpperCase();
  const joined = formatVietnamDate(seller.created_at);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: seller.full_name,
      alternateName: `@${seller.username}`,
      url: `${SITE_URL}/seller/${seller.username}`,
      image: seller.avatar_url || undefined,
    },
  };

  return (
    <div className="bg-neutral-50 min-h-screen pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="border-b border-neutral-200 bg-white pt-10 pb-12 sm:pt-16 sm:pb-16 shadow-sm">
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            {seller.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.avatar_url}
                alt={`Ảnh đại diện của ${seller.full_name}`}
                className="h-24 w-24 shrink-0 border-2 border-neutral-950 object-cover sm:h-28 sm:w-28 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center border-2 border-neutral-950 bg-neutral-950 font-display text-4xl font-extrabold text-white sm:h-28 sm:w-28 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {initial}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl truncate">
                  {seller.full_name}
                </h1>
                <span className="font-mono text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5">
                  @{seller.username}
                </span>
                {seller.is_verified_seller && (
                  <span className="inline-flex items-center gap-1 border border-neutral-950 bg-neutral-950 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                    Người bán đã xác minh
                  </span>
                )}
              </div>

              {seller.bio && (
                <p className="mt-3 max-w-2xl text-sm text-neutral-600 leading-relaxed italic">
                  &ldquo;{seller.bio}&rdquo;
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-neutral-500 border-t border-neutral-100 pt-4">
                <span className="flex items-center gap-1.5">
                  ⭐ <strong className="text-neutral-900 font-semibold">
                    {seller.seller_rating != null ? `${seller.seller_rating} / 5.0 (${seller.review_count})` : 'Chưa có đánh giá'}
                  </strong>
                </span>
                <span className="hidden sm:inline text-neutral-300">|</span>
                <span className="flex items-center gap-1.5">
                  🛍️ <strong className="text-neutral-900 font-semibold">Đã bán {seller.sold_count}</strong>
                </span>
                <span className="hidden sm:inline text-neutral-300">|</span>
                <span className="flex items-center gap-1.5">
                  📦 <strong className="text-neutral-900 font-semibold">{seller.active_listing_count} tin đang bán</strong>
                </span>
                {seller.location && (
                  <>
                    <span className="hidden sm:inline text-neutral-300">|</span>
                    <span className="flex items-center gap-1.5">
                      📍 <strong className="text-neutral-900 font-semibold">{displayVnLocation(seller.location)}</strong>
                    </span>
                  </>
                )}
                <span className="hidden sm:inline text-neutral-300">|</span>
                <span className="flex items-center gap-1.5 text-neutral-500">
                  Tham gia {joined}
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="mt-10 sm:mt-14">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-6">
          Tin đang bán ({products.length})
        </h2>

        {products.length === 0 ? (
          <div className="text-center border border-dashed border-neutral-300 py-16 px-4 bg-white">
            <span className="text-3xl">📭</span>
            <h3 className="mt-4 font-display text-base font-bold uppercase tracking-tight text-neutral-900">
              Chưa có tin đang bán
            </h3>
            <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto">
              Người bán này chưa đăng bán món đồ thời trang đường phố hay thời trang nào.
            </p>
            <div className="mt-8">
              <Link href="/shop">
                <Button variant="outline" className="font-mono text-xs uppercase tracking-wider">
                  Khám phá người bán khác
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
