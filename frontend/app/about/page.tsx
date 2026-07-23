import Link from 'next/link';
import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { ROUTES } from '../../constants/routes';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'StyleHub is a C2C fashion marketplace where people buy, sell, and rediscover pieces across different brands, styles, and stories — in Vietnam.',
};

const principles = [
  {
    title: 'MINH BẠCH TÌNH TRẠNG',
    description:
      'Mỗi tin đăng đều mô tả rõ tình trạng sản phẩm, giúp người mua nắm đầy đủ thông tin trước khi đặt hàng.',
  },
  {
    title: 'THÔNG TIN NGƯỜI BÁN',
    description:
      'Đánh giá, số lượng đã bán và huy hiệu xác minh giúp người mua dễ dàng kiểm tra độ tin cậy của người bán.',
  },
  {
    title: 'PHÙ HỢP THỊ TRƯỜNG VIỆT NAM',
    description:
      'Được xây dựng dành cho thị trường Việt Nam — hiển thị giá bằng VNĐ, hỗ trợ vị trí người bán trong nước và giao hàng nội địa.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="SÀN THƯƠNG MẠI ĐIỆN TỬ C2C"
        title="Giới thiệu StyleHub"
        lede="StyleHub là sàn thương mại điện tử C2C về thời trang, nơi mọi người có thể mua, bán và khám phá lại những món đồ thuộc nhiều thương hiệu, phong cách và câu chuyện khác nhau — kết nối người mua và người bán trên khắp Việt Nam."
      />

      <Container className="max-w-4xl py-14 sm:py-16">
        <section className="mb-14">
          <h2 className="mb-4 font-display text-2xl font-black uppercase tracking-tight">TẠI SAO CHỌN STYLEHUB</h2>
          <p className="leading-relaxed text-neutral-600">
            Chúng tôi tin rằng thời trang nên bền vững, dễ tiếp cận và gắn kết cộng đồng. Dù bạn đang tìm một sản phẩm từ thương hiệu yêu thích, một món đồ hiếm hay muốn thanh lý quần áo không còn sử dụng, StyleHub giúp bạn mua bán trực tiếp, an toàn và thuận tiện.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-tight">
            CÁCH STYLEHUB HOẠT ĐỘNG
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
            Khám phá sàn mua bán
          </Link>
          <Link
            href={ROUTES.SELL}
            className="inline-flex items-center justify-center border border-neutral-900 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white"
          >
            Đăng bán sản phẩm
          </Link>
        </div>
      </Container>
    </>
  );
}
