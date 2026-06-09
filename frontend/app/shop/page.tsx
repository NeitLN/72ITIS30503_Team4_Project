import Link from "next/link";
import { getCategories } from "@/lib/categories";

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
  const [{ category: selectedSlug }, categories] = await Promise.all([
    searchParams,
    getCategories(),
  ]);
  const selectedName = findCategoryName(categories, selectedSlug);

  return (
    <main className="shop-page">
      <p className="eyebrow">StyleHub collection</p>
      <h1>{selectedName ?? "Shop all products"}</h1>
      <p>
        {selectedName
          ? `Showing the latest products in ${selectedName}.`
          : "Choose a live category from the navigation menu to filter this collection."}
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
      <div className="empty-products">
        <span>Collection ready</span>
        <h2>Connect your product table next.</h2>
        <p>The dynamic category filter is active and ready to drive a product query.</p>
      </div>
    </main>
  );
}
