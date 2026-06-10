"use client";

import { useMemo, useState } from "react";
import { useMarketplace } from "@/components/MarketplaceProvider";
import { formatVnd } from "@/lib/format";
import type { ProductVariant } from "@/lib/products";

export default function ProductPurchasePanel({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariant[];
}) {
  const availableVariants = variants.filter((variant) => variant.title.includes(" / "));
  const displayVariants = availableVariants.length ? availableVariants : variants;
  const sizes = Array.from(new Set(displayVariants.map((variant) => variant.size)));
  const colors = Array.from(
    new Set(displayVariants.map((variant) => variant.color).filter(Boolean) as string[]),
  );
  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const { addToCart } = useMarketplace();

  const selectedVariant = useMemo(
    () =>
      displayVariants.find(
        (variant) =>
          variant.size === selectedSize &&
          (!variant.color || variant.color === selectedColor),
      ) ?? displayVariants[0],
    [displayVariants, selectedColor, selectedSize],
  );

  const inStock = Boolean(selectedVariant && selectedVariant.stock > 0 && selectedVariant.status === "active");

  return (
    <div className="purchase-panel">
      {sizes.length > 0 && (
        <fieldset className="variant-group">
          <legend>Size</legend>
          <div className="variant-options">
            {sizes.map((size) => (
              <button
                className={selectedSize === size ? "variant-option selected" : "variant-option"}
                key={size}
                onClick={() => setSelectedSize(size)}
                type="button"
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {colors.length > 0 && (
        <fieldset className="variant-group">
          <legend>Color</legend>
          <div className="variant-options">
            {colors.map((color) => (
              <button
                className={selectedColor === color ? "variant-option selected" : "variant-option"}
                key={color}
                onClick={() => setSelectedColor(color)}
                type="button"
              >
                <span className={`color-dot color-${color.toLowerCase()}`} />
                {color}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className={inStock ? "stock-status available" : "stock-status unavailable"}>
        {inStock
          ? `${selectedVariant.stock} available · ${formatVnd(selectedVariant.sale_price ?? selectedVariant.price)}`
          : "This variant is out of stock"}
      </div>

      <button
        className="add-to-cart-button"
        disabled={!inStock || pending}
        onClick={async () => {
          setPending(true);
          setMessage("");
          try {
            await addToCart(productId, selectedVariant?.id);
            setMessage("Added to your demo cart.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not add this item.");
          } finally {
            setPending(false);
          }
        }}
        type="button"
      >
        {pending ? "Adding..." : "Add to cart"}
      </button>
      {message && <p className="purchase-message" role="status">{message}</p>}
    </div>
  );
}
