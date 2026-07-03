import { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/shop', '/products/', '/category/', '/seller/', '/sell', '/profile'],
      disallow: ['/checkout', '/cart', '/wishlist', '/admin/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
