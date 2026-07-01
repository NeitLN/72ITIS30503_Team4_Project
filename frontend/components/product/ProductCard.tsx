import Link from 'next/link';
import { Product } from '../../types/product';
import { ROUTES } from '../../constants/routes';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const displayPrice = product.sale_price ?? product.price;
  const productName = product.name || product.title || 'Unknown Product';
  const imageUrl = product.thumbnail_url || product.image || (product.images?.[0] as Record<string, string>)?.image_url;
  const condition = product.condition ? product.condition.replace('_', ' ') : '';
  const seller = product.seller as Record<string, unknown> | undefined;
  const sellerDisplay = seller?.username || product.sellerName || product.sellerUsername || 'Unknown';
  const brand = product.brand as Record<string, unknown> | undefined;
  const category = product.category as Record<string, unknown> | undefined;
  
  return (
    <Link href={ROUTES.PRODUCT(product.slug)} className="group block border p-4 rounded hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 mb-4 rounded flex items-center justify-center text-gray-400 overflow-hidden relative">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={productName} className="object-cover w-full h-full" />
        ) : (
          <span>No Image</span>
        )}
      </div>
      <h3 className="font-medium text-lg truncate">{productName}</h3>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-bold">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice)}
        </span>
        {product.sale_price && (
          <span className="text-sm text-gray-400 line-through">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
          </span>
        )}
      </div>
      <div className="mt-2 text-sm text-gray-500 flex justify-between">
        <span className="truncate">{String(brand?.name || category?.name || '')}</span>
        <span className="capitalize whitespace-nowrap ml-2">{condition}</span>
      </div>
      <div className="mt-2 text-xs text-gray-400 flex justify-between items-center">
        <span className="truncate">Seller: {String(sellerDisplay)}</span>
        {Boolean(seller?.seller_rating) && (
          <span>⭐ {String(seller?.seller_rating)}</span>
        )}
      </div>
    </Link>
  );
};
