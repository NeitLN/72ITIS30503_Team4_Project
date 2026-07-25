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
  title?: string;
  sku: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  stock?: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'inactive';
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
  const { addToCart, isHydrated: isCartHydrated } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [added, setAdded] = useState(false);

  const listing = getListingView(product);
  const isFavorite = isInWishlist(product.id);

  // Cast product variants securely
  const variants = (product.variants ?? []) as unknown as VariantRow[];
  const normalizedVariants = variants.map((variant) => ({
    ...variant,
    stock_quantity: variant.stock_quantity ?? variant.stock ?? 0,
    stock_status: variant.stock_status ?? ((variant.stock_quantity ?? variant.stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock'),
  }));
  const isVariableProduct = (product.inventory_mode === 'variant' || product.product_type === 'variable') && normalizedVariants.length > 0;

  // Initialize selected variant state to null for variable products so the user must explicitly select one
  const [selectedVariant, setSelectedVariant] = useState<VariantRow | null>(null);

  const requiresVariantSelection = isVariableProduct;
  const hasSelectedVariant = selectedVariant !== null;

  const getVariantLabel = (v: VariantRow) => {
    if (v.title?.trim()) return v.title.trim();
    return (
      v.variant_attribute_values?.map((vav) => vav.attribute_value?.value).filter(Boolean).join(' / ') ||
      v.sku ||
      'Phân loại'
    );
  };

  // Determine active SKU, stock, and price
  const activeSKU = requiresVariantSelection && !hasSelectedVariant ? 'Chưa chọn' : (selectedVariant ? selectedVariant.sku : product.sku);
  const activeStock = requiresVariantSelection && !hasSelectedVariant ? 'Chọn phân loại để xem tồn kho' : (selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity);
  const isOutOfStock = requiresVariantSelection && !hasSelectedVariant ? false : (selectedVariant
    ? selectedVariant.stock_quantity === 0 || selectedVariant.stock_status === 'out_of_stock'
    : listing.isSoldOut);

  const currentPrice = selectedVariant
    ? (selectedVariant.sale_price ?? selectedVariant.price)
    : (listing.salePrice ?? listing.price);

  const originalPrice = selectedVariant
    ? (selectedVariant.sale_price != null ? selectedVariant.price : null)
    : (listing.salePrice != null ? listing.price : null);

  const actionDisabled = isOutOfStock || !isCartHydrated || (requiresVariantSelection && !hasSelectedVariant);

  const handleAddToCart = () => {
    if (requiresVariantSelection && !hasSelectedVariant) return;
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
    if (requiresVariantSelection && !hasSelectedVariant) return;
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
            Chọn kích thước / phân loại
          </p>
          <div className="flex flex-wrap gap-2">
            {normalizedVariants.map((v) => {
              const label = getVariantLabel(v);
              const isSelected = selectedVariant?.id === v.id;
              const isVarOut = v.stock_quantity === 0 || v.stock_status === 'out_of_stock';

              return (
                <button
                  key={v.id}
                  type="button"
                  data-testid={`product-variant-option-${v.id}`}
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
          {requiresVariantSelection && !hasSelectedVariant && (
            <p className="mt-2 text-xs text-red-600 font-mono tracking-wider animate-pulse" data-testid="product-variant-required" role="alert">
              Vui lòng chọn phân loại.
            </p>
          )}
        </div>
      )}

      {/* 2. Live Metadata Display (SKU / Stock / Price) */}
      <div className="border border-neutral-200 p-4 bg-neutral-50 grid grid-cols-2 gap-y-2 text-xs">
        <div>
          <span className="text-neutral-400 font-mono text-[9px] uppercase block">Mã SKU</span>
          <span className="font-mono font-bold text-neutral-900 select-all" data-testid="product-active-sku">{activeSKU || 'Không có'}</span>
        </div>
        <div>
          <span className="text-neutral-400 font-mono text-[9px] uppercase block">Tình trạng hàng</span>
          {isOutOfStock ? (
            <span className="text-red-800 font-bold font-mono" data-testid="product-active-stock">🔴 HẾT HÀNG</span>
          ) : (
            <span className="text-green-800 font-bold font-mono" data-testid="product-active-stock">🟢 CÒN {activeStock}</span>
          )}
        </div>

        {isVariableProduct && (
          <div className="col-span-2 border-t border-neutral-200 pt-3 mt-1 flex justify-between items-baseline">
            <span className="text-neutral-500 font-mono text-[10px] uppercase">Giá phân loại đã chọn</span>
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
            data-testid="product-buy-now"
            disabled={actionDisabled}
            onClick={handleBuyNow}
          >
            {isOutOfStock ? 'Hết hàng' : !isCartHydrated ? 'Đang tải giỏ hàng…' : (requiresVariantSelection && !hasSelectedVariant) ? 'Chọn phân loại' : 'Mua ngay'}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-1 font-mono text-xs uppercase tracking-wider"
            data-testid="product-add-to-cart"
            disabled={actionDisabled}
            onClick={handleAddToCart}
          >
            {!isCartHydrated ? 'Đang tải giỏ hàng…' : added ? '✓ Đã thêm vào giỏ' : (requiresVariantSelection && !hasSelectedVariant) ? 'Chọn phân loại' : 'Thêm vào giỏ hàng'}
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="w-full text-xs"
            onClick={() => alert('Chức năng chat sẽ có trong Phase 19! Đây là phần giữ chỗ minh họa.')}
          >
            Chat với người bán
          </Button>
          <Button
            variant={isFavorite ? 'secondary' : 'outline'}
            className="w-full text-xs"
            onClick={handleToggleWishlist}
          >
            {isFavorite ? '♥ Đã yêu thích' : '♡ Thêm vào yêu thích'}
          </Button>
        </div>
      </div>
    </div>
  );
};
