import { Container } from '../../../components/ui/Container';
import { ProductCard } from '../../../components/product/ProductCard';
import { Product } from '../../../types/product';

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Placeholder Category Product 1',
    slug: 'placeholder-category-product-1',
    price: 300000,
    condition: 'New',
    size: 'S',
    sellerName: 'seller_a'
  },
  {
    id: '2',
    name: 'Placeholder Category Product 2',
    slug: 'placeholder-category-product-2',
    price: 150000,
    condition: 'Good',
    size: 'L',
    sellerName: 'seller_b'
  }
];

export default function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = params;

  return (
    <Container className="py-10">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold capitalize">{slug.replace('-', ' ')}</h1>
        <p className="text-gray-500 mt-2">Explore items in the {slug} category.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {MOCK_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </Container>
  );
}
