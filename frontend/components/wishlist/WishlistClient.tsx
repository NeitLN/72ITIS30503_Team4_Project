'use client';

import Link from 'next/link';
import { useWishlist } from '../../hooks/useWishlist';
import { Container } from '../ui/Container';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { ListingImage } from '../marketplace/ListingImage';
import { formatVND } from '../../lib/format';

export const WishlistClient = () => {
  const { wishlist, removeFromWishlist, isHydrated } = useWishlist();

  if (!isHydrated) {
    return (
      <Container className="py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
          Loading your wishlist...
        </p>
      </Container>
    );
  }

  return (
    <Container className="py-10 sm:py-16">
      <PageHeader
        eyebrow="Favorites"
        title="My Wishlist"
        lede="Keep track of unique streetwear and pre-loved items you love."
      />

      {wishlist.length === 0 ? (
        <div className="mt-12 text-center border border-dashed border-neutral-300 py-16 px-4 bg-white">
          <span className="text-3xl">🖤</span>
          <h2 className="mt-4 font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
            Your wishlist is empty
          </h2>
          <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto">
            Find streetwear grails, local brands, and unique pieces you want to save.
          </p>
          <div className="mt-8">
            <Link href="/shop">
              <Button size="lg" className="font-mono text-xs uppercase tracking-wider">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {wishlist.map((item) => {
              const displayPrice = item.salePrice ?? item.price;
              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col border border-neutral-200 bg-white transition-colors hover:border-neutral-900"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square overflow-hidden border-b border-neutral-200 bg-neutral-100">
                    <ListingImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    {/* Delete button overlay */}
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(item.id)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm hover:border-red-600 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove from wishlist"
                      aria-label="Remove from wishlist"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col p-4">
                    {item.brandName && (
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                        {item.brandName}
                      </p>
                    )}
                    <h3 className="line-clamp-1 font-medium text-neutral-900 hover:underline">
                      <Link href={`/products/${item.slug}`}>{item.name}</Link>
                    </h3>
                    <p className="mt-1 font-mono text-xs text-neutral-600">
                      Size {item.size} · {item.condition}
                    </p>

                    <p className="mt-3 font-mono text-sm font-bold text-neutral-900">
                      {formatVND(displayPrice)}
                      {item.salePrice != null && (
                        <span className="ml-2 text-xs font-normal text-red-800 line-through">
                          {formatVND(item.price)}
                        </span>
                      )}
                    </p>

                    <p className="mt-1 text-[10px] text-neutral-400">
                      Seller: <span className="font-mono text-neutral-600 font-medium">{item.sellerHandle}</span>
                    </p>

                    {/* Action buttons */}
                    <div className="mt-auto pt-4 flex gap-2">
                      <Link href={`/products/${item.slug}`} className="flex-1">
                        <Button variant="outline" className="w-full py-1.5 text-[10px] font-mono uppercase tracking-wider">
                          View Detail
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFromWishlist(item.id)}
                        className="font-mono text-[10px] uppercase tracking-wider text-red-800 hover:text-red-500 underline py-1.5 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-12 text-center">
            <Link href="/shop" className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-neutral-900 underline">
              ← Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
};
