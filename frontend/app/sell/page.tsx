import { PageHeader } from '../../components/ui/PageHeader';
import { SellListingClient } from '../../components/sell/SellListingClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell Your Fashion Archive',
  description: 'List streetwear, sneakers, accessories, and pre-loved fashion for sale on StyleHub in six quick steps.',
};

export default function SellPage() {
  return (
    <main className="bg-neutral-50 min-h-screen">
      <PageHeader
        eyebrow="Seller Hub"
        title="List your archive. Find its next owner."
        lede="Publish a real StyleHub listing in six quick steps — it goes live across the marketplace immediately."
      />
      <SellListingClient />
    </main>
  );
}

