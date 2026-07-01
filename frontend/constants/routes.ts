export const ROUTES = {
  HOME: '/',
  SHOP: '/shop',
  SELL: '/sell',
  PRODUCT: (slug: string) => `/products/${slug}`,
  CATEGORY: (slug: string) => `/category/${slug}`,
};
