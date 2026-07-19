import { Metadata } from 'next';
import { CartClient } from '../../components/cart/CartClient';

export const metadata: Metadata = {
  title: 'Giỏ hàng',
  description: 'Xem lại các sản phẩm bạn đã chọn trong giỏ hàng StyleHub.',
};

export default function CartPage() {
  return <CartClient />;
}
