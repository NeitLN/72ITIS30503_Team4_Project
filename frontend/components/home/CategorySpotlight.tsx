import { Container } from '../ui/Container';
import Link from 'next/link';
import { ROUTES } from '../../constants/routes';

const CATEGORY_GROUPS = [
  {
    id: 'tops',
    name: 'Áo',
    slug: 'tops',
    description: 'Áo thun, hoodie và áo khoác',
  },
  {
    id: 'bottoms',
    name: 'Quần',
    slug: 'bottoms',
    description: 'Quần dài, quần short và quần jean',
  },
  {
    id: 'accessories',
    name: 'Phụ kiện',
    slug: 'accessories-group',
    description: 'Mũ, ví và nhiều hơn nữa',
  },
  {
    id: 'bags',
    name: 'Túi',
    slug: 'bags-group',
    description: 'Túi balo và túi đeo chéo',
  },
];

export const CategorySpotlight = () => {
  return (
    <section className="border-t border-neutral-200 bg-neutral-50 py-20 sm:py-24">
      <Container>
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Lướt qua các kệ hàng
            </p>
            <h2 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              Mua theo danh mục
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_GROUPS.map((cat) => (
            <Link
              key={cat.id}
              href={ROUTES.CATEGORY(cat.slug)}
              className="group block border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-neutral-900 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
            >
              <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight text-neutral-900 mb-2">
                {cat.name}
              </h3>
              <p className="text-sm text-neutral-500">
                {cat.description}
              </p>
              <div className="mt-6 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-900 transition-transform group-hover:translate-x-1">
                Mua ngay <span aria-hidden="true">→</span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
};
