import Link from 'next/link';
import { Container } from '../../../components/ui/Container';
import { ProductImageGallery } from '../../../components/product/ProductImageGallery';
import { SellerMiniCard } from '../../../components/marketplace/SellerMiniCard';
import { ConditionBadge } from '../../../components/marketplace/ConditionBadge';
import { ListingBadge } from '../../../components/marketplace/ListingBadge';
import { ProductActions } from '../../../components/product/ProductActions';
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
        title: 'Fashion Listing',
        description: 'View a C2C fashion marketplace listing on StyleHub.',
      };
    }

    const listing = getListingView(product);
    // Raw name here: the root layout's title template already appends " — StyleHub".
    const title = listing.name;
    const description = `View this C2C fashion listing on StyleHub. ${listing.condition}, size ${listing.size}. Listed by ${listing.sellerHandle} in ${listing.sellerLocation}.`;

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
      title: 'Fashion Listing',
      description: 'View a C2C fashion marketplace listing on StyleHub.',
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
    { label: 'Condition', value: listing.condition },
    { label: 'Size', value: listing.size },
    { label: 'Brand', value: listing.brandName ?? 'Independent / no brand' },
    { label: 'Category', value: listing.categoryName ?? 'Uncategorised' },
    { label: 'Ships from', value: listing.sellerLocation },
    ...(product.sku ? [{ label: 'SKU', value: product.sku }] : []),
    { label: 'Status', value: listing.isSoldOut ? 'Sold' : 'Available' },
  ];

  return (
    <Container className="py-8 sm:py-12">
      {/* Breadcrumb back to the marketplace */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href={ROUTES.SHOP}
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 transition-colors hover:text-neutral-900"
        >
          ← Marketplace
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
            {listing.isSoldOut && <ListingBadge variant="sold">Sold</ListingBadge>}
            {product.brand?.is_local && <ListingBadge variant="inverse">Local brand</ListingBadge>}
            {product.is_negotiable && !listing.isSoldOut && <ListingBadge>Negotiable</ListingBadge>}
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
            Size {listing.size} · {listing.condition} · {listing.sellerLocation}
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
          <section aria-label="Item details" className="mt-10 border border-neutral-200">
            <div className="border-b border-neutral-200 px-4 py-2">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Item details
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

          <div className="mt-6">
            <SellerMiniCard listing={listing} />
          </div>

          {/* Safe marketplace note */}
          <aside className="mt-6 border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Trade safely
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
              Check the seller&apos;s rating and the condition label before you buy. Keep all
              communication on StyleHub, and prefer public places for local pickups.
            </p>
          </aside>

          {product.description && (
            <section aria-label="Description" className="mt-10">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                Seller&apos;s description
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


