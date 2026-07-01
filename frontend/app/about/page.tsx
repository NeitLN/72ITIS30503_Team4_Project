import { Container } from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../constants/routes';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about StyleHub, the C2C fashion marketplace for streetwear, local brands, and pre-loved items in Vietnam.',
};

export default function AboutPage() {
  return (
    <Container className="py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6 tracking-tight">About StyleHub</h1>
      
      <div className="prose prose-lg text-gray-600 mb-12">
        <p className="text-xl leading-relaxed text-black mb-8">
          StyleHub is a community-driven fashion marketplace connecting buyers and sellers across Vietnam. We specialize in streetwear, local brands, and curated pre-loved fashion.
        </p>

        <h2 className="text-2xl font-semibold text-black mt-12 mb-4">Why StyleHub?</h2>
        <p>
          We believe fashion should be circular, accessible, and community-focused. Whether you&apos;re hunting for a sold-out release from a local Vietnamese brand, or cleaning out your closet to make room for new styles, StyleHub gives you the platform to do it safely and easily.
        </p>

        <h2 className="text-2xl font-semibold text-black mt-12 mb-4">Marketplace Principles</h2>
        <ul className="space-y-4 my-6 list-none pl-0">
          <li className="flex gap-3">
            <span className="font-bold text-black">—</span>
            <span><strong>Condition Transparency:</strong> Every listing requires a clear condition rating, so you know exactly what you&apos;re buying.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-black">—</span>
            <span><strong>Seller Identity:</strong> Ratings, reviews, and verified badges help build trust between buyers and sellers.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-black">—</span>
            <span><strong>Local Focus:</strong> Built for the Vietnamese market, supporting VNĐ, local locations, and domestic shipping expectations.</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t">
        <Link href={ROUTES.SHOP}>
          <Button size="lg" className="w-full sm:w-auto">Shop the Marketplace</Button>
        </Link>
        <Link href={ROUTES.SELL}>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">Start Selling</Button>
        </Link>
      </div>
    </Container>
  );
}
