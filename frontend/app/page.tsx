import { HeroSection } from '../components/home/HeroSection';
import { TrustStrip } from '../components/home/TrustStrip';
import { FeaturedProductsSection } from '../components/home/FeaturedProductsSection';
import { CategorySpotlight } from '../components/home/CategorySpotlight';
import { SellerCTA } from '../components/home/SellerCTA';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StyleHub — Buy the Drop, Sell the Archive',
  description: 'Discover local streetwear, sneakers, archive fashion, and pre-loved listings from independent sellers in Vietnam.',
};

export default function Home() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      {/* Server Component Wrapper */}
      <FeaturedProductsSection />
      {/* Server Component Wrapper */}
      <CategorySpotlight />
      <SellerCTA />
    </>
  );
}
