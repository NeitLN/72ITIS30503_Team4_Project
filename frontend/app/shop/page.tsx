import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getCategories } from "@/lib/categories";
import { getProductBrands, getProducts, type ProductQuery } from "@/lib/products";

type ShopSearchParams = {
  category?: string;
  brand?: string;
  search?: string;
  sort?: ProductQuery["sort"];
};

type ShopPageProps = {
  searchParams: Promise<ShopSearchParams>;
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

function shopUrl(params: ShopSearchParams, updates: ShopSearchParams) {
  const next = { ...params, ...updates };
  const search = new URLSearchParams();
  Object.entries(next).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `/shop?${query}` : "/shop";
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const [categories, brands, products] = await Promise.all([
    getCategories(),
    getProductBrands(),
    getProducts(params),
  ]);
  const selectedName = findCategoryName(categories, params.category);
  const productLabel = `${products.length} product${products.length === 1 ? "" : "s"}`;

  return (
    <main className="shop-page">
      <div className="shop-heading-row">
        <div>
          <p className="eyebrow">Community fashion marketplace</p>
          <h1>{selectedName ?? "Shop all products"}</h1>
          <p>
            {params.search
              ? `${productLabel} matching “${params.search}”.`
              : `${productLabel} from international, Vietnamese, and premium brands.`}
          </p>
        </div>
      </div>

      <form className="catalog-toolbar" action="/shop">
        {params.category && <input name="category" type="hidden" value={params.category} />}
        <label className="catalog-search">
          <span>Search products</span>
          <input
            defaultValue={params.search}
            name="search"
            placeholder="Search by product name"
            type="search"
          />
        </label>
        <label>
          <span>Brand</span>
          <select defaultValue={params.brand ?? ""} name="brand">
            <option value="">All brands</option>
            {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select defaultValue={params.sort ?? "newest"} name="sort">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
        <button type="submit">Apply</button>
        {(params.search || params.brand || params.sort) && (
          <Link className="clear-filters" href={shopUrl(params, { search: undefined, brand: undefined, sort: undefined })}>
            Clear
          </Link>
        )}
      </form>

      <div className="shop-filter-row">
        <Link className={!params.category ? "filter-chip selected" : "filter-chip"} href={shopUrl(params, { category: undefined })}>
          All
        </Link>
        {categories.map((category) => (
          <Link
            className={params.category === category.slug ? "filter-chip selected" : "filter-chip"}
            href={shopUrl(params, { category: category.slug })}
            key={category.id}
          >
            {category.name}
          </Link>
        ))}
      </div>

      {products.length > 0 ? (
        <div className="product-grid">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="empty-products">
          <span>No products found</span>
          <h2>Try a broader search.</h2>
          <p>Change your brand, category, or search terms to see more listings.</p>
        </div>
      )}
    </main>
  );
}
