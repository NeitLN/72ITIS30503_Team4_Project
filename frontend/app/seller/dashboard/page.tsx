import { Metadata } from 'next';
import { SellerDashboardClient } from '../../../components/seller/SellerDashboardClient';

// No server-side data fetch here on purpose: SellerDashboardClient is a
// Client Component that only fetches seller data AFTER hydration, using
// the authenticated Bearer token — the same pattern as app/profile/page.tsx
// and components/sell/SellListingClient.tsx. That means no seller-specific
// data (listings, orders, stats) is ever present in the static HTML served
// to a logged-out visitor.
export const metadata: Metadata = {
  title: 'Seller Dashboard',
  description: 'Quản lý sản phẩm và đơn bán của bạn trên StyleHub.',
};

export default function SellerDashboardPage() {
  return <SellerDashboardClient />;
}
