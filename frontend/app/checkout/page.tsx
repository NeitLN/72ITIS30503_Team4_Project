import { Metadata } from 'next';
import { CheckoutClient } from '../../components/checkout/CheckoutClient';

export const metadata: Metadata = {
  title: 'Thanh toán',
  description: 'Xem trước trải nghiệm thanh toán. Đây là bản demo thử nghiệm, không xử lý thanh toán hay tạo đơn hàng thực tế.',
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
