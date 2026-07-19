'use client';

import Link from 'next/link';
import { CartItem } from '../../lib/cart';
import { formatVND } from '../../lib/format';
import { ListingImage } from '../marketplace/ListingImage';
import { vi } from '../../lib/i18n';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export const CartItemRow = ({ item, onUpdateQuantity, onRemove }: CartItemRowProps) => {
  const itemPrice = item.salePrice ?? item.price;
  const itemTotal = itemPrice * item.quantity;

  return (
    <div className="flex flex-col gap-4 border-b border-neutral-200 py-6 sm:flex-row sm:items-center sm:justify-between">
      {/* Product Details */}
      <div className="flex items-start gap-4 flex-1">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden border border-neutral-200 bg-neutral-100">
          <ListingImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        </div>
        <div className="flex-1">
          {item.brandName && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              {item.brandName}
            </p>
          )}
          <h3 className="text-sm font-semibold text-neutral-900 hover:underline">
            <Link href={`/products/${item.slug}`}>{item.name}</Link>
          </h3>
          <p className="mt-1 font-mono text-xs text-neutral-500">
            Cỡ {item.size} · {item.condition}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Người bán: <span className="font-medium text-neutral-600">{item.sellerHandle}</span>
          </p>
        </div>
      </div>

      {/* Pricing, Quantity, Total */}
      <div className="flex items-center justify-between gap-6 sm:justify-end sm:gap-10">
        {/* Quantity Controller */}
        <div className="flex items-center border border-neutral-300">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="flex h-8 w-8 items-center justify-center font-mono text-sm text-neutral-600 hover:bg-neutral-100 focus:outline-none"
            aria-label="Giảm số lượng"
          >
            -
          </button>
          <span className="flex h-8 w-8 items-center justify-center font-mono text-xs font-bold text-neutral-900 bg-white">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="flex h-8 w-8 items-center justify-center font-mono text-sm text-neutral-600 hover:bg-neutral-100 focus:outline-none"
            aria-label="Tăng số lượng"
          >
            +
          </button>
        </div>

        {/* Price & Remove */}
        <div className="text-right flex flex-col items-end gap-1 min-w-[100px]">
          <p className="font-mono text-sm font-bold text-neutral-900">
            {formatVND(itemTotal)}
          </p>
          {item.quantity > 1 && (
            <p className="font-mono text-[10px] text-neutral-400">
              ({formatVND(itemPrice)} mỗi sản phẩm)
            </p>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="mt-1 text-xs font-mono text-red-800 underline hover:text-red-500 focus:outline-none"
          >
            {vi.cart.remove}
          </button>
        </div>
      </div>
    </div>
  );
};
