'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '../../hooks/useCart';
import { Container } from '../ui/Container';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { formatVND } from '../../lib/format';
import { ListingImage } from '../marketplace/ListingImage';

export const CheckoutClient = () => {
  const { cart, cartSubtotal, clearCart, isHydrated } = useCart();
  const [isPlacing, setIsPlacing] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Form states
  const [name, setName] = useState('Tien Nguyen');
  const [email, setEmail] = useState('tien@stylehub.vn');
  const [phone, setPhone] = useState('0901234567');
  const [address, setAddress] = useState('123 Nguyen Hue, District 1');
  const [city, setCity] = useState('Ho Chi Minh City');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  useEffect(() => {
    // Generate a random order number
    const rand = Math.floor(10000 + Math.random() * 90000);
    const timer = setTimeout(() => {
      setOrderId(`SH-${rand}`);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const shippingCost = cartSubtotal > 500000 ? 0 : 30000;
  const grandTotal = cartSubtotal + shippingCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPlacing(true);

    // Simulate backend communication delay
    setTimeout(() => {
      setIsPlacing(false);
      setIsOrderPlaced(true);
    }, 1500);
  };

  // If order was successfully placed, show thank you screen
  if (isOrderPlaced) {
    return (
      <Container className="py-16 max-w-2xl text-center">
        <div className="border border-neutral-900 p-8 sm:p-12 bg-white text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-5xl">🎉</span>
          <h1 className="mt-6 font-display text-2xl font-black uppercase tracking-tight text-neutral-900">
            Order Confirmed!
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-neutral-500">
            Order Number: <span className="font-bold text-neutral-900">{orderId}</span>
          </p>

          <div className="my-8 border-t border-b border-neutral-100 py-6 text-left">
            <h3 className="font-mono text-xs uppercase tracking-wider text-neutral-800 font-bold mb-4">
              Shipping & Delivery info
            </h3>
            <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-4 text-xs">
              <div>
                <dt className="text-neutral-500">Recipient</dt>
                <dd className="font-medium text-neutral-900">{name}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Phone</dt>
                <dd className="font-medium text-neutral-900">{phone}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">Delivery Address</dt>
                <dd className="font-medium text-neutral-900">
                  {address}, {city}, Vietnam
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Payment Method</dt>
                <dd className="font-mono font-medium text-neutral-900 uppercase">
                  {paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Bank Transfer'}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Estimated Delivery</dt>
                <dd className="font-medium text-green-800">2 - 4 business days</dd>
              </div>
            </dl>
          </div>

          <div className="bg-neutral-50 p-4 border border-neutral-200 mb-8 text-left">
            <div className="flex justify-between text-sm font-semibold text-neutral-900">
              <span>Total Paid</span>
              <span className="font-mono">{formatVND(grandTotal)}</span>
            </div>
          </div>

          <p className="text-xs text-neutral-500 leading-relaxed mb-8">
            Thank you for shopping on StyleHub. Since this is a **Lab Class demo environment**, no
            actual products will be shipped and no real payment was processed. Your mock order was logged successfully!
          </p>

          <Link href="/shop" onClick={() => clearCart()}>
            <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
              Clear Bag & Return to Shop
            </Button>
          </Link>
        </div>
      </Container>
    );
  }

  if (!isHydrated) {
    return (
      <Container className="py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
          Loading checkout...
        </p>
      </Container>
    );
  }

  // If cart is empty and order is not placed, show redirect link
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
          <Link href="/shop">
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
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={() => setPaymentMethod('bank')}
                    className="h-4 w-4 text-neutral-950 focus:ring-neutral-950"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Bank Transfer (Mockup)</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Simulate payment via local mobile banking transfer.</p>
                  </div>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full py-4 text-sm font-mono uppercase tracking-wider font-bold"
              disabled={isPlacing}
            >
              {isPlacing ? 'Processing Order...' : 'Place Demo Order'}
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
