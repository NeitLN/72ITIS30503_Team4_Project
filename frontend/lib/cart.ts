export interface CartItem {
  id: string; // unique cart item id (e.g. product_id or variant_id)
  productId: string;
  variantId: string | null;
  name: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  size: string;
  condition: string;
  brandName: string | null;
  sellerHandle: string;
  quantity: number;
  slug: string;
}

const CART_KEY = 'stylehub_cart';

export function getCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const data = localStorage.getItem(CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading cart from localStorage:', error);
    return [];
  }
}

export function saveCartToStorage(cart: CartItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}
