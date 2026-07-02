import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy and data collection information for StyleHub.',
};

const sections = [
  {
    title: 'Information we collect',
    body: 'When you register as a buyer or seller on StyleHub, we collect basic profile information including your username, email address, full name, and optional location data. For sellers, we also store product listings, images, prices, and marketplace interactions.',
  },
  {
    title: 'How we use information',
    body: 'We use this information to run the C2C marketplace experience: rendering your public profile, connecting buyers with sellers, displaying your listings, and maintaining a trustworthy environment through ratings and reviews.',
  },
  {
    title: 'Marketplace visibility',
    body: 'As a C2C platform, your seller username, location, and rating are public by design. When you list an item, the photos and descriptions you upload are visible to all visitors. Direct messages about an order remain private between buyer and seller.',
  },
  {
    title: 'Data security',
    body: 'We rely on Supabase as our backend infrastructure provider, which handles secure authentication and database storage. Passwords are encrypted by the authentication provider, and Row Level Security ensures users can only modify their own listings.',
  },
  {
    title: 'Contact',
    body: 'If you have questions about this policy or wish to have your demo account deleted, please use the Contact page or email support@stylehub.local.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHeader eyebrow="Terms" title="Privacy policy" />

      <Container className="max-w-3xl py-14 sm:py-16">
        <aside className="mb-12 border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Demo project notice
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
            StyleHub is a university project demonstration. We do not process real payments or
            harvest personal data for commercial purposes. Data stored in our infrastructure exists
            solely to demonstrate marketplace functionality.
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
