'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { ROUTES } from '../../constants/routes';
import { Container } from '../ui/Container';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { formatVND } from '../../lib/format';
import { ListingImage } from '../marketplace/ListingImage';
import { createOrder } from '../../lib/orders';

export const CheckoutClient = () => {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated: isAuthHydrated } = useAuth();
  const { cart, cartSubtotal, clearCart, isHydrated: isCartHydrated } = useCart();
  
  const [isPlacing, setIsPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const shippingCost = cartSubtotal > 0 ? 30000 : 0;
  const grandTotal = cartSubtotal + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsPlacing(true);

    if (!isAuthenticated) {
      setErrorMsg('You must be logged in to place an order.');
      setIsPlacing(false);
      return;
    }

    try {
      const payload = {
        customer: {
          name,
          email,
          phone,
          address,
          city,
        },
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.name,
          productSlug: item.slug,
          imageUrl: item.imageUrl,
          sku: item.slug, // fallback to slug if sku is absent, map properly
          size: item.size,
          condition: item.condition,
          unitPrice: item.salePrice ?? item.price,
          quantity: item.quantity,
        })),
      };

      const res = await createOrder(payload);

      if (res.success && res.data?.order_code) {
        clearCart();
        router.push(`${ROUTES.CHECKOUT_SUCCESS}?orderCode=${res.data.order_code}`);
      } else {
        setErrorMsg(res.error?.message || 'Could not create order. Please try again.');
      }
    } catch {
      setErrorMsg('An unexpected network error occurred.');
    } finally {
      setIsPlacing(false);
    }
  };

  if (!isCartHydrated || !isAuthHydrated) {
    return (
      <Container className="py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
          Loading checkout...
        </p>
      </Container>
    );
  }

  // If user is a guest, prompt them to login
  if (!isAuthenticated) {
    return (
      <Container className="py-16 sm:py-24 max-w-md">
        <div className="border border-neutral-200 bg-white p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔒</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
            Log in to place your order
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            You can browse StyleHub as a guest, but checkout requires an account.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.CHECKOUT}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Log in
              </Button>
            </Link>
            <Link href={`${ROUTES.REGISTER}?redirect=${ROUTES.CHECKOUT}`}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  // If cart is empty, show redirect link
  if (cart.length === 0) {
    return (
      <Container className="py-16 text-center max-w-md">
        <h2 className="font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
          No items to checkout
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Your shopping bag is currently empty. Add products before checking out.
        </p>
        <div className="mt-8">
          <Link href={ROUTES.SHOP}>
            <Button className="font-mono text-xs uppercase tracking-wider">Return to Shop</Button>
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10 sm:py-16">
      <PageHeader
        eyebrow="Checkout"
        title="Secure Checkout"
        lede="Provide your delivery details to complete your order."
      />

      {errorMsg && (
        <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800 font-medium">
          {errorMsg}
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left: Shipping Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border border-neutral-200 p-6 sm:p-8 bg-white">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-6">
                1. Shipping Information
              </h2>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="phone" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label htmlFor="address" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1.5 block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="city" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="border border-neutral-200 p-6 sm:p-8 bg-white">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-6">
                2. Payment Method (Demo only)
              </h2>

              <div className="space-y-4">
                <label className="flex items-center gap-3 border border-neutral-300 p-4 cursor-pointer hover:bg-neutral-50">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="h-4 w-4 text-neutral-950 focus:ring-neutral-950"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Cash on Delivery (COD)</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Pay with cash when items arrive at your door.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 border border-neutral-300 p-4 cursor-pointer hover:bg-neutral-50">
                  <input
                    type="radio"
                    name="payment"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="h-4 w-4 text-neutral-950 focus:ring-neutral-950"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Bank Transfer (Mockup)</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Simulate payment via local mobile banking transfer.</p>
                  </div>
                </label>

                {paymentMethod === 'bank_transfer' && (
                  <div className="mt-3 ml-7 bg-neutral-100 p-3 border border-neutral-200 text-xs">
                    <p className="font-mono font-bold text-neutral-800 mb-1 uppercase tracking-wider">StyleHub Demo Bank</p>
                    <p>Account Name: STYLEHUB DEMO</p>
                    <p>Account Number: 0000 1234 5678</p>
                    <p className="mt-1 text-neutral-500 italic">Transfer Content: Order code will be shown on the success page.</p>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full py-4 text-sm font-mono uppercase tracking-wider font-bold"
              disabled={isPlacing}
            >
              {isPlacing ? 'Processing Order...' : 'Place Order'}
            </Button>
          </form>
        </div>

        {/* Right: Items Review */}
        <div className="lg:col-span-5">
          <div className="border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-200 pb-3 mb-6">
              Review Items ({cart.length})
            </h2>

            <div className="divide-y divide-neutral-200 max-h-96 overflow-y-auto pr-2">
              {cart.map((item) => {
                const itemPrice = item.salePrice ?? item.price;
                return (
                  <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="relative h-14 w-14 flex-shrink-0 border border-neutral-200 bg-white">
                      <ListingImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-neutral-900 truncate">{item.name}</h4>
                      <p className="font-mono text-[10px] text-neutral-500 mt-0.5">
                        Qty {item.quantity} · Size {item.size}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Seller: {item.sellerHandle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-xs font-bold text-neutral-900">
                        {formatVND(itemPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <dl className="mt-6 border-t border-neutral-200 pt-6 space-y-4 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
                <span className="font-mono text-neutral-900">{formatVND(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Shipping</span>
                <span className="font-mono text-neutral-900">
                  {shippingCost === 0 ? 'FREE' : formatVND(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-4 text-sm font-bold text-neutral-900">
                <span>Grand Total</span>
                <span className="font-mono text-base">{formatVND(grandTotal)}</span>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </Container>
  );
};
