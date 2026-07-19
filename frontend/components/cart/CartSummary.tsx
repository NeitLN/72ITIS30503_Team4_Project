'use client';

import { useRouter } from 'next/navigation';
import { formatVND } from '../../lib/format';
import { Button } from '../ui/Button';
import { vi } from '../../lib/i18n';
import { estimateShipping, FREE_SHIPPING_THRESHOLD } from '../../lib/checkout';

interface CartSummaryProps {
  subtotal: number;
}

export const CartSummary = ({ subtotal }: CartSummaryProps) => {
  const router = useRouter();

  // Vietnam typical shipping costs
  const shippingCost = estimateShipping(subtotal);
  const grandTotal = subtotal + shippingCost;

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <div className="border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-200 pb-3">
        {vi.cart.orderSummary}
      </h2>

      <dl className="mt-6 flex flex-col gap-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-600">{vi.cart.subtotal}</dt>
          <dd className="font-mono font-semibold text-neutral-900">{formatVND(subtotal)}</dd>
        </div>

        <div className="flex justify-between border-b border-neutral-200 pb-4">
          <dt className="text-neutral-600">{vi.cart.shippingFee}</dt>
          <dd className="font-mono text-neutral-900">
            {shippingCost === 0 ? (
              <span className="text-green-800 font-semibold font-sans uppercase text-[10px] tracking-wide">
                Miễn phí giao hàng
              </span>
            ) : (
              formatVND(shippingCost)
            )}
          </dd>
        </div>

        <div className="flex justify-between pt-2">
          <dt className="text-base font-bold text-neutral-900">{vi.cart.total}</dt>
          <dd className="font-mono text-lg font-bold text-neutral-900">{formatVND(grandTotal)}</dd>
        </div>
      </dl>

      <div className="mt-8">
        <Button size="lg" className="w-full uppercase text-xs tracking-wider" onClick={handleCheckout}>
          {vi.cart.checkout}
        </Button>
      </div>

      {subtotal <= FREE_SHIPPING_THRESHOLD && (
        <p className="mt-4 text-center font-mono text-[10px] text-neutral-500">
          Mua thêm {formatVND(FREE_SHIPPING_THRESHOLD - subtotal + 1)} để được MIỄN PHÍ GIAO HÀNG!
        </p>
      )}

      {/* Safe transaction trust strip */}
      <div className="mt-6 border-t border-neutral-200 pt-6">
        <p className="flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
          <span>🔒</span> GIAO DỊCH AN TOÀN
        </p>
      </div>
    </div>
  );
};
