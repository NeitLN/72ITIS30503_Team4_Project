import { HeroSection } from '../components/home/HeroSection';
import { TrustStrip } from '../components/home/TrustStrip';
import { ProductRow } from '../components/home/ProductRow';
import { CategorySpotlight } from '../components/home/CategorySpotlight';
import { SellerCTA } from '../components/home/SellerCTA';
import { CircularImpactSection } from '../components/home/CircularImpactSection';
import { Metadata } from 'next';
import { getProducts } from '../lib/catalog';
import { ROUTES } from '../constants/routes';
import { EN } from '../lib/i18n';

export const metadata: Metadata = {
  title: `StyleHub — ${EN.brand.tagline}`,
  description: 'Nền tảng thời trang C2C nơi mọi người có thể mua, đăng bán và tìm lại giá trị mới cho các sản phẩm thuộc nhiều thương hiệu, phong cách và tình trạng khác nhau tại Việt Nam.',
};

export default async function Home() {
  const [newArrivalsResult, onSaleResult] = await Promise.all([
    getProducts({ sort: 'latest', on_sale: 'false', limit: '8' }).catch(() => null),
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
      <CircularImpactSection />
      <ProductRow
        eyebrow="MỚI ĐĂNG TỪ CỘNG ĐỒNG"
        title={EN.home.newArrivals}
        description="Sản phẩm mới đăng từ người bán trên StyleHub"
        products={newArrivals}
        viewAllHref={ROUTES.SHOP}
        emptyMessage="Hiện chưa có tin đăng nào. Quay lại sau — hoặc là người đầu tiên đăng bán."
      />
      <ProductRow
        eyebrow="Limited price drops"
        title={EN.home.onSale}
        description="Các sản phẩm đang được bán với giá thấp hơn giá gốc"
        products={onSale}
        viewAllHref={ROUTES.SHOP}
        emptyMessage="Hiện chưa có tin đăng giảm giá nào. Quay lại sau nhé."
      />
      <SellerCTA />
    </>
  );
}
