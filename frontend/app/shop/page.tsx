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
  const productLabel = `${products.length} sản phẩm`;
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <main className="shop-page">
      <p className="eyebrow">Chợ đồ local & second-hand</p>
      <h1>{selectedName ?? "Khám phá tất cả sản phẩm"}</h1>
      <p>
        {selectedName
          ? `${productLabel} trong danh mục ${selectedName}.`
          : `${productLabel} thời trang được đăng bán bởi cộng đồng.`}
      </p>
      <div className="shop-filter-row">
        <Link className={!selectedSlug ? "filter-chip selected" : "filter-chip"} href="/shop">
          Tất cả
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
                  {product.is_negotiable && <span className="negotiable-badge">Có thương lượng</span>}
                </div>
                <h2>{product.name}</h2>
                <strong className="product-price">{formatPrice(product.price)}</strong>
                <div className="marketplace-details">
                  <span><b>Kích thước</b>{product.size}</span>
                  <span><b>Người bán</b>{product.seller_name}</span>
                  <span className="product-location"><b>Khu vực</b>{product.location}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-products">
          <span>Chưa có sản phẩm</span>
          <h2>Danh mục này đang trống.</h2>
          <p>Hãy thử danh mục khác hoặc quay lại xem tất cả sản phẩm.</p>
        </div>
      )}
    </main>
  );
}
