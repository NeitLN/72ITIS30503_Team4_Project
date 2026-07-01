import { Container } from '../../components/ui/Container';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy and data collection information for StyleHub.',
};

export default function PrivacyPolicyPage() {
  return (
    <Container className="py-16 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8 tracking-tight">Privacy Policy</h1>
      
      <div className="prose prose-lg text-gray-600 space-y-8">
        <div className="p-4 bg-gray-50 border rounded-lg text-sm text-gray-600 mb-8">
          <strong>Demo Project Notice:</strong> StyleHub is a university project demonstration. We do not process real payments, nor do we intentionally harvest personal data for commercial purposes. Data stored in our Supabase infrastructure is solely for the purpose of demonstrating marketplace functionality.
        </div>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">1. Information We Collect</h2>
          <p>
            When you register as a buyer or seller on StyleHub, we collect basic profile information including your username, email address, full name, and optional location data. For sellers, we also store product listings, images, prices, and marketplace interactions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">2. How We Use Information</h2>
          <p>
            We use this information to facilitate the C2C marketplace experience. This includes rendering your public profile, connecting buyers with sellers, displaying your product listings, and maintaining a secure environment through user ratings and reviews.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">3. Marketplace Visibility</h2>
          <p>
            As a C2C platform, your seller username, location, and rating are public by design. When you list an item, the photos and descriptions you upload are visible to all visitors. Direct messages regarding an order remain private between the buyer and the seller.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">4. Data Security</h2>
          <p>
            We rely on Supabase as our backend infrastructure provider, which handles secure authentication and database storage. Passwords are encrypted by the authentication provider, and we employ basic Row Level Security (RLS) to ensure users can only modify their own listings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">5. Contact</h2>
          <p>
            If you have questions about this policy or wish to have your demo account deleted, please use the Contact page or email support@stylehub.local.
          </p>
        </section>
      </div>
    </Container>
  );
}
