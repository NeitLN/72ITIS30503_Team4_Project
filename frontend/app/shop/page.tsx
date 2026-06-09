import Image from "next/image";
import Link from "next/link";
import { getCategories } from "@/lib/categories";
import { getProducts } from "@/lib/products";

type ShopPageProps = {
  searchParams: Promise<{ category?: string }>;
};

function findCategoryName(
  categories: Awaited<ReturnType<typeof getCategories>>,
  slug?: string,
): string | undefined {
  for (const category of categories) {
    if (category.slug === slug) return category.name;
    const childName = findCategoryName(category.children, slug);
    if (childName) return childName;
  }
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { category: selectedSlug } = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(selectedSlug),
  ]);
  const selectedName = findCategoryName(categories, selectedSlug);
  const productLabel = `${products.length} product${products.length === 1 ? "" : "s"}`;
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <main className="shop-page">
      <p className="eyebrow">Community fashion marketplace</p>
      <h1>{selectedName ?? "Shop all products"}</h1>
      <p>
        {selectedName
          ? `${productLabel} listed in ${selectedName}.`
          : `${productLabel} from international, Vietnamese, and premium brands.`}
      </p>
      <div className="shop-filter-row">
        <Link className={!selectedSlug ? "filter-chip selected" : "filter-chip"} href="/shop">
          All
        </Link>
        {categories.map((category) => (
          <Link
            className={selectedSlug === category.slug ? "filter-chip selected" : "filter-chip"}
            href={`/shop?category=${encodeURIComponent(category.slug)}`}
            key={category.id}
          >
            {category.name}
          </Link>
        ))}
      </div>
      {products.length > 0 ? (
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image-wrap">
                <Image
                  alt={product.name}
                  className="product-image"
                  fill
                  sizes="(max-width: 560px) 100vw, (max-width: 850px) 50vw, 33vw"
                  src={product.image_url}
                />
              </div>
              <div className="product-card-content">
                <div className="product-card-labels">
                  <p className="product-category">{product.condition}</p>
                  {product.is_negotiable && <span className="negotiable-badge">Negotiable</span>}
                </div>
                <p className="product-brand">{product.brand}</p>
                <h2>{product.name}</h2>
                <strong className="product-price">{formatPrice(product.price)}</strong>
                <div className="marketplace-details">
                  <span><b>Size</b>{product.size}</span>
                  <span><b>Seller</b>{product.seller_name}</span>
                  <span className="product-location"><b>Location</b>{product.location}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-products">
          <span>No products found</span>
          <h2>This collection is currently empty.</h2>
          <p>Try another category or return to all products.</p>
        </div>
      )}
    </main>
  );
}
