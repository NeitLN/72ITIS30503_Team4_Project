export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const ROUTES = {
  HOME: '/',
  SHOP: '/shop',
  SELL: '/sell',
  ABOUT: '/about',
  CONTACT: '/contact',
  PRIVACY_POLICY: '/privacy-policy',
  DELIVERY_TERMS: '/delivery-terms',
  CART: '/cart',
  WISHLIST: '/wishlist',
  CHECKOUT: '/checkout',
  CHECKOUT_SUCCESS: '/checkout/success',
  PROFILE: '/profile',
  LOGIN: '/login',
  REGISTER: '/register',
  PRODUCT: (slug: string) => `/products/${slug}`,
  CATEGORY: (slug: string) => `/category/${slug}`,
};

