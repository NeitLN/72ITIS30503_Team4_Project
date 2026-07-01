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
    // Failure handles gracefully
  }

  // Fallback static categories if API empty or fails
  const displayCategories = categories.length > 0 
    ? categories.slice(0, 6) 
    : [
        { id: '1', name: 'Streetwear', slug: 'streetwear', description: 'Hoodies, Oversized Tees & More' },
        { id: '2', name: 'Sneakers', slug: 'sneakers', description: 'Hype and classic kicks' },
        { id: '3', name: 'Vintage', slug: 'vintage', description: 'Pre-loved and retro' },
        { id: '4', name: 'Accessories', slug: 'accessories', description: 'Hats, bags, and jewelry' },
      ];

  return (
    <section className="py-20 bg-gray-50 border-t">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Shop by Category</h2>
          <p className="text-gray-500 mt-2">Find exactly what you&apos;re looking for.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCategories.map((cat) => (
            <Link 
              key={cat.id} 
              href={ROUTES.CATEGORY(cat.slug)}
              className="group block bg-white border p-6 rounded-lg hover:shadow-lg transition-all"
            >
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-black mb-2 flex items-center justify-between">
                {cat.name}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2">
                {cat.description || `Explore the latest in ${cat.name}.`}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
};
