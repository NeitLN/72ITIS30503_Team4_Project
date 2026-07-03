import { PageHeader } from '../../components/ui/PageHeader';
import { SellListingClient } from '../../components/sell/SellListingClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell Your Fashion Archive',
  description: 'Create a demo listing preview for streetwear, sneakers, accessories, and pre-loved fashion. No real product publishing occurs in this lab demo.',
};

export default function SellPage() {
  return (
    <main className="bg-neutral-50 min-h-screen">
      <PageHeader
        eyebrow="Seller Hub"
        title="List your archive. Find its next owner."
        lede="Create a StyleHub listing preview in minutes. This demo does not publish real products or upload files."
      />
      <SellListingClient />
    </main>
  );
}

