import { Metadata } from 'next';
import { OrderHistoryClient } from '../../components/orders/OrderHistoryClient';

export const metadata: Metadata = {
  title: 'Đơn hàng của tôi',
  description: 'Theo dõi các đơn mua hàng và lịch sử thanh toán trên StyleHub.',
};

export default function OrdersPage() {
  return <OrderHistoryClient />;
}
