import { Metadata } from 'next';
import { CheckoutClient } from '../../components/checkout/CheckoutClient';

export const metadata: Metadata = {
  title: 'Secure Checkout',
  description: 'Provide your delivery details to complete your order on StyleHub.',
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
