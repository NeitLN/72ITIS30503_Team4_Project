import Link from 'next/link';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../constants/routes';

export default function Home() {
  return (
    <Container className="py-20">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-5xl font-bold mb-6">Welcome to StyleHub</h1>
        <p className="text-xl text-gray-600 mb-10">
          Your favorite C2C marketplace for local brands, pre-loved items, and street style fashion. Buy and sell fashion effortlessly.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href={ROUTES.SHOP}>
            <Button size="lg">Shop Now</Button>
          </Link>
          <Link href={ROUTES.SELL}>
            <Button variant="outline" size="lg">Sell an Item</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
