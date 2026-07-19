import Link from 'next/link';
import { Category } from '../../types/category';
import { ROUTES } from '../../constants/routes';

interface ShopToolbarProps {
  count?: number | null;
  categories?: Category[];
}

/** Count, sort label, and category filter chips (links to real category routes). */
export const ShopToolbar = ({ count, categories = [] }: ShopToolbarProps) => {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-baseline gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-900">
          Tin đăng mới nhất
        </p>
        {count != null && (
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-400">
            {count} sản phẩm
          </p>
        )}
      </div>

      {categories.length > 0 && (
        <nav aria-label="Lọc theo danh mục" className="-mx-1 overflow-x-auto">
          <ul className="flex items-center gap-2 px-1">
            <li>
              <span className="inline-block whitespace-nowrap border border-neutral-900 bg-neutral-900 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                Tất cả
              </span>
            </li>
            {categories.slice(0, 5).map((cat) => (
              <li key={cat.id}>
                <Link
                  href={ROUTES.CATEGORY(cat.slug)}
                  className="inline-block whitespace-nowrap border border-neutral-300 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600 transition-colors hover:border-neutral-900 hover:text-neutral-900"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
};
