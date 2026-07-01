import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';
import { getCategoryTree } from '../../lib/catalog';

export const Header = async () => {
  let categories: import('../../types/category').Category[] = [];
  try {
    const res = await getCategoryTree();
    categories = res.data || [];
  } catch {
    // Graceful fallback if categories fail to load
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href={ROUTES.HOME} className="text-xl font-bold tracking-tight">
            StyleHub
          </Link>
          <nav className="flex items-center gap-6">
            <Link href={ROUTES.SHOP} className="text-sm font-medium hover:text-gray-600 transition-colors">
              Shop
            </Link>
            {categories.slice(0, 4).map((cat) => (
              <Link 
                key={cat.id} 
                href={ROUTES.CATEGORY(cat.slug)} 
                className="text-sm font-medium hover:text-gray-600 transition-colors hidden md:block"
              >
                {cat.name}
              </Link>
            ))}
            <Link href={ROUTES.ABOUT} className="text-sm font-medium hover:text-gray-600 transition-colors hidden sm:block">
              About
            </Link>
            <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
            <Link href={ROUTES.SELL} className="text-sm font-semibold px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors">
              Sell
            </Link>
          </nav>
        </div>
      </Container>
    </header>
  );
};
