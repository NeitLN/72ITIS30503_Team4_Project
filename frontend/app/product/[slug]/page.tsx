import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import Rating from "@/components/Rating";
import WishlistButton from "@/components/WishlistButton";
import { formatVnd } from "@/lib/format";
import { getProductBySlug } from "@/lib/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return product
    ? {
        title: `${product.brand} ${product.name} | StyleHub`,
        description: product.description,
      }
    : { title: "Product not found | StyleHub" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="product-page">
      <div className="product-breadcrumbs">
        <Link href="/">Home</Link><span>/</span>
        <Link href={`/shop?category=${product.category_slug}`}>{product.category_slug.replace("-", " ")}</Link>
        <span>/</span><span>{product.name}</span>
      </div>

      <section className="product-detail-grid">
        <ProductGallery images={product.images} productName={product.name} thumbnail={product.thumbnail} />
        <div className="product-summary">
          <div className="product-summary-topline">
            <p className="product-brand">{product.brand}</p>
            <WishlistButton productId={product.id} />
          </div>
          <h1>{product.name}</h1>
          <Rating average={product.average_rating} count={product.review_count} />
          <strong className="detail-price">{formatVnd(product.sale_price ?? product.price)}</strong>
          <p className="product-description">{product.description}</p>

          <div className="detail-facts">
            <div><span>Condition</span><strong>{product.condition}</strong></div>
            <div><span>Seller</span><strong>{product.seller_name}</strong></div>
            <div><span>Location</span><strong>{product.location}</strong></div>
            <div><span>Negotiation</span><strong>{product.is_negotiable ? "Open to offers" : "Fixed price"}</strong></div>
          </div>

          <ProductPurchasePanel productId={product.id} variants={product.variants} />
        </div>
      </section>

      <section className="reviews-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Customer feedback</p>
            <h2>Reviews</h2>
          </div>
          <Rating average={product.average_rating} count={product.review_count} />
        </div>
        {product.reviews.length ? (
          <div className="review-grid">
            {product.reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <Rating average={review.rating} compact count={1} />
                <h3>{review.title ?? "Verified purchase"}</h3>
                <p>{review.comment ?? "The buyer left a rating for this item."}</p>
                <span>Verified StyleHub buyer · {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(review.created_at))}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-review">No reviews yet. This listing is waiting for its first buyer story.</div>
        )}
      </section>

      {product.related_products.length > 0 && (
        <section className="related-products">
          <div className="section-heading">
            <div>
              <p className="eyebrow">More to discover</p>
              <h2>Related products</h2>
            </div>
            <Link href={`/shop?category=${product.category_slug}`}>View category</Link>
          </div>
          <div className="product-grid">
            {product.related_products.map((related) => <ProductCard key={related.id} product={related} />)}
          </div>
        </section>
      )}
    </main>
  );
}
