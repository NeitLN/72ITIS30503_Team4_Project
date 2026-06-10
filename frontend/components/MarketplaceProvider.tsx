"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MarketplaceState = {
  cart_count: number;
  wishlist_product_ids: string[];
};

type MarketplaceContextValue = MarketplaceState & {
  loading: boolean;
  addToCart: (productId: string, variantId?: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

const emptyState: MarketplaceState = {
  cart_count: 0,
  wishlist_product_ids: [],
};

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/marketplace", { cache: "no-store" })
      .then(async (response) => {
        if (active && response.ok) setState(await response.json());
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const perform = useCallback(
    async (body: Record<string, string | undefined>) => {
      setLoading(true);
      const response = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      setLoading(false);
      if (!response.ok) throw new Error(result.error ?? "Marketplace action failed.");
      setState(result);
    },
    [],
  );

  const value = useMemo(
    () => ({
      ...state,
      loading,
      addToCart: (productId: string, variantId?: string) =>
        perform({ action: "cart", productId, variantId }),
      toggleWishlist: (productId: string) =>
        perform({ action: "wishlist", productId }),
    }),
    [loading, perform, state],
  );

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error("useMarketplace must be used inside MarketplaceProvider.");
  return context;
}
