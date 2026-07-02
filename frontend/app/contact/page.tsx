import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Metadata } from 'next';

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
                  href="mailto:support@stylehub.local"
                  className="mt-1.5 inline-block text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  support@stylehub.local
                </a>
              </div>
              <div className="border-t border-neutral-200 pt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">Office</h3>
                <p className="mt-1.5 text-sm text-neutral-600">Ho Chi Minh City, Vietnam</p>
              </div>
            </div>

            <aside className="mt-10 border border-neutral-200 bg-neutral-50 px-4 py-3">
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
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="topic" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Topic
                </label>
                <select
                  id="topic"
                  className="w-full border border-neutral-300 bg-white px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                >
                  <option>General inquiry</option>
                  <option>Report a seller</option>
                  <option>Order issue</option>
                  <option>Technical support</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  className="w-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  placeholder="How can we help?"
                ></textarea>
              </div>

              <Button type="button" className="mt-2 w-full" size="lg">
                Send message
              </Button>
            </form>
          </div>
        </div>
      </Container>
    </>
  );
}
