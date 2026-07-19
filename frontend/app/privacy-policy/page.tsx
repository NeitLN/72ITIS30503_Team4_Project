import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'Chính sách bảo mật và thông tin thu thập dữ liệu của StyleHub.',
};

const sections = [
  {
    title: 'Thông tin chúng tôi thu thập',
    body: 'Khi bạn đăng ký làm người mua hoặc người bán trên StyleHub, chúng tôi thu thập thông tin hồ sơ cơ bản bao gồm tên đăng nhập, địa chỉ email, họ và tên, và dữ liệu vị trí (không bắt buộc). Đối với người bán, chúng tôi cũng lưu trữ tin đăng sản phẩm, hình ảnh, giá bán và các hoạt động tương tác trên chợ.',
  },
  {
    title: 'Cách chúng tôi sử dụng thông tin',
    body: 'Chúng tôi sử dụng thông tin này để vận hành trải nghiệm chợ C2C: hiển thị hồ sơ công khai của bạn, kết nối người mua với người bán, hiển thị tin đăng của bạn và duy trì một môi trường đáng tin cậy thông qua đánh giá và nhận xét.',
  },
  {
    title: 'Khả năng hiển thị trên chợ',
    body: 'Là một nền tảng C2C, tên đăng nhập, vị trí và điểm đánh giá của người bán được công khai theo thiết kế. Khi bạn đăng một sản phẩm, hình ảnh và mô tả bạn tải lên sẽ hiển thị với tất cả khách truy cập. Tin nhắn trực tiếp về đơn hàng vẫn được giữ riêng tư giữa người mua và người bán.',
  },
  {
    title: 'Bảo mật dữ liệu',
    body: 'Chúng tôi sử dụng Supabase làm nhà cung cấp hạ tầng backend, chịu trách nhiệm xác thực an toàn và lưu trữ cơ sở dữ liệu. Mật khẩu được mã hóa bởi nhà cung cấp xác thực, và Row Level Security đảm bảo người dùng chỉ có thể chỉnh sửa tin đăng của chính mình.',
  },
  {
    title: 'Liên hệ',
    body: 'Nếu bạn có câu hỏi về chính sách này hoặc muốn xóa tài khoản demo của mình, vui lòng sử dụng trang Liên hệ hoặc gửi email đến support@stylehub.local.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHeader eyebrow="Điều khoản" title="Chính sách bảo mật" />

      <Container className="max-w-3xl py-14 sm:py-16">
        <aside className="mb-12 border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Lưu ý về dự án demo
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
            StyleHub là một dự án minh họa của trường đại học. Chúng tôi không xử lý thanh toán
            thật hoặc thu thập dữ liệu cá nhân cho mục đích thương mại. Dữ liệu lưu trữ trên hệ
            thống của chúng tôi chỉ nhằm minh họa chức năng của chợ trực tuyến.
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
