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
    title: 'Condition transparency',
    description:
      'Every listing carries a clear condition label, so you know exactly what you are buying before it arrives.',
  },
  {
    title: 'Seller identity',
    description:
      'Ratings, sold counts, and verified badges keep trust between buyers and sellers visible on every listing.',
  },
  {
    title: 'Local focus',
    description:
      'Built for the Vietnamese market — VNĐ pricing, local seller locations, and domestic delivery expectations.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="The marketplace"
        title="About StyleHub"
        lede="A C2C fashion marketplace where people buy, sell, and rediscover pieces across different brands, styles, and stories — connecting buyers and sellers across Vietnam."
      />

      <Container className="max-w-4xl py-14 sm:py-16">
        <section className="mb-14">
          <h2 className="mb-4 font-display text-2xl font-black uppercase tracking-tight">Why StyleHub</h2>
          <p className="leading-relaxed text-neutral-600">
            We believe fashion should be circular, accessible, and community-focused. Whether
            you&apos;re after a new piece from your favorite brand, a rare find, or clearing your
            closet to make room for new styles, StyleHub gives you a place to do it safely and
            simply — seller to buyer, no middle rack.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-tight">
            HOW THE MARKETPLACE WORKS
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
            Shop the marketplace
          </Link>
          <Link
            href={ROUTES.SELL}
            className="inline-flex items-center justify-center border border-neutral-900 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white"
          >
            Start selling
          </Link>
        </div>
      </Container>
    </>
  );
}
