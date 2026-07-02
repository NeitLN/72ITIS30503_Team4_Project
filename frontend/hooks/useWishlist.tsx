'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { WishlistItem, getWishlistFromStorage, saveWishlistToStorage } from '../lib/wishlist';

interface WishlistContextType {
  wishlist: WishlistItem[];
  wishlistCount: number;
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  toggleWishlist: (item: WishlistItem) => void;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
  isHydrated: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load wishlist from localStorage after component mounts (avoid SSR mismatch)
  useEffect(() => {
    const loadedWishlist = getWishlistFromStorage();
    const timer = setTimeout(() => {
      setWishlist(loadedWishlist);
      setIsHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      saveWishlistToStorage(wishlist);
    }
  }, [wishlist, isHydrated]);

  const addToWishlist = (newItem: WishlistItem) => {
    setWishlist((prev) => {
      if (prev.some((item) => item.id === newItem.id)) {
        return prev; // already exists
      }
      return [...prev, newItem];
    });
  };

  const removeFromWishlist = (id: string) => {
    setWishlist((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleWishlist = (item: WishlistItem) => {
    setWishlist((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      if (exists) {
        return prev.filter((x) => x.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const isInWishlist = (id: string) => {
    return wishlist.some((item) => item.id === id);
  };

  const clearWishlist = () => {
    setWishlist([]);
  };

  const wishlistCount = wishlist.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        isHydrated,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
