import { Container } from '../../components/ui/Container';
import { ProductCard } from '../../components/product/ProductCard';
import { Product } from '../../types/product';

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Vintage Denim Jacket',
    slug: 'vintage-denim-jacket',
    price: 450000,
    condition: 'Like New',
    size: 'M',
    sellerName: 'stylehub_seller1'
  },
  {
    id: '2',
    name: 'Streetwear Graphic Tee',
    slug: 'streetwear-graphic-tee',
    price: 250000,
    condition: 'Good',
    size: 'L',
    sellerName: 'hypebeast_vn'
  },
  {
    id: '3',
    name: 'Classic White Sneakers',
    slug: 'classic-white-sneakers',
    price: 800000,
    condition: 'Fair',
    size: '42',
    sellerName: 'shoes_addict'
  }
];

export default function ShopPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {MOCK_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </Container>
  );
}
