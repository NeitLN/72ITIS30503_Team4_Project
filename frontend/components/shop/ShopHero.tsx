import { Container } from '../ui/Container';

const trustBadges = ['Verified sellers', 'Condition checked', 'VNĐ pricing', 'Local fashion'];

export const ShopHero = () => {
  return (
    <section className="border-b border-neutral-200 bg-neutral-950 text-white">
      <Container className="py-14 sm:py-20">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400">
          Every listing has a seller
        </p>
        <h1 className="font-display text-5xl font-black uppercase tracking-tight sm:text-6xl">
          Marketplace
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-300 sm:text-lg">
          Discover local brands, pre-loved pieces, and streetwear listings from sellers across
          Vietnam.
        </p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {trustBadges.map((badge) => (
            <li
              key={badge}
              className="border border-neutral-700 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300"
            >
              {badge}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
