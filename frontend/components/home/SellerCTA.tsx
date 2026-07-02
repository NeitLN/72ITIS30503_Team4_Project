import { Container } from '../ui/Container';
import Link from 'next/link';
import { ROUTES } from '../../constants/routes';

const steps = [
  { step: '01', title: 'Upload photos', description: 'Shoot your piece in daylight — front, back, tags, flaws.' },
  { step: '02', title: 'Add details', description: 'Brand, size, and an honest condition label.' },
  { step: '03', title: 'Set price', description: 'In VNĐ, the way the local market reads it.' },
  { step: '04', title: 'Publish listing', description: 'Go live and chat with buyers directly.' },
];

export const SellerCTA = () => {
  return (
    <section className="border-t border-neutral-200 py-20 sm:py-24">
      <Container>
        <div className="bg-neutral-950 px-6 py-12 text-white sm:px-12 sm:py-16">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            Become a seller
          </p>
          <h2 className="max-w-2xl font-display text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
            Your closet is inventory.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-300">
            Anyone on StyleHub can sell. List a piece in minutes and reach buyers hunting for their
            next fit.
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
            Start a listing
          </Link>
        </div>
      </Container>
    </section>
  );
};
