export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const ROUTES = {
  HOME: '/',
  SHOP: '/shop',
  SELL: '/sell',
  ABOUT: '/about',
  CONTACT: '/contact',
  PRIVACY_POLICY: '/privacy-policy',
  DELIVERY_TERMS: '/delivery-terms',
  SUSTAINABILITY: '/sustainability',
  SHOP_CIRCULAR: '/shop?lifecycle=deadstock%2Cpre_loved%2Crepaired%2Cupcycled',
  CART: '/cart',
  WISHLIST: '/wishlist',
  CHECKOUT: '/checkout',
  CHECKOUT_SUCCESS: '/checkout/success',
  PROFILE: '/profile',
  LOGIN: '/login',
  REGISTER: '/register',
  ORDERS: '/orders',
  ADMIN_OVERVIEW: '/admin',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_TRANSACTIONS: '/admin/transactions',
  SELLER_DASHBOARD: '/seller/dashboard',
  PRODUCT: (slug: string) => `/products/${slug}`,
  CATEGORY: (slug: string) => `/category/${slug}`,
  SELLER_PROFILE: (username: string) => `/seller/${username}`,
};

