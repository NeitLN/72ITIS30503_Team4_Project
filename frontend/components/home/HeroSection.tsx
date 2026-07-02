import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';

export const HeroSection = () => {
  return (
    <section className="border-b border-neutral-200 bg-neutral-950 text-white">
      <Container className="py-20 sm:py-28">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400">
          C2C fashion marketplace — Vietnam
        </p>
        <h1 className="max-w-4xl font-display text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
          Buy the drop.
          <br />
          Sell the archive.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-neutral-300 sm:text-xl">
          Local brands, pre-loved pieces, and streetwear finds — listed by sellers across Vietnam,
          priced in VNĐ, passed from one closet to the next.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={ROUTES.SHOP}
            className="inline-flex items-center justify-center bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            Shop marketplace
          </Link>
          <Link
            href={ROUTES.SELL}
            className="inline-flex items-center justify-center border border-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-neutral-950"
          >
            Start selling
          </Link>
        </div>
      </Container>

      {/* Static route ticker — grounding strip */}
      <div className="border-t border-neutral-800 py-3">
        <Container>
          <p className="truncate font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-500">
            Hà Nội → Sài Gòn → Đà Nẵng · Condition checked · VNĐ pricing · Seller to buyer, no middle rack
          </p>
        </Container>
      </div>
    </section>
  );
};
