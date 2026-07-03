import { Metadata } from 'next';
import { CheckoutClient } from '../../components/checkout/CheckoutClient';

export const metadata: Metadata = {
  title: 'Checkout Placeholder',
  description: 'Preview the checkout experience. This lab demo does not process payments or create real orders.',
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
