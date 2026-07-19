import { Container } from '../ui/Container';

const trustBadges = ['Verified sellers', 'Condition checked', 'VNĐ pricing', 'Local fashion'];

export const ShopHero = () => {
  return (
    <section className="relative border-b border-neutral-200 bg-neutral-950 text-white overflow-hidden">
      {/* 1. Dark contrast overlay for premium readability */}
      <div className="absolute inset-0 bg-neutral-950 z-10" />

      {/* 2. Text content wrapper */}
      <div className="relative z-20">
        <Container className="py-14 sm:py-20">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            Every listing has a seller
          </p>
          <h1 className="font-display text-5xl font-black uppercase tracking-tight sm:text-6xl text-white">
            Marketplace
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-200 sm:text-lg">
            Discover local brands, pre-loved pieces, and streetwear listings from sellers across
            Vietnam.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {trustBadges.map((badge) => (
              <li
                key={badge}
                className="border border-white/20 bg-neutral-900/40 backdrop-blur-xs px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/90"
              >
                {badge}
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </section>
  );
};
