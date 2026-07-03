import { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '../../../components/ui/Container';
import { ProductCard } from '../../../components/product/ProductCard';
import { Button } from '../../../components/ui/Button';
import { getSellerByUsername, getProductsBySeller, SellerProfile } from '../../../lib/catalog';
import { Product } from '../../../types/product';

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
    const displayName = seller?.full_name || `@${username}`;
    const title = buildTitle(`${displayName} Seller Profile`);
    const description = `Explore ${displayName}'s C2C fashion listings, rating, location, and marketplace profile on StyleHub.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        url: `${SITE_URL}/seller/${username}`,
      }
    };
  } catch {
    return {
      title: buildTitle(`@${username} Seller Profile`),
      description: `Explore @${username}'s C2C fashion listings, rating, location, and marketplace profile on StyleHub.`,
    };
  }
}

export default async function SellerPage({ params }: SellerPageProps) {
  const { username } = await params;

  let seller: SellerProfile | null = null;
  let products: Product[] = [];
  let hasError = false;

  try {
    const sellerRes = await getSellerByUsername(username);
    seller = sellerRes.data;

    if (seller) {
      const productsRes = await getProductsBySeller(username);
      products = productsRes.data || [];
    }
  } catch (error) {
    console.error('Error loading seller page:', error);
    hasError = true;
  }

  // If seller does not exist in DB, show a premium Not Found State
  if (!seller || hasError) {
    return (
      <Container className="py-20 text-center max-w-md mx-auto">
        <span className="text-4xl">🔍</span>
        <h1 className="mt-4 font-display text-2xl font-black uppercase tracking-tight text-neutral-900">
          Seller Not Found
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          The seller handle <span className="font-mono text-neutral-800 font-bold">@{username}</span> does not exist or has been archived.
        </p>
        <div className="mt-8">
          <Link href="/shop">
            <Button size="lg" className="font-mono text-xs uppercase tracking-wider w-full">
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </Container>
    );
  }

  const initial = (seller.full_name || seller.username || 'S').charAt(0).toUpperCase();

  return (
    <div className="bg-neutral-50 min-h-screen pb-16">
      {/* Seller Header Section */}
      <section className="border-b border-neutral-200 bg-white pt-10 pb-12 sm:pt-16 sm:pb-16 shadow-sm">
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            {/* Signature Bold Black Square Avatar */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center border-2 border-neutral-950 bg-neutral-950 font-display text-4xl font-extrabold text-white sm:h-28 sm:w-28 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {initial}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl truncate">
                  {seller.full_name || seller.username}
                </h1>
                <span className="font-mono text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5">
                  @{seller.username}
                </span>
                {seller.is_verified_seller && (
                  <span className="inline-flex items-center gap-1 border border-neutral-950 bg-neutral-950 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                    Verified Seller
                  </span>
                )}
              </div>

              {/* Bio description */}
              <p className="mt-3 max-w-2xl text-sm text-neutral-600 leading-relaxed italic">
                &ldquo;{seller.bio}&rdquo;
              </p>

              {/* Trust badges row */}
              <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-neutral-500 border-t border-neutral-100 pt-4">
                <span className="flex items-center gap-1.5">
                  ⭐ <strong className="text-neutral-900 font-semibold">{seller.seller_rating ? `${seller.seller_rating} / 5.0` : 'No ratings'}</strong>
                </span>
                <span className="hidden sm:inline text-neutral-300">|</span>
                <span className="flex items-center gap-1.5">
                  🛍️ <strong className="text-neutral-900 font-semibold">{seller.sold_count || 0} Sold Listings</strong>
                </span>
                <span className="hidden sm:inline text-neutral-300">|</span>
                <span className="flex items-center gap-1.5">
                  📍 <strong className="text-neutral-900 font-semibold">{seller.location || 'Vietnam'}</strong>
                </span>
                <span className="hidden sm:inline text-neutral-300">|</span>
                <span className="flex items-center gap-1.5 text-green-800">
                  ⚡ <strong>Usually responds: {seller.response_time}</strong>
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Seller Listings Catalog */}
      <Container className="mt-10 sm:mt-14">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-6">
          Active Listings ({products.length})
        </h2>

        {products.length === 0 ? (
          <div className="text-center border border-dashed border-neutral-300 py-16 px-4 bg-white">
            <span className="text-3xl">📭</span>
            <h3 className="mt-4 font-display text-base font-bold uppercase tracking-tight text-neutral-900">
              No active listings
            </h3>
            <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto">
              This seller hasn&apos;t listed any streetwear items or fashion pieces for sale yet.
            </p>
            <div className="mt-8">
              <Link href="/shop">
                <Button variant="outline" className="font-mono text-xs uppercase tracking-wider">
                  Explore other sellers
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

