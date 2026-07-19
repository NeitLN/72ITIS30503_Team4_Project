import Link from 'next/link';
import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { ROUTES } from '../../constants/routes';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description:
    'Tìm hiểu về StyleHub, chợ thời trang C2C dành cho streetwear, thương hiệu địa phương và đồ đã qua sử dụng tại Việt Nam.',
};

const principles = [
  {
    title: 'Minh bạch tình trạng sản phẩm',
    description:
      'Mỗi tin đăng đều có nhãn tình trạng rõ ràng, giúp bạn biết chính xác mình đang mua gì trước khi nhận hàng.',
  },
  {
    title: 'Danh tính người bán',
    description:
      'Đánh giá, số lượng đã bán và huy hiệu xác thực giúp thể hiện rõ sự tin cậy giữa người mua và người bán trên mỗi tin đăng.',
  },
  {
    title: 'Tập trung vào thị trường trong nước',
    description:
      'Được xây dựng cho thị trường Việt Nam — giá niêm yết bằng VNĐ, vị trí người bán trong nước và kỳ vọng giao hàng nội địa.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Chợ trực tuyến"
        title="Giới thiệu StyleHub"
        lede="Chợ thời trang do cộng đồng dẫn dắt, kết nối người mua và người bán trên khắp Việt Nam — streetwear, thương hiệu địa phương và các sản phẩm đã qua sử dụng được chọn lọc."
      />

      <Container className="max-w-4xl py-14 sm:py-16">
        <section className="mb-14">
          <h2 className="mb-4 font-display text-2xl font-black uppercase tracking-tight">Vì sao chọn StyleHub</h2>
          <p className="leading-relaxed text-neutral-600">
            Chúng tôi tin rằng thời trang nên mang tính tuần hoàn, dễ tiếp cận và hướng đến cộng
            đồng. Dù bạn đang tìm một sản phẩm đã hết hàng từ thương hiệu Việt Nam địa phương, hay
            đang dọn tủ đồ để có chỗ cho những phong cách mới, StyleHub mang đến một nơi để làm điều
            đó an toàn và đơn giản — từ người bán đến người mua, không qua trung gian.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-tight">
            Nguyên tắc hoạt động của chợ
          </h2>
          <ul className="space-y-6">
            {principles.map((item) => (
              <li key={item.title} className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-8 sm:flex-row">
          <Link
            href={ROUTES.SHOP}
            className="inline-flex items-center justify-center bg-neutral-900 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-neutral-700"
          >
            Mua sắm ngay
          </Link>
          <Link
            href={ROUTES.SELL}
            className="inline-flex items-center justify-center border border-neutral-900 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white"
          >
            Bắt đầu đăng bán
          </Link>
        </div>
      </Container>
    </>
  );
}
