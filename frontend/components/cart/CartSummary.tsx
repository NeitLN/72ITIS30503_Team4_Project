'use client';

import { useRouter } from 'next/navigation';
import { formatVND } from '../../lib/format';
import { Button } from '../ui/Button';

interface CartSummaryProps {
  subtotal: number;
}

export const CartSummary = ({ subtotal }: CartSummaryProps) => {
  const router = useRouter();

  // Vietnam typical shipping costs
  const shippingCost = subtotal > 500000 ? 0 : 30000;
  const grandTotal = subtotal + shippingCost;

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <div className="border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-200 pb-3">
        Order Summary
      </h2>

      <dl className="mt-6 flex flex-col gap-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-600">Subtotal</dt>
          <dd className="font-mono font-semibold text-neutral-900">{formatVND(subtotal)}</dd>
        </div>

        <div className="flex justify-between border-b border-neutral-200 pb-4">
          <dt className="text-neutral-600">Shipping</dt>
          <dd className="font-mono text-neutral-900">
            {shippingCost === 0 ? (
              <span className="text-green-800 font-semibold font-sans uppercase text-[10px] tracking-wide">
                Free Shipping
              </span>
            ) : (
              formatVND(shippingCost)
            )}
          </dd>
        </div>

        <div className="flex justify-between pt-2">
          <dt className="text-base font-bold text-neutral-900">Total</dt>
          <dd className="font-mono text-lg font-bold text-neutral-900">{formatVND(grandTotal)}</dd>
        </div>
      </dl>

      <div className="mt-8">
        <Button size="lg" className="w-full" onClick={handleCheckout}>
          Proceed to Checkout
        </Button>
      </div>

      {subtotal <= 500000 && (
        <p className="mt-4 text-center font-mono text-[10px] text-neutral-500">
          Spend {formatVND(500000 - subtotal)} more to unlock **FREE SHIPPING**!
        </p>
      )}

      {/* Safe transaction trust strip */}
      <div className="mt-6 border-t border-neutral-200 pt-6">
        <p className="flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
          <span>🔒</span> SECURE TRANSACTIONS
        </p>
      </div>
    </div>
  );
};
