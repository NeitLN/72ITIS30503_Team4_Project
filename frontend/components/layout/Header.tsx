import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';
import { getCategoryTree } from '../../lib/catalog';

export const Header = async () => {
  let categories: import('../../types/category').Category[] = [];
  try {
    const res = await getCategoryTree();
    categories = res.data || [];
  } catch (error) {
    // Graceful fallback if categories fail to load
  }

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
            {categories.slice(0, 4).map((cat) => (
              <Link 
                key={cat.id} 
                href={ROUTES.CATEGORY(cat.slug)} 
                className="text-sm font-medium hover:underline hidden sm:block"
              >
                {cat.name}
              </Link>
            ))}
            <Link href={ROUTES.SELL} className="text-sm font-medium hover:underline text-blue-600">
              Sell
            </Link>
          </nav>
        </div>
      </Container>
    </header>
  );
};
