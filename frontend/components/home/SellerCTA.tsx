import { Container } from '../ui/Container';
import Link from 'next/link';
import { ROUTES } from '../../constants/routes';

const steps = [
  { step: '01', title: 'TẢI HÌNH ẢNH', description: 'Chụp sản phẩm dưới ánh sáng tự nhiên — gồm mặt trước, mặt sau, nhãn mác và các khuyết điểm nếu có.' },
  { step: '02', title: 'THÊM THÔNG TIN', description: 'Cung cấp thương hiệu, kích thước và tình trạng thực tế của sản phẩm.' },
  { step: '03', title: 'ĐẶT GIÁ BÁN', description: 'Đặt giá bằng VNĐ theo định dạng quen thuộc tại Việt Nam.' },
  { step: '04', title: 'ĐĂNG BÁN', description: 'Đăng sản phẩm và trao đổi trực tiếp với người mua.' },
];

export const SellerCTA = () => {
  return (
    <section className="border-t border-neutral-200 py-20 sm:py-24">
      <Container>
        <div className="bg-neutral-950 px-6 py-12 text-white sm:px-12 sm:py-16">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            TRỞ THÀNH NGƯỜI BÁN
          </p>
          <h2 className="max-w-2xl font-display text-4xl font-black uppercase leading-[1.08] tracking-tight sm:text-5xl">
            BIẾN TỦ ĐỒ THÀNH<br />GIAN HÀNG.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-300">
            Ai cũng có thể bán hàng trên StyleHub. Chỉ mất vài phút để đăng sản phẩm và tiếp cận những người mua đang tìm kiếm món đồ phù hợp.
          </p>

          <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <li key={item.step} className="border-t border-neutral-700 pt-4">
                <p className="font-mono text-[11px] tracking-[0.2em] text-neutral-500">{item.step}</p>
                <h3 className="mt-2 font-semibold uppercase tracking-wide">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{item.description}</p>
              </li>
            ))}
          </ol>

          <Link
            href={ROUTES.SELL}
            className="mt-12 inline-flex items-center justify-center bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            BẮT ĐẦU ĐĂNG BÁN
          </Link>
        </div>
      </Container>
    </section>
  );
};
