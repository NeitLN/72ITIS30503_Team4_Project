import { HeroSection } from '../components/home/HeroSection';
import { TrustStrip } from '../components/home/TrustStrip';
import { FeaturedProductsSection } from '../components/home/FeaturedProductsSection';
import { CategorySpotlight } from '../components/home/CategorySpotlight';
import { SellerCTA } from '../components/home/SellerCTA';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StyleHub | C2C Fashion Marketplace',
  description: 'Buy, sell, and discover local brands, pre-loved fashion, and streetwear in Vietnam.',
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
