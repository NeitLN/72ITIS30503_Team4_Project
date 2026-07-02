'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { Button } from '../ui/Button';
import { Product } from '../../types/product';
import { getListingView, formatVND } from '../../lib/format';

interface ProductActionsProps {
  product: Product;
}

interface VariantRow {
  id: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock';
  variant_attribute_values?: Array<{
    attribute_value?: {
      value: string;
      slug: string;
      attribute?: { name: string; slug: string };
    };
  }>;
}

export const ProductActions = ({ product }: ProductActionsProps) => {
  const router = useRouter();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [added, setAdded] = useState(false);

  const listing = getListingView(product);
  const isFavorite = isInWishlist(product.id);

  // Cast product variants securely
  const variants = (product.variants ?? []) as unknown as VariantRow[];
  const isVariableProduct = product.product_type === 'variable' && variants.length > 0;

  // Initialize selected variant state to the first variant if variable product
  const [selectedVariant, setSelectedVariant] = useState<VariantRow | null>(
    isVariableProduct ? variants[0] : null
  );

  const getVariantLabel = (v: VariantRow) => {
    return (
      v.variant_attribute_values?.map((vav) => vav.attribute_value?.value).filter(Boolean).join(' / ') ||
      v.sku ||
      'Variant'
    );
  };

  // Determine active SKU, stock, and price
  const activeSKU = selectedVariant ? selectedVariant.sku : product.sku;
  const activeStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const isOutOfStock = selectedVariant
    ? selectedVariant.stock_quantity === 0 || selectedVariant.stock_status === 'out_of_stock'
    : listing.isSoldOut;

  const currentPrice = selectedVariant
    ? (selectedVariant.sale_price ?? selectedVariant.price)
    : (listing.salePrice ?? listing.price);

  const originalPrice = selectedVariant
    ? (selectedVariant.sale_price != null ? selectedVariant.price : null)
    : (listing.salePrice != null ? listing.price : null);

  const handleAddToCart = () => {
    const cartItem = {
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id,
      variantId: selectedVariant ? selectedVariant.id : null,
      name: selectedVariant ? `${listing.name} (${getVariantLabel(selectedVariant)})` : listing.name,
      price: currentPrice,
      salePrice: originalPrice ? currentPrice : null,
      imageUrl: listing.imageUrl,
      size: selectedVariant ? getVariantLabel(selectedVariant) : listing.size,
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
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id,
      variantId: selectedVariant ? selectedVariant.id : null,
      name: selectedVariant ? `${listing.name} (${getVariantLabel(selectedVariant)})` : listing.name,
      price: currentPrice,
      salePrice: originalPrice ? currentPrice : null,
      imageUrl: listing.imageUrl,
      size: selectedVariant ? getVariantLabel(selectedVariant) : listing.size,
      condition: listing.condition,
      brandName: listing.brandName,
      sellerHandle: listing.sellerHandle,
      slug: product.slug,
    };

    addToCart(cartItem, 1);
    router.push('/cart');
  };

  const handleToggleWishlist = () => {
    const wishlistItem = {
      id: product.id,
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
    toggleWishlist(wishlistItem);
  };

  return (
    <div className="mt-6 space-y-6">
      {/* 1. Variable Product Option Selector (Lab 5 PIM Standard) */}
      {isVariableProduct && (
        <div className="border border-neutral-200 p-4 bg-white">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-3">
            Select Size / Variation
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const label = getVariantLabel(v);
              const isSelected = selectedVariant?.id === v.id;
              const isVarOut = v.stock_quantity === 0 || v.stock_status === 'out_of_stock';

              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={isVarOut}
                  onClick={() => setSelectedVariant(v)}
                  className={`border px-4 py-2 font-mono text-xs uppercase transition-all min-w-[50px] text-center cursor-pointer ${
                    isSelected
                      ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                      : isVarOut
                      ? 'border-neutral-200 bg-neutral-50 text-neutral-300 line-through cursor-not-allowed'
                      : 'border-neutral-300 bg-white text-neutral-800 hover:border-neutral-900 hover:text-neutral-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Live Metadata Display (SKU / Stock / Price) */}
      <div className="border border-neutral-200 p-4 bg-neutral-50 grid grid-cols-2 gap-y-2 text-xs">
        <div>
          <span className="text-neutral-400 font-mono text-[9px] uppercase block">Item SKU</span>
          <span className="font-mono font-bold text-neutral-900 select-all">{activeSKU || 'N/A'}</span>
        </div>
        <div>
          <span className="text-neutral-400 font-mono text-[9px] uppercase block">Fulfillment</span>
          {isOutOfStock ? (
            <span className="text-red-800 font-bold font-mono">🔴 OUT OF STOCK</span>
          ) : (
            <span className="text-green-800 font-bold font-mono">🟢 {activeStock} IN STOCK</span>
          )}
        </div>
        
        {isVariableProduct && (
          <div className="col-span-2 border-t border-neutral-200 pt-3 mt-1 flex justify-between items-baseline">
            <span className="text-neutral-500 font-mono text-[10px] uppercase">Selected Variant Price</span>
            <span className="font-mono text-lg font-black text-neutral-900">
              {formatVND(currentPrice)}
              {originalPrice != null && (
                <span className="ml-2 text-xs font-normal text-red-800 line-through align-middle">
                  {formatVND(originalPrice)}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* 3. Action Buttons */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="flex-1 text-sm font-bold uppercase font-mono tracking-wider"
            disabled={isOutOfStock}
            onClick={handleBuyNow}
          >
            {isOutOfStock ? 'Sold out' : 'Buy now'}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-1 font-mono text-xs uppercase tracking-wider"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
          >
            {added ? '✓ Added to Bag' : 'Add to Cart'}
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
            variant={isFavorite ? 'secondary' : 'outline'}
            className="w-full text-xs"
            onClick={handleToggleWishlist}
          >
            {isFavorite ? '♥ In Wishlist' : '♡ Add to wishlist'}
          </Button>
        </div>
      </div>
    </div>
  );
};
