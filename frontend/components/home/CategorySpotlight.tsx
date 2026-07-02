import { Container } from '../ui/Container';
import { getCategories } from '../../lib/catalog';
import { Category } from '../../types/category';
import Link from 'next/link';
import { ROUTES } from '../../constants/routes';

export const CategorySpotlight = async () => {
  let categories: Category[] = [];

  try {
    const res = await getCategories();
    categories = res.data || [];
  } catch {
    // Fails gracefully — section hides itself below
  }

  // No hardcoded fallback categories: if the API has none, skip the section.
  if (categories.length === 0) return null;

  const displayCategories = categories.slice(0, 6);

  return (
    <section className="border-t border-neutral-200 bg-neutral-50 py-20 sm:py-24">
      <Container>
        <div className="mb-10">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            Browse the racks
          </p>
          <h2 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Shop by category
          </h2>
        </div>

        {/* Editorial index list — categories as a table of contents */}
        <ul className="border-t border-neutral-200">
          {displayCategories.map((cat) => (
            <li key={cat.id} className="border-b border-neutral-200">
              <Link
                href={ROUTES.CATEGORY(cat.slug)}
                className="group flex items-baseline justify-between gap-4 py-5 transition-colors hover:bg-white sm:px-4"
              >
                <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="font-display text-xl font-extrabold uppercase tracking-tight text-neutral-900 sm:text-2xl">
                    {cat.name}
                  </span>
                  <span className="truncate text-sm text-neutral-500">
                    {cat.description || `Listings in ${cat.name}`}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 font-mono text-sm text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-neutral-900"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
