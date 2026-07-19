import Link from 'next/link';
import { ListingView } from '../../lib/format';

interface SellerMiniCardProps {
  listing: ListingView;
}

/** Seller trust block for a listing — who you are buying from, at a glance. */
export const SellerMiniCard = ({ listing }: SellerMiniCardProps) => {
  const initial = listing.sellerName.charAt(0).toUpperCase();
  // Only link when there's a real, linkable storefront — legacy seed
  // listings that only have a flat seller_name (no real user/username) get
  // a plain, non-clickable label instead of a broken/malformed link.
  const hasStorefront = Boolean(listing.sellerUsername);

  const avatarBlock = (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center border border-neutral-900 bg-neutral-900 font-display text-lg font-extrabold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
      aria-hidden="true"
    >
      {initial}
    </span>
  );

  const nameBlock = (
    <span className="truncate text-neutral-950 font-bold">{listing.sellerHandle}</span>
  );

  return (
    <section aria-label="Thông tin người bán" className="border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Bán bởi</p>
      </div>
      <div className="flex items-start gap-4 px-4 py-4">
        {hasStorefront ? (
          <Link
            href={`/seller/${listing.sellerUsername}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center border border-neutral-900 bg-neutral-900 font-display text-lg font-extrabold text-white hover:bg-neutral-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            title={`Xem trang cá nhân của @${listing.sellerUsername}`}
          >
            {initial}
          </Link>
        ) : avatarBlock}
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-neutral-900">
            {hasStorefront ? (
              <Link
                href={`/seller/${listing.sellerUsername}`}
                className="truncate hover:underline text-neutral-950 font-bold cursor-pointer"
                title={`Xem trang cá nhân của @${listing.sellerUsername}`}
              >
                {listing.sellerHandle}
              </Link>
            ) : nameBlock}
            {listing.isVerifiedSeller && (
              <span className="inline-flex items-center gap-1 border border-neutral-900 bg-neutral-900 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                Đã xác thực
              </span>
            )}
          </p>
          <p className="mt-1 font-mono text-xs text-neutral-600">
            {listing.sellerRating ? `★ ${listing.sellerRating}` : 'Chưa có đánh giá'}
            {' · '}
            {listing.soldCount != null ? `Đã bán ${listing.soldCount}` : 'Người bán mới'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Gửi từ {listing.sellerLocation}
          </p>
        </div>
      </div>
    </section>
  );
};
