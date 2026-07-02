import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delivery Terms',
  description: 'Learn how shipping and delivery works on the StyleHub C2C marketplace.',
};

const sections = [
  {
    title: 'How delivery works',
    body: 'StyleHub operates on a consumer-to-consumer model: there are no warehouses. Sellers ship items directly to buyers. Delivery fees and shipping times vary depending on the seller’s location and the carrier selected.',
  },
  {
    title: 'Seller responsibility',
    body: 'Sellers package the item securely to prevent damage in transit. The item shipped must match the condition and description in the listing, and must be sent within the agreed timeframe after an order is confirmed.',
  },
  {
    title: 'Buyer responsibility',
    body: 'Buyers provide a correct, accessible delivery address within Vietnam. On arrival, inspect the item promptly to verify its condition matches the listing before confirming the transaction is complete.',
  },
  {
    title: 'Local pickup',
    body: 'If the buyer and seller are in the same city — say, both in Ho Chi Minh City — they may agree via chat to arrange a local pickup and save on shipping. StyleHub recommends meeting in safe, public places.',
  },
  {
    title: 'Future delivery integration',
    body: 'In future phases, StyleHub intends to integrate with local Vietnamese carriers (such as GHTK or Viettel Post) for automated shipping labels, tracking numbers, and standardized delivery fees at checkout.',
  },
];

export default function DeliveryTermsPage() {
  return (
    <>
      <PageHeader eyebrow="Terms" title="Delivery terms" />

      <Container className="max-w-3xl py-14 sm:py-16">
        <aside className="mb-12 border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Demo project notice
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
            StyleHub is currently a demonstration platform. No real shipping logistics, carrier
            integrations, or money transfers are operational. These terms describe the intended
            model for the marketplace.
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
