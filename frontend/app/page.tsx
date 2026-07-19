import { HeroSection } from '../components/home/HeroSection';
import { TrustStrip } from '../components/home/TrustStrip';
import { ProductRow } from '../components/home/ProductRow';
import { CategorySpotlight } from '../components/home/CategorySpotlight';
import { SellerCTA } from '../components/home/SellerCTA';
import { Metadata } from 'next';
import { getProducts } from '../lib/catalog';
import { ROUTES } from '../constants/routes';
import { EN } from '../lib/i18n';

export const metadata: Metadata = {
  title: `StyleHub — ${EN.brand.tagline}`,
  description: 'Khám phá đồ streetwear, sneaker, thời trang archive và các tin đăng đồ cũ từ người bán độc lập tại Việt Nam.',
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
        title={EN.home.newArrivals}
        description="Newest active listings from StyleHub sellers"
        products={newArrivals}
        viewAllHref={ROUTES.SHOP}
        emptyMessage="Hiện chưa có tin đăng nào. Quay lại sau — hoặc là người đầu tiên đăng bán."
      />
      <ProductRow
        eyebrow="Limited price drops"
        title={EN.home.onSale}
        description="Active listings currently offered below their original price"
        products={onSale}
        viewAllHref={ROUTES.SHOP}
        emptyMessage="Hiện chưa có tin đăng giảm giá nào. Quay lại sau nhé."
      />
      <SellerCTA />
    </>
  );
}
