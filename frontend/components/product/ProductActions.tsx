'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../hooks/useCart';
import { Button } from '../ui/Button';
import { Product } from '../../types/product';
import { getListingView } from '../../lib/format';

interface ProductActionsProps {
  product: Product;
}

export const ProductActions = ({ product }: ProductActionsProps) => {
  const router = useRouter();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const listing = getListingView(product);

  const handleAddToCart = () => {
    const cartItem = {
      id: product.id, // Use product ID for simplicity
      productId: product.id,
      variantId: null,
      name: listing.name,
      price: product.price,
      salePrice: product.sale_price ?? null,
      imageUrl: listing.imageUrl,
      size: listing.size,
      condition: listing.condition,
      brandName: listing.brandName,
      sellerHandle: listing.sellerHandle,
      slug: product.slug,
    };

    addToCart(cartItem, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    const cartItem = {
      id: product.id,
      productId: product.id,
      variantId: null,
      name: listing.name,
      price: product.price,
      salePrice: product.sale_price ?? null,
      imageUrl: listing.imageUrl,
      size: listing.size,
      condition: listing.condition,
      brandName: listing.brandName,
      sellerHandle: listing.sellerHandle,
      slug: product.slug,
    };

    addToCart(cartItem, 1);
    router.push('/cart');
  };

  return (
    <div className="mt-8 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          disabled={listing.isSoldOut}
          onClick={handleBuyNow}
        >
          {listing.isSoldOut ? 'Sold' : 'Buy now'}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="flex-1 font-mono text-xs uppercase tracking-wider"
          disabled={listing.isSoldOut}
          onClick={handleAddToCart}
        >
          {added ? '✓ Added' : 'Add to Cart'}
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="w-full text-xs"
          onClick={() => alert('Chat functionality is coming soon in Phase 19! This is a demo placeholder.')}
        >
          Chat with seller
        </Button>
        <Button
          variant="outline"
          className="w-full text-xs"
          onClick={() => alert('Wishlist is coming soon in Phase 10! This is a demo placeholder.')}
        >
          Add to wishlist
        </Button>
      </div>
    </div>
  );
};
