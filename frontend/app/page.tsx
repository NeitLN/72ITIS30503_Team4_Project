import { HeroSection } from '../components/home/HeroSection';
import { TrustStrip } from '../components/home/TrustStrip';
import { ProductRow } from '../components/home/ProductRow';
import { CategorySpotlight } from '../components/home/CategorySpotlight';
import { SellerCTA } from '../components/home/SellerCTA';
import { Metadata } from 'next';
import { getProducts } from '../lib/catalog';
import { ROUTES } from '../constants/routes';

export const metadata: Metadata = {
  title: 'StyleHub — Buy the Drop, Sell the Archive',
  description: 'Discover local streetwear, sneakers, archive fashion, and pre-loved listings from independent sellers in Vietnam.',
};

export default async function Home() {
  const [newArrivalsResult, onSaleResult] = await Promise.all([
    getProducts({ sort: 'latest', limit: '8' }).catch(() => null),
    getProducts({ on_sale: 'true', limit: '8' }).catch(() => null)
  ]);

  const newArrivals = Array.isArray(newArrivalsResult?.data) ? newArrivalsResult.data : [];
  const onSale = Array.isArray(onSaleResult?.data) ? onSaleResult.data : [];

  return (
    <>
      <HeroSection />
      <TrustStrip />
      {/* Server Component Wrapper */}
      <CategorySpotlight />
      <ProductRow
        eyebrow="Fresh from the community"
        title="New Arrivals"
        description="newest active listings from StyleHub sellers"
        products={newArrivals}
        viewAllHref={ROUTES.SHOP}
        emptyMessage="Listings are currently unavailable. Check back soon — or be the first to sell."
      />
      <ProductRow
        eyebrow="Limited price drops"
        title="On Sale"
        description="active listings currently offered below their original price"
        products={onSale}
        viewAllHref={ROUTES.SHOP}
        emptyMessage="No listings on sale right now. Check back soon."
      />
      <SellerCTA />
    </>
  );
}
