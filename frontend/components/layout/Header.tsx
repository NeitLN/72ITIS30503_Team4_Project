import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';

export const Header = () => {
  return (
    <header className="border-b">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href={ROUTES.HOME} className="text-xl font-bold">
            StyleHub
          </Link>
          <nav className="flex items-center gap-6">
            <Link href={ROUTES.SHOP} className="text-sm font-medium hover:underline">
              Shop
            </Link>
            <Link href={ROUTES.SELL} className="text-sm font-medium hover:underline">
              Sell
            </Link>
          </nav>
        </div>
      </Container>
    </header>
  );
};
