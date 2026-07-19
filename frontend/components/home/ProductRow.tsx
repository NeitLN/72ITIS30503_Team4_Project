import { Container } from '../ui/Container';
import { ProductCard } from '../product/ProductCard';
import { Product } from '../../types/product';
import Link from 'next/link';

export type ProductRowProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  products: Product[];
  viewAllHref?: string;
  emptyMessage?: string;
};

export const ProductRow = ({
  eyebrow,
  title,
  description,
  products,
  viewAllHref,
  emptyMessage = 'Không tìm thấy sản phẩm phù hợp.',
}: ProductRowProps) => {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                {eyebrow}
              </p>
            )}
            <h2 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-sm text-neutral-500">
                {description}
              </p>
            )}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="hidden whitespace-nowrap border-b border-neutral-900 pb-0.5 text-sm font-semibold text-neutral-900 transition-colors hover:text-neutral-500 sm:block"
            >
              View all listings
            </Link>
          )}
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="border border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
              Chưa có tin đăng nào
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              {emptyMessage}
            </p>
          </div>
        )}

        {viewAllHref && (
          <div className="mt-8 text-center sm:hidden">
            <Link href={viewAllHref} className="border-b border-neutral-900 pb-0.5 text-sm font-semibold">
              View all listings
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
};
