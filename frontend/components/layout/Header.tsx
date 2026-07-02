import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';
import { getCategoryTree } from '../../lib/catalog';
import { HeaderCartButton } from './HeaderCartButton';

export const Header = async () => {
  let categories: import('../../types/category').Category[] = [];
  try {
    const res = await getCategoryTree();
    categories = res.data || [];
  } catch {
    // Graceful fallback if categories fail to load
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      {/* Route ticker — the marketplace's signature strip */}
      <div className="border-b border-neutral-200 bg-neutral-900 py-1.5">
        <Container>
          <p className="truncate text-center font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-300">
            Hà Nội → Sài Gòn · Pre-loved · Local brands · Streetwear · Peer to peer
          </p>
        </Container>
      </div>

      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href={ROUTES.HOME}
            className="font-display text-xl font-black uppercase tracking-tight text-neutral-900"
          >
            StyleHub
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-5 sm:gap-6">
            <Link href={ROUTES.SHOP} className="text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-500">
              Shop
            </Link>
            {categories.slice(0, 4).map((cat) => (
              <Link
                key={cat.id}
                href={ROUTES.CATEGORY(cat.slug)}
                className="hidden text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-500 lg:block"
              >
                {cat.name}
              </Link>
            ))}
            <Link href={ROUTES.ABOUT} className="hidden text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-500 sm:block">
              About
            </Link>
            <Link href={ROUTES.CONTACT} className="hidden text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-500 md:block">
              Contact
            </Link>
            <span aria-hidden="true" className="hidden h-4 w-px bg-neutral-300 sm:block" />
            <HeaderCartButton />
            <span aria-hidden="true" className="h-4 w-px bg-neutral-300" />
            <Link
              href={ROUTES.SELL}
              className="bg-neutral-900 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-neutral-700"
            >
              Sell
            </Link>
          </nav>
        </div>
      </Container>
    </header>
  );
};
