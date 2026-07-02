import { Metadata } from 'next';
import { CartClient } from '../../components/cart/CartClient';

export const metadata: Metadata = {
  title: 'Shopping Bag',
  description: 'Review your selected items in your StyleHub shopping bag.',
};

export default function CartPage() {
  return <CartClient />;
}
