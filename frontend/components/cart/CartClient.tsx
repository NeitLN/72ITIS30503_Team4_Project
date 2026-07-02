'use client';

import Link from 'next/link';
import { useCart } from '../../hooks/useCart';
import { Container } from '../ui/Container';
import { PageHeader } from '../ui/PageHeader';
import { CartItemRow } from './CartItemRow';
import { CartSummary } from './CartSummary';
import { Button } from '../ui/Button';

export const CartClient = () => {
  const { cart, cartSubtotal, updateQuantity, removeFromCart, isHydrated } = useCart();

  if (!isHydrated) {
    return (
      <Container className="py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
          Loading your bag...
        </p>
      </Container>
    );
  }

  return (
    <Container className="py-10 sm:py-16">
      <PageHeader
        eyebrow="Marketplace"
        title="Shopping Bag"
        lede="Review your selected items before proceeding to checkout."
      />

      {cart.length === 0 ? (
        <div className="mt-12 text-center border border-dashed border-neutral-300 py-16 px-4">
          <span className="text-3xl">🛍️</span>
          <h2 className="mt-4 font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
            Your bag is empty
          </h2>
          <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto">
            Discover pre-loved street fashion and support Vietnamese local designers.
          </p>
          <div className="mt-8">
            <Link href="/shop">
              <Button size="lg" className="font-mono text-xs uppercase tracking-wider">
                Explore Marketplace
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Cart items list */}
          <div className="lg:col-span-8">
            <div className="border-t border-neutral-200">
              {cart.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                />
              ))}
            </div>
            <div className="mt-8 flex justify-between items-center">
              <Link
                href="/shop"
                className="font-mono text-xs uppercase tracking-wider text-neutral-600 hover:text-neutral-900 underline"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* Cart Summary Panel */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <CartSummary subtotal={cartSubtotal} />
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};
