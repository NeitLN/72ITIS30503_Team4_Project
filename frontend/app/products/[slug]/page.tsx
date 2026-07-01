import { Container } from '../../../components/ui/Container';
import { Button } from '../../../components/ui/Button';
import { getProductBySlug } from '../../../lib/catalog';
import { notFound } from 'next/navigation';
import { siteConfig } from '../../../constants/site';
import { Metadata } from 'next';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const { data: product } = await getProductBySlug(params.slug);
    if (!product) return {};
    
    const productName = product.name || product.title || 'Product';
    return {
      title: `${productName} | ${siteConfig.name}`,
      description: `Buy ${productName} on StyleHub. Condition: ${product.condition?.replace('_', ' ') || 'Unknown'}`,
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = params;
  
  let product;
  try {
    const res = await getProductBySlug(slug);
    product = res.data;
  } catch {
    // We could render an error state, but let's just use 404 for simplicity if fetch fails
    notFound();
  }

  if (!product) {
    notFound();
  }

  const productName = product.name || product.title || 'Unknown Product';
  const displayPrice = product.sale_price ?? product.price;
  const imageUrl = product.thumbnail_url || product.image || (product.images?.[0] as Record<string, string>)?.image_url;
  const condition = product.condition ? product.condition.replace('_', ' ') : '';
  const seller = (product.seller as Record<string, unknown>) || {};
  const sellerDisplay = seller.username || seller.full_name || 'Unknown Seller';
  const location = product.location || seller.location || 'Vietnam';
  const brand = product.brand as Record<string, unknown> | undefined;
  const category = product.category as Record<string, unknown> | undefined;

  return (
    <Container className="py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xl overflow-hidden relative">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={productName} className="object-cover w-full h-full" />
          ) : (
            <span>Product Image Placeholder</span>
          )}
        </div>
        
        <div>
          {brand && (
            <div className="text-sm text-gray-500 mb-2 uppercase tracking-wider font-semibold">
              {String(brand.name)}
            </div>
          )}
          
          <h1 className="text-3xl font-bold mb-2">{productName}</h1>
          
          <div className="flex items-end gap-4 mb-6">
            <p className="text-2xl font-semibold">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice)}
            </p>
            {product.sale_price && (
              <p className="text-lg text-gray-400 line-through mb-0.5">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
              </p>
            )}
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Condition</span>
              <span className="font-medium capitalize">{condition}</span>
            </div>
            
            {category && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Category</span>
                <span className="font-medium">{String(category.name)}</span>
              </div>
            )}
            
            {(product.sku || product.stock !== undefined || product.stock_quantity !== undefined) && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Status</span>
                <span className="font-medium">
                  {product.stock_status === 'in_stock' || (product.stock || product.stock_quantity || 0) > 0 
                    ? 'In Stock' 
                    : 'Out of Stock'}
                </span>
              </div>
            )}
          </div>

          {product.product_type === 'variable' && product.variants && product.variants.length > 0 && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-medium mb-3">Available Variations</h3>
              <div className="space-y-2">
                {(product.variants as Array<Record<string, unknown> & { id?: string; sku?: string; sale_price?: number; price: number; variant_attribute_values?: Array<{ attribute_value?: { value: string } }> }>).map((v) => {
                  const varPrice = v.sale_price ?? v.price;
                  const attributes = v.variant_attribute_values?.map((vav) => vav.attribute_value?.value).join(' / ') || v.sku;
                  return (
                    <div key={v.id || v.sku} className="flex justify-between text-sm">
                      <span>{attributes}</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(varPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-1 flex items-center justify-between">
              Seller Information
              {Boolean(seller.seller_rating) && <span className="text-sm">⭐ {String(seller.seller_rating)}</span>}
            </h3>
            <p className="text-sm font-medium text-black">@{String(sellerDisplay)}</p>
            <p className="text-xs text-gray-500 mt-1">Ships from {String(location)}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full">Buy Now</Button>
            <div className="flex gap-3">
              <Button variant="secondary" className="w-full">Chat with Seller</Button>
              <Button variant="outline" className="w-full">Add to Wishlist</Button>
            </div>
          </div>
          
          {product.description && (
            <div className="mt-10">
              <h3 className="font-semibold text-lg mb-2">Description</h3>
              <div className="prose prose-sm text-gray-600 whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
