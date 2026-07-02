import { Metadata } from 'next';
import { WishlistClient } from '../../components/wishlist/WishlistClient';

export const metadata: Metadata = {
  title: 'My Wishlist',
  description: 'View your saved pre-loved streetwear and local fashion listings on StyleHub.',
};

export default function WishlistPage() {
  return <WishlistClient />;
}
