import { PageHeader } from '../../components/ui/PageHeader';
import { SellListingClient } from '../../components/sell/SellListingClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng bán sản phẩm',
  description: 'Đăng bán đồ streetwear, giày sneaker, phụ kiện và thời trang đã qua sử dụng trên StyleHub chỉ trong sáu bước.',
};

export default function SellPage() {
  return (
    <main className="bg-neutral-50 min-h-screen">
      <PageHeader
        eyebrow="Trung tâm người bán"
        title="Đăng lại món đồ của bạn. Tìm cho nó một chủ nhân mới."
        lede="Đăng sản phẩm thật lên StyleHub chỉ trong sáu bước — sản phẩm sẽ xuất hiện ngay trên toàn bộ chợ thời trang."
      />
      <SellListingClient />
    </main>
  );
}

