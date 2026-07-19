'use client';

import Link from 'next/link';
import { useCart } from '../../hooks/useCart';

export const HeaderCartButton = () => {
  const { cartCount, isHydrated } = useCart();

  return (
    <Link
      href="/cart"
      className="group relative flex items-center gap-1.5 text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-500"
      aria-label={`Giỏ hàng, ${isHydrated ? cartCount : 0} sản phẩm`}
      title="Giỏ hàng"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 transition-transform group-hover:scale-110 text-neutral-900"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
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
