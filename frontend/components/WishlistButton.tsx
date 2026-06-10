"use client";

import { useState } from "react";
import { useMarketplace } from "@/components/MarketplaceProvider";

export default function WishlistButton({
  productId,
  className = "",
}: {
  productId: string;
  className?: string;
}) {
  const { wishlist_product_ids, toggleWishlist } = useMarketplace();
  const [pending, setPending] = useState(false);
  const active = wishlist_product_ids.includes(productId);

  return (
    <button
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      className={`wishlist-button ${active ? "active" : ""} ${className}`}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await toggleWishlist(productId);
        } finally {
          setPending(false);
        }
      }}
      type="button"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
      </svg>
    </button>
  );
}
