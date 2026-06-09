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

  return (
    <main className="shop-page">
      <p className="eyebrow">StyleHub collection</p>
      <h1>{selectedName ?? "Shop all products"}</h1>
      <p>
        {selectedName
          ? `${productLabel} in ${selectedName}.`
          : `${productLabel} across the complete collection.`}
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
                <p className="product-category">{product.category_slug}</p>
                <h2>{product.name}</h2>
                <div className="product-meta">
                  <strong>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(product.price)}
                  </strong>
                  <span className={product.stock > 0 ? "stock in-stock" : "stock out-of-stock"}>
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </span>
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
