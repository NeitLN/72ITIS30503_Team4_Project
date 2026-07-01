import { Container } from '../../../components/ui/Container';
import { Button } from '../../../components/ui/Button';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const { slug } = params;

  return (
    <Container className="py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xl">
          Product Image Placeholder
        </div>
        
        <div>
          <h1 className="text-3xl font-bold mb-2">Product Name ({slug})</h1>
          <p className="text-2xl font-semibold mb-6">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(500000)}
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Condition</span>
              <span className="font-medium">Like New</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Size</span>
              <span className="font-medium">M</span>
            </div>
          </div>

          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-1">Seller Information</h3>
            <p className="text-sm text-gray-600">StyleHub Verified Seller</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full">Buy Now</Button>
            <div className="flex gap-3">
              <Button variant="secondary" className="w-full">Chat with Seller</Button>
              <Button variant="outline" className="w-full">Add to Wishlist</Button>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
