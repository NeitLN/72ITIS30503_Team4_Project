'use client';

import Link from 'next/link';
import { useCart } from '../../hooks/useCart';

export const HeaderCartButton = () => {
  const { cartCount, isHydrated } = useCart();

  return (
    <Link
      href="/cart"
      className="group relative flex items-center gap-1.5 text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-500"
      aria-label={`Shopping Cart, ${isHydrated ? cartCount : 0} items`}
    >
      <span className="font-medium">Cart</span>
      {isHydrated && cartCount > 0 ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white font-mono transition-transform group-hover:scale-105">
          {cartCount}
        </span>
      ) : (
        <span className="text-neutral-400 font-mono text-[11px]">[0]</span>
      )}
    </Link>
  );
};
