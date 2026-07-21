import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { ContactForm } from '../../components/contact/ContactForm';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description: 'Liên hệ với đội ngũ StyleHub.',
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Hỗ trợ"
        title="Liên hệ"
        lede="Có câu hỏi về đơn hàng, người bán, hoặc cách StyleHub hoạt động? Gửi tin nhắn cho chúng tôi và đội ngũ sẽ phản hồi sớm nhất."
      />

      <Container className="max-w-4xl py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <div className="space-y-6">
              <div className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">Email</h3>
                <a
                  href="mailto:support@stylehub.vn"
                  className="mt-1.5 inline-block text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  support@stylehub.vn
                </a>
              </div>
              <div className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">Đường dây nóng</h3>
                <a
                  href="tel:19006868"
                  className="mt-1.5 inline-block text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  1900 6868
                </a>
              </div>
              <div className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">
                  Giờ hỗ trợ
                </h3>
                <p className="mt-1.5 text-sm text-neutral-600">Thứ Hai – Chủ Nhật, 08:00–22:00</p>
              </div>
              <div className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">Văn phòng</h3>
                <p className="mt-1.5 text-sm text-neutral-600">Thành phố Hồ Chí Minh, Việt Nam</p>
                <div className="mt-3 aspect-video w-full overflow-hidden border border-neutral-200">
                  <iframe
                    title="Bản đồ văn phòng StyleHub tại Thành phố Hồ Chí Minh"
                    src="https://www.google.com/maps?q=Th%C3%A0nh%20ph%E1%BB%91%20H%E1%BB%93%20Ch%C3%AD%20Minh%2C%20Vi%E1%BB%87t%20Nam&output=embed"
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>

            <aside className="mt-10 border border-neutral-200 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Trò chuyện trực tiếp
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
                Cần phản hồi nhanh hơn? Sử dụng khung chat trực tiếp để trò chuyện với đội ngũ hỗ
                trợ của StyleHub.
              </p>
            </aside>

            <aside className="mt-4 border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Lưu ý về dự án demo
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
                StyleHub là một dự án demo của trường đại học. Biểu mẫu liên hệ này chỉ là giao
                diện minh họa và không gửi email thật.
              </p>
            </aside>
          </div>

          <div className="border border-neutral-200 bg-white p-6">
            <ContactForm />
          </div>
        </div>

        <section className="mt-14 border-t border-neutral-200 pt-8" aria-labelledby="quick-support-heading">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Chủ đề hỗ trợ</p>
            <h2 id="quick-support-heading" className="mt-2 text-xl font-semibold text-neutral-900">
              Hỗ trợ nhanh
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-medium text-neutral-900">Mua hàng an toàn</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Kiểm tra thông tin người bán và tin đăng trước khi mua hàng.
              </p>
            </div>

            <Link
              href="/sell"
              className="group border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <h3 className="text-sm font-medium text-neutral-900">Đăng bán sản phẩm</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Tạo tin đăng và chia sẻ sản phẩm của bạn với cộng đồng StyleHub.
              </p>
              <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 group-hover:text-neutral-900">
                Bắt đầu đăng bán →
              </span>
            </Link>

            <Link
              href="/delivery-terms"
              className="group border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <h3 className="text-sm font-medium text-neutral-900">Đơn hàng và giao hàng</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Tìm hiểu về kỳ vọng giao hàng và cách xử lý đơn hàng.
              </p>
              <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 group-hover:text-neutral-900">
                Điều khoản vận chuyển →
              </span>
            </Link>

            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-medium text-neutral-900">Báo cáo tin đăng</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Sử dụng biểu mẫu liên hệ và chọn “Báo cáo người bán” để thông báo cho đội ngũ hỗ trợ.
              </p>
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
