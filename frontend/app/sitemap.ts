import { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/seo';
import { getProducts, getCategories } from '../lib/catalog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const defaultRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/shop`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/sustainability`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/delivery-terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/sell`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/profile`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${SITE_URL}/cart`, lastModified: new Date(), changeFrequency: 'always', priority: 0.1 },
    { url: `${SITE_URL}/checkout`, lastModified: new Date(), changeFrequency: 'always', priority: 0.1 },
    { url: `${SITE_URL}/wishlist`, lastModified: new Date(), changeFrequency: 'always', priority: 0.1 },
  ];

  try {
    const productsRes = await getProducts({ limit: '100' });
    const categoriesRes = await getCategories();

    const productRoutes: MetadataRoute.Sitemap = (productsRes.data || []).map((product) => ({
      url: `${SITE_URL}/products/${product.slug}`,
      lastModified: new Date(product.created_at || new Date()),
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = (categoriesRes.data || []).map((category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    }));

    // Demo seller route
    const sellerRoutes: MetadataRoute.Sitemap = [
      { url: `${SITE_URL}/seller/vietstyle`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 }
    ];

    return [...defaultRoutes, ...categoryRoutes, ...productRoutes, ...sellerRoutes];
  } catch {
    // If backend fails during build, return default routes safely
    return defaultRoutes;
  }
}
