import { Metadata } from 'next';
import { WishlistClient } from '../../components/wishlist/WishlistClient';

export const metadata: Metadata = {
  title: 'Sản phẩm yêu thích',
  description: 'Xem lại các tin đăng thời trang bạn đã lưu trên StyleHub.',
};

export default function WishlistPage() {
  return <WishlistClient />;
}
