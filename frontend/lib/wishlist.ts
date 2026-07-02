export interface WishlistItem {
  id: string; // product id
  name: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  size: string;
  condition: string;
  brandName: string | null;
  sellerHandle: string;
  slug: string;
}

const WISHLIST_KEY = 'stylehub_wishlist';

export function getWishlistFromStorage(): WishlistItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const data = localStorage.getItem(WISHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading wishlist from localStorage:', error);
    return [];
  }
}

export function saveWishlistToStorage(wishlist: WishlistItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  } catch (error) {
    console.error('Error saving wishlist to localStorage:', error);
  }
}
