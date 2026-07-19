import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';

export const HeroSection = () => {
  return (
    <section 
      className="relative border-b border-neutral-200 bg-neutral-950 text-white bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/image.png')" }}
    >
      {/* Dark overlay for rich contrast and ultimate readability */}
      <div className="absolute inset-0 bg-neutral-950/75 z-0" />

      {/* Content wrapper positioned above the overlay */}
      <div className="relative z-10">
        <Container className="py-20 sm:py-28">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            Chợ thời trang C2C — Việt Nam
          </p>
          <h1 className="max-w-4xl font-display text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            Săn hàng mới.
            <br />
            Bán đồ độc.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-neutral-300 sm:text-xl">
            Thương hiệu địa phương, đồ đã qua sử dụng và các món streetwear hiếm — được đăng bán bởi
            người bán trên khắp Việt Nam, định giá bằng VNĐ, chuyền tay từ tủ đồ này sang tủ đồ khác.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href={ROUTES.SHOP}
              className="inline-flex items-center justify-center bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-neutral-950 transition-colors hover:bg-neutral-200"
            >
              Mua sắm ngay
            </Link>
            <Link
              href={ROUTES.SELL}
              className="inline-flex items-center justify-center border border-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-neutral-950"
            >
              Bắt đầu bán hàng
            </Link>
          </div>
        </Container>

        {/* Static route ticker — grounding strip */}
        <div className="border-t border-white/10 py-3">
          <Container>
            <p className="truncate font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-300">
              Hà Nội → Sài Gòn → Đà Nẵng · Đã kiểm tra tình trạng · Giá niêm yết VNĐ · Từ người bán đến người mua, không qua trung gian
            </p>
          </Container>
        </div>
      </div>
    </section>
  );
};
