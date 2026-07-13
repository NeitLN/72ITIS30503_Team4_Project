import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { ContactForm } from '../../components/contact/ContactForm';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the StyleHub team.',
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Contact us"
        lede="Questions about an order, a seller, or how StyleHub works? Send us a message and the team will get back to you."
      />

      <Container className="max-w-4xl py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <div className="space-y-6">
              <div className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">Email</h3>
                <a
                  href="mailto:support@stylehub.vn"
                  className="mt-1.5 inline-block text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  support@stylehub.vn
                </a>
              </div>
              <div className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">Hotline</h3>
                <a
                  href="tel:19006868"
                  className="mt-1.5 inline-block text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  1900 6868
                </a>
              </div>
              <div className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">
                  Support hours
                </h3>
                <p className="mt-1.5 text-sm text-neutral-600">Monday–Sunday, 08:00–22:00</p>
              </div>
              <div className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">Office</h3>
                <p className="mt-1.5 text-sm text-neutral-600">Ho Chi Minh City, Vietnam</p>
              </div>
            </div>

            <aside className="mt-10 border border-neutral-200 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Live chat
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
                Need a faster response? Use the floating live-chat widget to talk with the StyleHub
                support team.
              </p>
            </aside>

            <aside className="mt-4 border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Demo project notice
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
                StyleHub is a university demo project. This contact form is a UI placeholder and
                does not send real emails.
              </p>
            </aside>
          </div>

          <div className="border border-neutral-200 bg-white p-6">
            <ContactForm />
          </div>
        </div>

        <section className="mt-14 border-t border-neutral-200 pt-8" aria-labelledby="quick-support-heading">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Help topics</p>
            <h2 id="quick-support-heading" className="mt-2 text-xl font-semibold text-neutral-900">
              Quick support
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-medium text-neutral-900">Buying safely</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Review seller details and listing information before making a purchase.
              </p>
            </div>

            <Link
              href="/sell"
              className="group border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <h3 className="text-sm font-medium text-neutral-900">Selling an item</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Create a listing and share your item with the StyleHub community.
              </p>
              <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 group-hover:text-neutral-900">
                Start selling →
              </span>
            </Link>

            <Link
              href="/delivery-terms"
              className="group border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <h3 className="text-sm font-medium text-neutral-900">Order and delivery</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Learn about delivery expectations and order handling.
              </p>
              <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 group-hover:text-neutral-900">
                Delivery terms →
              </span>
            </Link>

            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-medium text-neutral-900">Report a listing</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Use the contact form and select “Report a seller” to tell the support team.
              </p>
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
