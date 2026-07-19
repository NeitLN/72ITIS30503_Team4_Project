import type { Metadata } from 'next';
import { CheckoutSuccessClient } from '../../../components/checkout/CheckoutSuccessClient';

export const metadata: Metadata = {
  title: 'Đơn hàng đã được tạo',
  description: 'Xem xác nhận đơn hàng StyleHub.',
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string | string[] }>;
}) {
  const params = await searchParams;
  const orderId = typeof params.orderId === 'string' ? params.orderId : '';
  return <CheckoutSuccessClient orderId={orderId} />;
}
