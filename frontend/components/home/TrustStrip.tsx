import { Container } from '../ui/Container';

const highlights = [
  {
    title: 'Verified sellers',
    description: 'Ratings, sold counts, and verified badges on every profile.',
  },
  {
    title: 'Condition labels',
    description: 'Every listing states its condition — from new with tags to well worn.',
  },
  {
    title: 'VNĐ pricing',
    description: 'Local prices, written the way sellers write them: 350.000đ.',
  },
  {
    title: 'C2C community',
    description: 'Everyday fashion, streetwear, and more — new and pre-loved, from sellers across Vietnam.',
  },
];

export const TrustStrip = () => {
  return (
    <section aria-label="Marketplace trust signals" className="border-b border-neutral-200 bg-white">
      <Container>
        <div className="grid grid-cols-1 divide-y divide-neutral-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {highlights.map((item) => (
            <div key={item.title} className="px-0 py-8 sm:px-6 lg:first:pl-0 lg:last:pr-0">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{item.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
