'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';
import { formatVND } from '../../lib/format';

export const ProfileClient = () => {
  const { cartCount, isHydrated: isCartHydrated } = useCart();
  const { wishlistCount, isHydrated: isWishlistHydrated } = useWishlist();

  const isLoaded = isCartHydrated && isWishlistHydrated;

  const mockUser = {
    full_name: 'Võ Việt Tiến',
    username: 'vietstyle',
    location: 'Ho Chi Minh City, Vietnam',
    bio: 'Curating local streetwear, archive pieces, sneakers, and everyday essentials.',
    seller_rating: 4.9,
    sold_count: 24,
    member_since: '2026',
    is_verified_seller: true,
  };

  const initial = mockUser.full_name.charAt(0).toUpperCase();

  const mockListings = [
    {
      id: 'mock-1',
      name: 'DirtyCoins Washed Hoodie',
      price: 420000,
      condition: 'Like new',
      size: 'M',
      status: 'Active',
    },
    {
      id: 'mock-2',
      name: 'Adidas Trefoil Cap',
      price: 180000,
      condition: 'Very good',
      size: 'One size',
      status: 'Active',
    },
    {
      id: 'mock-3',
      name: 'Levi’s Vintage Denim Jacket',
      price: 690000,
      condition: 'Good',
      size: 'L',
      status: 'Draft',
    },
    {
      id: 'mock-4',
      name: 'Ananas Low Top Sneakers',
      price: 550000,
      condition: 'Excellent',
      size: '42',
      status: 'Active',
    },
  ];

  return (
    <div className="bg-neutral-50 min-h-screen pb-16">
      {/* 1. Demo User Profile Header */}
      <section className="border-b border-neutral-200 bg-white pt-10 pb-12 sm:pt-16 sm:pb-16 shadow-sm">
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center border-2 border-neutral-950 bg-neutral-950 font-display text-4xl font-extrabold text-white sm:h-28 sm:w-28 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl truncate">
                  {mockUser.full_name}
                </h1>
                <span className="font-mono text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5">
                  @{mockUser.username}
                </span>
                {mockUser.is_verified_seller && (
                  <span className="inline-flex items-center gap-1 border border-neutral-950 bg-neutral-950 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                    Verified Seller
                  </span>
                )}
              </div>

              <p className="mt-3 max-w-2xl text-sm text-neutral-600 leading-relaxed italic">
                &ldquo;{mockUser.bio}&rdquo;
              </p>

              <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-neutral-500 border-t border-neutral-100 pt-4">
                <span className="flex items-center gap-1.5">
                  ⭐ <strong className="text-neutral-900 font-semibold">{mockUser.seller_rating} / 5.0</strong>
                </span>
                <span className="hidden sm:inline text-neutral-300">|</span>
                <span className="flex items-center gap-1.5">
                  🛍️ <strong className="text-neutral-900 font-semibold">{mockUser.sold_count} Sold Listings</strong>
                </span>
                <span className="hidden sm:inline text-neutral-300">|</span>
                <span className="flex items-center gap-1.5">
                  📍 <strong className="text-neutral-900 font-semibold">{mockUser.location}</strong>
                </span>
                <span className="hidden sm:inline text-neutral-300">|</span>
                <span className="flex items-center gap-1.5 text-neutral-500">
                  Member since {mockUser.member_since}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 shrink-0 sm:w-48">
              <Link href={ROUTES.SELL} className="w-full">
                <Button className="w-full font-mono text-xs uppercase tracking-wider">Start Selling</Button>
              </Link>
              <Link href={`/seller/${mockUser.username}`} className="w-full">
                <Button variant="outline" className="w-full font-mono text-xs uppercase tracking-wider">View Public Shop</Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Container className="mt-10 sm:mt-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Main Column */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* 2. Account Overview Cards */}
            <section>
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">
                Overview
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="border border-neutral-200 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Wishlist Items</p>
                  <p className="font-display text-2xl font-bold">{isLoaded ? wishlistCount : '-'}</p>
                </div>
                <div className="border border-neutral-200 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Cart Items</p>
                  <p className="font-display text-2xl font-bold">{isLoaded ? cartCount : '-'}</p>
                </div>
                <div className="border border-neutral-200 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Active Listings</p>
                  <p className="font-display text-2xl font-bold">3</p>
                </div>
                <div className="border border-neutral-200 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Profile Trust</p>
                  <p className="font-display text-2xl font-bold">100%</p>
                </div>
              </div>
            </section>

            {/* 3. My Listings Section */}
            <section>
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">
                My Recent Listings
              </h2>
              <div className="border border-neutral-200 bg-white overflow-hidden">
                <ul className="divide-y divide-neutral-200">
                  {mockListings.map((item) => (
                    <li key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-neutral-900">{item.name}</h3>
                        <p className="font-mono text-xs text-neutral-500 mt-1">
                          {formatVND(item.price)} · Size {item.size} · {item.condition}
                        </p>
                      </div>
                      <span className={`px-2 py-1 font-mono text-[10px] uppercase tracking-wider font-bold inline-flex w-fit ${
                        item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {item.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* 4. Buyer Activity Section */}
            <section className="border border-neutral-200 bg-white p-6">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-900 font-bold mb-4">
                Buyer Activity
              </h2>
              <ul className="space-y-3 mb-6 font-medium text-sm">
                <li><Link href={ROUTES.CART} className="text-neutral-600 hover:text-neutral-900">→ View Shopping Cart</Link></li>
                <li><Link href={ROUTES.WISHLIST} className="text-neutral-600 hover:text-neutral-900">→ View Wishlist</Link></li>
                <li><Link href={ROUTES.SHOP} className="text-neutral-600 hover:text-neutral-900">→ Browse Marketplace</Link></li>
              </ul>
              <div className="bg-neutral-50 p-3 text-xs text-neutral-500 leading-relaxed border border-neutral-100">
                <p className="mb-2">View your real checkout history and order status in My Orders.</p>
                <Link href={ROUTES.ORDERS}>
                  <Button variant="outline" size="sm" className="font-mono text-[10px] uppercase tracking-wider">
                    My Orders
                  </Button>
                </Link>
              </div>
            </section>

            {/* 5. Seller Mode Card */}
            <section className="border border-neutral-950 bg-neutral-950 text-white p-6 shadow-[4px_4px_0px_0px_rgba(200,200,200,1)]">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] font-bold mb-2">
                Seller Hub
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                Turn your pre-loved fashion, streetwear, and sneakers into cash. List items to the community in minutes.
              </p>
              <Link href={ROUTES.SELL} className="block w-full">
                <button className="w-full bg-white text-neutral-900 px-4 py-2 font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-200 transition-colors">
                  Create a listing
                </button>
              </Link>
            </section>

            {/* 6. Trust & Safety Panel */}
            <section className="border border-neutral-200 bg-white p-6">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-900 font-bold mb-4">
                Trust & Safety
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed">
                StyleHub demo focuses on marketplace discovery and listing presentation. Payments, identity verification, and order processing are intentionally not enabled.
              </p>
            </section>

          </div>
        </div>
      </Container>
    </div>
  );
};
