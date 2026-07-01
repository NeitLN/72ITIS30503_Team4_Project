import { Container } from '../../components/ui/Container';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delivery Terms',
  description: 'Learn how shipping and delivery works on the StyleHub C2C marketplace.',
};

export default function DeliveryTermsPage() {
  return (
    <Container className="py-16 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8 tracking-tight">Delivery Terms</h1>
      
      <div className="prose prose-lg text-gray-600 space-y-8">
        <div className="p-4 bg-gray-50 border rounded-lg text-sm text-gray-600 mb-8">
          <strong>Demo Project Notice:</strong> StyleHub is currently a demonstration platform. No real shipping logistics, carrier integrations, or real money transfers are currently operational. The following terms represent the intended model for the marketplace.
        </div>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">1. How Delivery Works</h2>
          <p>
            StyleHub operates on a Consumer-to-Consumer (C2C) model. This means that StyleHub does not hold inventory in warehouses. Instead, sellers ship items directly to buyers. Delivery fees and shipping times vary depending on the seller&apos;s location and the carrier selected.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">2. Seller Responsibility</h2>
          <p>
            Sellers are responsible for packaging the item securely to prevent damage during transit. The item shipped must exactly match the condition and description provided in the marketplace listing. Sellers must ship the item within the agreed timeframe after an order is confirmed.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">3. Buyer Responsibility</h2>
          <p>
            Buyers are expected to provide a correct and accessible delivery address within Vietnam. Upon receiving the package, buyers should promptly inspect the item to verify its condition matches the listing before confirming the transaction is complete.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">4. Local Pickup</h2>
          <p>
            In some cases, if the buyer and seller are located in the same city (e.g., both in Ho Chi Minh City), they may mutually agree via chat to arrange a local pickup to save on shipping costs. StyleHub recommends meeting in safe, public locations for these transactions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-black mb-4">5. Future Delivery Integration</h2>
          <p>
            In future phases, StyleHub intends to integrate directly with local Vietnamese delivery carriers (such as GHTK or Viettel Post) to provide automated shipping labels, precise tracking numbers, and standardized delivery fees directly at checkout.
          </p>
        </section>
      </div>
    </Container>
  );
}
