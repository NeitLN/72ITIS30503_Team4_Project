import Link from 'next/link';
import { Container } from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell on StyleHub',
  description:
    'List pre-loved pieces, local brand items, and streetwear finds in minutes on StyleHub.',
};

const steps = [
  { step: '01', title: 'Upload photos', description: 'Daylight, plain background — front, back, tags, and any flaws.' },
  { step: '02', title: 'Add product details', description: 'Brand, size, and what makes the piece worth a second owner.' },
  { step: '03', title: 'Set price', description: 'In VNĐ. Check similar listings to price it to move.' },
  { step: '04', title: 'Choose condition', description: 'From new with tags to well worn — honesty sells faster.' },
  { step: '05', title: 'Publish listing', description: 'Your piece goes live on the marketplace instantly.' },
  { step: '06', title: 'Chat with buyers', description: 'Answer questions, agree on delivery or local pickup.' },
];

const trustPoints = [
  { title: 'Condition labels', description: 'Every listing carries a clear condition label, so buyers know exactly what arrives.' },
  { title: 'Clear pricing', description: 'One VNĐ price on the tag. No hidden fees between you and the buyer.' },
  { title: 'Local pickup or delivery', description: 'Ship nationwide or meet up in your city — you and the buyer decide.' },
  { title: 'Buyer–seller chat (planned)', description: 'Direct messaging between buyers and sellers is on the roadmap.' },
];

export default function SellPage() {
  return (
    <>
      {/* Sell hero */}
      <section className="border-b border-neutral-200 bg-neutral-950 text-white">
        <Container className="py-16 sm:py-24">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            Seller onboarding
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            Sell your wardrobe on StyleHub
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-300">
            List pre-loved pieces, local brand items, and streetwear finds in minutes.
          </p>
          <Link
            href="#listing-form"
            className="mt-10 inline-flex items-center justify-center bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            Start a listing
          </Link>
        </Container>
      </section>

      {/* Selling steps */}
      <section className="border-b border-neutral-200 py-16 sm:py-20">
        <Container>
          <h2 className="mb-10 font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
            How selling works
          </h2>
          <ol className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((item) => (
              <li key={item.step} className="border-t border-neutral-200 pt-4">
                <p className="font-mono text-[11px] tracking-[0.2em] text-neutral-400">{item.step}</p>
                <h3 className="mt-2 font-semibold uppercase tracking-wide text-neutral-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{item.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Listing preview + trust */}
      <section className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
            {/* Static preview mock — illustrates what a published listing looks like */}
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                What buyers see
              </p>
              <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
                Your listing, on the rack
              </h2>
              <div className="max-w-sm">
                <div className="border border-neutral-900 bg-white">
                  <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                      Preview
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                      Example listing
                    </span>
                  </div>
                  <div className="flex aspect-square items-center justify-center border-b border-neutral-200 bg-neutral-100">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                      Your photo here
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      Local brand
                    </p>
                    <h3 className="font-medium text-neutral-900">Black graphic hoodie</h3>
                    <p className="mt-1 font-mono text-xs text-neutral-600">Size M · Like new</p>
                    <p className="mt-3 font-mono text-base font-bold text-neutral-900">350.000đ</p>
                    <div className="mt-3 border-t border-neutral-100 pt-3">
                      <p className="text-xs text-neutral-600">
                        <span className="font-medium">@your-username</span>
                        <span className="text-neutral-900"> ✓</span> · ★ 5.0
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">Your city, Vietnam</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seller trust */}
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                Sell with confidence
              </p>
              <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
                Built on trust
              </h2>
              <ul className="space-y-6">
                {trustPoints.map((point) => (
                  <li key={point.title} className="border-t border-neutral-200 pt-4">
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">
                      {point.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{point.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Mock listing form — UI only */}
      <section id="listing-form" className="py-16 sm:py-20">
        <Container className="max-w-2xl">
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
              <h2 className="font-display text-lg font-extrabold uppercase tracking-tight">List an item</h2>
              <span className="border border-neutral-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                Coming soon
              </span>
            </div>

            <form className="space-y-5 p-6" aria-label="Listing form preview (disabled)">
              <div>
                <p className="mb-1.5 block text-sm font-medium text-neutral-700">Photos</p>
                <div className="border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                    Photo upload opens in a future phase
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="sell-title" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Title
                </label>
                <input
                  type="text"
                  id="sell-title"
                  className="w-full border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm"
                  placeholder="e.g. Vintage denim jacket"
                  disabled
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sell-category" className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Category
                  </label>
                  <select id="sell-category" className="w-full border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm" disabled>
                    <option>Select category</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sell-brand" className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Brand
                  </label>
                  <select id="sell-brand" className="w-full border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm" disabled>
                    <option>Select brand</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sell-condition" className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Condition
                  </label>
                  <select id="sell-condition" className="w-full border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm" disabled>
                    <option>Like new</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sell-price" className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Price (VNĐ)
                  </label>
                  <input
                    type="number"
                    id="sell-price"
                    className="w-full border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm"
                    placeholder="350000"
                    disabled
                  />
                </div>
              </div>

              <Button type="button" className="w-full" size="lg" disabled>
                Publish listing
              </Button>
              <p className="text-center text-xs text-neutral-400">
                Listing submission will be enabled in a future phase of this project.
              </p>
            </form>
          </div>
        </Container>
      </section>
    </>
  );
}
