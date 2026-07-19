import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Điều khoản vận chuyển',
  description: 'Tìm hiểu cách vận chuyển và giao hàng hoạt động trên chợ C2C StyleHub.',
};

const sections = [
  {
    title: 'Cách thức giao hàng hoạt động',
    body: 'StyleHub hoạt động theo mô hình người dùng với người dùng (C2C): không có nhà kho trung gian. Người bán vận chuyển sản phẩm trực tiếp đến người mua. Phí vận chuyển và thời gian giao hàng thay đổi tùy theo vị trí của người bán và đơn vị vận chuyển được chọn.',
  },
  {
    title: 'Trách nhiệm của người bán',
    body: 'Người bán cần đóng gói sản phẩm chắc chắn để tránh hư hỏng trong quá trình vận chuyển. Sản phẩm gửi đi phải đúng với tình trạng và mô tả trong tin đăng, và phải được gửi trong khoảng thời gian đã thỏa thuận sau khi đơn hàng được xác nhận.',
  },
  {
    title: 'Trách nhiệm của người mua',
    body: 'Người mua cần cung cấp địa chỉ giao hàng chính xác, dễ tiếp cận trong lãnh thổ Việt Nam. Khi nhận hàng, hãy kiểm tra sản phẩm ngay để xác nhận tình trạng đúng với tin đăng trước khi xác nhận hoàn tất giao dịch.',
  },
  {
    title: 'Nhận hàng trực tiếp',
    body: 'Nếu người mua và người bán ở cùng một thành phố — chẳng hạn cả hai đều ở Thành phố Hồ Chí Minh — họ có thể thỏa thuận qua chat để sắp xếp nhận hàng trực tiếp và tiết kiệm phí vận chuyển. StyleHub khuyến nghị gặp mặt ở những nơi an toàn, công khai.',
  },
  {
    title: 'Tích hợp giao hàng trong tương lai',
    body: 'Trong các giai đoạn tiếp theo, StyleHub dự định tích hợp với các đơn vị vận chuyển trong nước (như GHTK hoặc Viettel Post) để tự động tạo nhãn vận chuyển, mã theo dõi và phí giao hàng chuẩn hóa khi thanh toán.',
  },
];

export default function DeliveryTermsPage() {
  return (
    <>
      <PageHeader eyebrow="Điều khoản" title="Điều khoản vận chuyển" />

      <Container className="max-w-3xl py-14 sm:py-16">
        <aside className="mb-12 border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Lưu ý về dự án demo
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
            StyleHub hiện là một nền tảng minh họa. Chưa có hệ thống vận chuyển thực tế, tích hợp
            đơn vị vận chuyển hoặc giao dịch tiền thật nào được vận hành. Các điều khoản này mô tả
            mô hình dự kiến cho chợ trực tuyến.
          </p>
        </aside>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <section key={section.title} className="border-t border-neutral-200 pt-6">
              <h2 className="flex items-baseline gap-4 font-display text-xl font-extrabold uppercase tracking-tight text-neutral-900">
                <span className="font-mono text-xs font-normal tracking-[0.2em] text-neutral-400">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 sm:text-base">{section.body}</p>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
