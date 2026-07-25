import Link from 'next/link';
import { Product } from '../../types/product';
import { ROUTES } from '../../constants/routes';
import { formatVND, getListingView } from '../../lib/format';
import { ListingBadge } from '../marketplace/ListingBadge';
import { ListingImage } from '../marketplace/ListingImage';
import { LifecycleBadge } from '../sustainability/LifecycleBadge';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const listing = getListingView(product);

  return (
    <Link
      href={ROUTES.PRODUCT(product.slug)}
      data-testid="product-card"
      className="group block border border-[var(--border)] bg-[var(--background)] rounded-[var(--radius-card)] overflow-hidden transition-[border-color,box-shadow] duration-200 ease-out hover:border-[var(--brand-accent)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
    >
      <div className="relative aspect-square overflow-hidden border-b border-[var(--border)] bg-[var(--muted)]">
        <ListingImage
          src={listing.imageUrl}
          alt={listing.imageAlt}
          className={`h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.02] ${listing.isSoldOut ? 'opacity-60 grayscale' : ''}`}
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {listing.isSoldOut && <ListingBadge variant="sold">Đã bán</ListingBadge>}
          {!listing.isSoldOut && product.is_featured && <ListingBadge variant="inverse">Nổi bật</ListingBadge>}
        </div>
      </div>

      <div className="p-4">
        <LifecycleBadge lifecycle={product.sustainability?.lifecycle_type} className="mb-2" />
        {listing.brandName && (
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            {listing.brandName}
            {listing.brandIsUnverified && (
              <span
                aria-label="Thương hiệu do người bán khai báo, chưa được StyleHub xác minh"
                title="Thương hiệu do người bán khai báo, chưa được StyleHub xác minh"
                className="ml-1 text-neutral-400"
              >
                *
              </span>
            )}
          </p>
        )}
        <h3 className="line-clamp-1 font-medium text-neutral-900">{listing.name}</h3>
        <p className="mt-1 font-mono text-xs text-neutral-600">
          Kích thước {listing.size} · {listing.condition}
        </p>

        <p className="mt-3 font-mono text-base font-bold text-neutral-900">
          {formatVND(listing.salePrice ?? listing.price)}
          {listing.salePrice != null && (
            <span className="ml-2 text-xs font-normal text-red-800 line-through">
              {formatVND(listing.price)}
            </span>
          )}
        </p>

        <div className="mt-3 border-t border-neutral-100 pt-3">
          <p className="flex items-center gap-1.5 truncate text-xs text-neutral-600">
            <span className="truncate font-medium">{listing.sellerHandle}</span>
            {listing.isVerifiedSeller && (
              <span aria-label="Người bán đã xác thực" title="Người bán đã xác thực" className="text-neutral-900">
                ✓
              </span>
            )}
            {listing.sellerRating && <span className="whitespace-nowrap">· ★ {listing.sellerRating}</span>}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">{listing.sellerLocation}</p>
        </div>
      </div>
    </Link>
  );
};
