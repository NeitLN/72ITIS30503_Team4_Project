import { PageHeader } from '../../components/ui/PageHeader';
import { SellListingClient } from '../../components/sell/SellListingClient';
import { Metadata } from 'next';
import { EN } from '../../lib/i18n';

export const metadata: Metadata = {
  title: 'Sell',
  description: 'List new or pre-loved fashion — any brand, any style — for sale on StyleHub in six quick steps.',
};

export default function SellPage() {
  return (
    <div className="bg-neutral-50 min-h-screen">
      <PageHeader
        eyebrow={EN.sell.hubEyebrow}
        title={EN.sell.hubHeading}
        lede="Publish a real StyleHub listing in six quick steps — it goes live across the marketplace immediately."
      />
      <SellListingClient />
    </div>
  );
}

