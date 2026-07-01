import Link from 'next/link';
import { Product } from '../../types/product';
import { ROUTES } from '../../constants/routes';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Link href={ROUTES.PRODUCT(product.slug)} className="group block border p-4 rounded hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 mb-4 rounded flex items-center justify-center text-gray-400">
        No Image
      </div>
      <h3 className="font-medium text-lg truncate">{product.name}</h3>
      <p className="font-bold mt-1">
        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
      </p>
      <div className="mt-2 text-sm text-gray-500 flex justify-between">
        <span>Size: {product.size}</span>
        <span>{product.condition}</span>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Seller: {product.sellerName}
      </div>
    </Link>
  );
};
