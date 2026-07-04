import { Metadata } from 'next';
import { OrderHistoryClient } from '../../components/orders/OrderHistoryClient';

export const metadata: Metadata = {
  title: 'My Orders',
  description: 'Track your StyleHub purchases and checkout history.',
};

export default function OrdersPage() {
  return <OrderHistoryClient />;
}
