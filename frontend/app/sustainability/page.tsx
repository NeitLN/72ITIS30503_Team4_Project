import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '../../components/ui/Container';
import { PlatformImpactPanel } from '../../components/sustainability/PlatformImpactPanel';
import { ROUTES } from '../../constants/routes';
import { SITE_URL } from '../../lib/seo';

export const metadata: Metadata = {
  title: 'Circular Impact & Sustainability',
  description: 'How StyleHub counts circular listings and completed circular units with transparent, seller-declared Product Journey data.',
  alternates: { canonical: `${SITE_URL}/sustainability` },
};

const journeys = [
  ['new', 'MỚI', 'Sản phẩm mới, không được tính vào nhóm thời trang tuần hoàn.'],
  ['deadstock', 'HÀNG TỒN KHO MỚI', 'Sản phẩm chưa qua sử dụng được đưa trở lại thị trường.'],
  ['pre_loved', 'ĐÃ QUA SỬ DỤNG', 'Sản phẩm được đăng bán để tiếp tục vòng đời sử dụng với chủ nhân mới.'],
  ['repaired', 'ĐÃ SỬA CHỮA', 'Sản phẩm đã được sửa chữa và có thông tin do người bán cung cấp.'],
  ['upcycled', 'TÁI CHẾ NÂNG CẤP', 'Sản phẩm được người bán cải tạo hoặc thiết kế lại từ vật liệu sẵn có.'],
  ['not_specified', 'CHƯA XÁC ĐỊNH', 'Chưa có thông tin hành trình và không được tính vào tỷ lệ ghi nhận.'],
] as const;

export default function SustainabilityPage() {
  return (
    <div data-testid="sustainability-page" className="bg-neutral-50 pb-20">
      <header className="border-b border-neutral-800 bg-neutral-950 py-14 text-white sm:py-20">
        <Container>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400">THỜI TRANG TUẦN HOÀN STYLEHUB · PHƯƠNG PHÁP TÍNH V1.0</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-black uppercase leading-[0.93] tracking-tight sm:text-6xl lg:text-7xl">MẶC LÂU HƠN. LÃNG PHÍ ÍT HƠN.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg">
            StyleHub minh bạch hoạt động thời trang tuần hoàn bằng số liệu thực tế — không sử dụng các quy đổi hoặc điểm số môi trường thiếu căn cứ.
          </p>
        </Container>
      </header>

      <Container className="py-10 sm:py-14">
        <PlatformImpactPanel />

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
          <section aria-labelledby="journey-heading">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">HỆ THỐNG PHÂN LOẠI</p>
            <h2 id="journey-heading" className="mt-2 font-display text-3xl font-black uppercase tracking-tight">PHÂN LOẠI SẢN PHẨM</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-600">
              Thông tin hành trình sản phẩm do người bán tự khai. StyleHub không xác minh độc lập từng nội dung khai báo. Mỗi phân loại được liên kết với bộ lọc sản phẩm tương ứng trên sàn.
            </p>
            <div className="mt-7 grid gap-px border border-neutral-300 bg-neutral-300 sm:grid-cols-2">
              {journeys.map(([value, label, description], index) => (
                <Link
                  key={value}
                  href={`/shop?lifecycle=${value}`}
                  className="group min-w-0 bg-white p-5 outline-none transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950"
                >
                  <span className="font-mono text-[10px] text-neutral-400">0{index + 1}</span>
                  <h3 className="mt-4 font-display text-lg font-black uppercase tracking-tight group-hover:underline">{label}</h3>
                  <p className="mt-2 text-sm leading-5 text-neutral-600">{description}</p>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="border border-neutral-300 bg-white p-6">
              <h2 className="font-display text-xl font-black uppercase">NHỮNG GÌ STYLEHUB KHÔNG CAM KẾT</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                StyleHub không cung cấp ước tính carbon, lượng nước, chất thải tránh được hoặc điểm số môi trường. Chúng tôi chỉ công bố số lượng sản phẩm và giao dịch dựa trên dữ liệu thực tế của nền tảng.
              </p>
            </section>
            <section id="sustainability-disclosure" className="border border-amber-300 bg-amber-50 p-6">
              <h2 className="font-display text-xl font-black uppercase">VỀ DỮ LIỆU NÀY</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                StyleHub là dự án học phần đại học. Các số liệu được trình bày nhằm minh họa cách một sàn thương mại điện tử C2C có thể ghi nhận hoạt động thời trang tuần hoàn. Mọi thông tin hành trình sản phẩm đều do người bán tự khai và không được xem là chứng nhận độc lập về tác động môi trường.
              </p>
            </section>
            <section className="border border-neutral-950 bg-neutral-950 p-6 text-white">
              <h2 className="font-display text-xl font-black uppercase">CÁCH TÍNH SỐ LIỆU</h2>
              <ol className="mt-4 space-y-4 text-sm leading-6 text-neutral-300">
                <li><span className="font-mono text-neutral-500">01</span> Chỉ tính các tin đăng cộng đồng đang hoạt động; không tính sản phẩm mẫu được tạo sẵn.</li>
                <li><span className="font-mono text-neutral-500">02</span> Nhóm tuần hoàn gồm hàng tồn kho mới, sản phẩm đã qua sử dụng, đã sửa chữa và tái chế nâng cấp. Sản phẩm mới không được tính vào nhóm tuần hoàn.</li>
                <li><span className="font-mono text-neutral-500">03</span> Sản phẩm trong đơn hàng hoàn tất được tính theo số lượng từng mặt hàng và sử dụng thông tin hành trình tại thời điểm thanh toán.</li>
              </ol>
              <p className="mt-5 border-t border-neutral-700 pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-400">
                THỜI GIAN HIỂN THỊ LÀ THỜI ĐIỂM TÍNH TOÁN, KHÔNG PHẢI MỐC XÁC NHẬN DỮ LIỆU LỊCH SỬ.
              </p>
            </section>
          </aside>
        </div>

        <section className="mt-14 border-t border-neutral-300 pt-10" aria-labelledby="sdg-heading">
          <h2 id="sdg-heading" className="font-display text-2xl font-black uppercase">THƯƠNG MẠI CÓ TRÁCH NHIỆM</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="border border-neutral-300 bg-white p-6">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]">SDG 12 · TIÊU DÙNG VÀ SẢN XUẤT CÓ TRÁCH NHIỆM</p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">Các tính năng tái sử dụng và công khai hành trình sản phẩm của StyleHub góp phần khuyến khích tiêu dùng có trách nhiệm. Đây chỉ là định hướng tham khảo, không phải chứng nhận hoặc kết quả tác động đã được đo lường.</p>
            </div>
            <div className="border border-neutral-300 bg-white p-6">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]">SDG 8 · VIỆC LÀM BỀN VỮNG VÀ TĂNG TRƯỞNG KINH TẾ</p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">Mua bán C2C giúp sản phẩm tiếp tục tạo ra giá trị trong hoạt động thương mại địa phương. StyleHub không định lượng tác động kinh tế và không tuyên bố được chứng nhận chính thức theo SDG.</p>
            </div>
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-3 border-t border-neutral-300 pt-8 sm:flex-row">
          <Link href={ROUTES.SHOP_CIRCULAR} className="inline-flex min-h-11 items-center justify-center bg-neutral-950 px-5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white">XEM SẢN PHẨM TUẦN HOÀN</Link>
          <Link href={ROUTES.SELL} className="inline-flex min-h-11 items-center justify-center border border-neutral-950 bg-white px-5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-950">KHAI BÁO HÀNH TRÌNH SẢN PHẨM</Link>
        </div>
      </Container>
    </div>
  );
}
