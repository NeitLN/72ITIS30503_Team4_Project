import Image from "next/image";
import Link from "next/link";
import Rating from "@/components/Rating";
import WishlistButton from "@/components/WishlistButton";
import { formatVnd } from "@/lib/format";
import type { Product } from "@/lib/products";

export default function ProductCard({ product }: { product: Product }) {
  const price = product.sale_price ?? product.price;

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link href={`/product/${product.slug}`} aria-label={`View ${product.brand} ${product.name}`}>
          <Image
            alt={`${product.brand} ${product.name}`}
            className="product-image"
            fill
            sizes="(max-width: 560px) 100vw, (max-width: 850px) 50vw, 33vw"
            src={product.thumbnail}
          />
        </Link>
        <WishlistButton className="product-card-wishlist" productId={product.id} />
      </div>
      <div className="product-card-content">
        <div className="product-card-labels">
          <p className="product-category">{product.condition}</p>
          {product.is_negotiable && <span className="negotiable-badge">Negotiable</span>}
        </div>
        <p className="product-brand">{product.brand}</p>
        <h2>
          <Link href={`/product/${product.slug}`}>{product.name}</Link>
        </h2>
        <Rating average={product.average_rating} compact count={product.review_count} />
        <strong className="product-price">{formatVnd(price)}</strong>
        <div className="marketplace-details">
          <span><b>Seller</b>{product.seller_name}</span>
          <span><b>Size</b>{product.size}</span>
          <span className="product-location"><b>Location</b>{product.location}</span>
        </div>
      </div>
    </article>
  );
}
