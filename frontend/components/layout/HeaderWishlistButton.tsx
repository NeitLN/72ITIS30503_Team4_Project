'use client';

import Link from 'next/link';
import { useWishlist } from '../../hooks/useWishlist';

export const HeaderWishlistButton = () => {
  const { wishlistCount, isHydrated } = useWishlist();

  return (
    <Link
      href="/wishlist"
      className="group relative flex items-center gap-1.5 text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-500"
      aria-label={`Wishlist, ${isHydrated ? wishlistCount : 0} saved items`}
      title="My Wishlist"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isHydrated && wishlistCount > 0 ? '#db2777' : 'none'}
        stroke="#db2777"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 transition-transform group-hover:scale-110"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      {isHydrated && wishlistCount > 0 ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white font-mono transition-transform group-hover:scale-105">
          {wishlistCount}
        </span>
      ) : (
        <span className="text-neutral-400 font-mono text-[11px]">[0]</span>
      )}
    </Link>
  );
};
