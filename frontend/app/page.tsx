import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getCategories } from "@/lib/categories";
import { getProductBrands, getProducts } from "@/lib/products";

export default async function Home() {
  const [products, brands, categories] = await Promise.all([
    getProducts({ sort: "newest" }),
    getProductBrands(),
    getCategories(),
  ]);

  const featuredProducts = [...products]
    .sort((a, b) => b.average_rating - a.average_rating || b.price - a.price)
    .slice(0, 4);
  const newArrivals = products.slice(0, 4);
  const brandCounts = brands
    .map((brand) => ({
      brand,
      count: products.filter((product) => product.brand === brand).length,
    }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand))
    .slice(0, 8);
  const categoryCounts = categories.map((category) => ({
    ...category,
    count: products.filter((product) => product.category_slug === category.slug).length,
    image: products.find((product) => product.category_slug === category.slug)?.thumbnail,
  }));
  const heroProduct = featuredProducts[0] ?? products[0];

  return (
    <main>
      <section className="hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <p className="eyebrow">Pre-owned fashion, better discovered</p>
          <h1>Great style deserves <span>another chapter.</span></h1>
          <p className="hero-copy">
            Discover international icons, Vietnamese streetwear, and premium
            accessories listed directly by the StyleHub community.
          </p>
          <div className="hero-actions">
            <Link href="/shop" className="primary-button">Explore the marketplace</Link>
            <Link href="/#about" className="secondary-button">How it works</Link>
          </div>
          <div className="hero-proof">
            <div><strong>{products.length}+</strong><span>Curated listings</span></div>
            <div><strong>{brands.length}+</strong><span>Brands to discover</span></div>
            <div><strong>C2C</strong><span>Direct from sellers</span></div>
          </div>
        </div>
        {heroProduct && (
          <Link className="hero-card" href={`/product/${heroProduct.slug}`} aria-label={`View ${heroProduct.name}`}>
            <div className="card-tag">Featured listing</div>
            <div className="product-visual marketplace-visual">
              <Image
                alt={`${heroProduct.brand} ${heroProduct.name}`}
                className="featured-market-image"
                fill
                priority
                sizes="(max-width: 850px) 90vw, 42vw"
                src={heroProduct.thumbnail}
              />
            </div>
            <div className="card-copy">
              <span>Listed by {heroProduct.seller_name}</span>
              <strong>{heroProduct.brand} {heroProduct.name}</strong>
            </div>
          </Link>
        )}
      </section>

      <section className="market-section" id="featured">
        <div className="section-heading">
          <div><p className="eyebrow">Community favorites</p><h2>Featured Products</h2></div>
          <Link href="/shop">Shop all</Link>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="market-section market-section-tinted" id="news">
        <div className="section-heading">
          <div><p className="eyebrow">Just listed</p><h2>New Arrivals</h2></div>
          <Link href="/shop?sort=newest">View newest</Link>
        </div>
        <div className="product-grid">
          {newArrivals.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="market-section">
        <div className="section-heading">
          <div><p className="eyebrow">Labels worth watching</p><h2>Popular Brands</h2></div>
        </div>
        <div className="brand-grid">
          {brandCounts.map(({ brand, count }) => (
            <Link className="brand-tile" href={`/shop?brand=${encodeURIComponent(brand)}`} key={brand}>
              <span>{count} listing{count === 1 ? "" : "s"}</span>
              <strong>{brand}</strong>
              <small>Explore brand →</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="market-section market-section-dark">
        <div className="section-heading">
          <div><p className="eyebrow">Browse by mood</p><h2>Trending Categories</h2></div>
        </div>
        <div className="category-showcase">
          {categoryCounts.map((category) => (
            <Link href={`/shop?category=${category.slug}`} key={category.id}>
              {category.image && <Image alt="" fill sizes="(max-width: 700px) 50vw, 20vw" src={category.image} />}
              <div><span>{category.count} products</span><strong>{category.name}</strong></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-section accent-section" id="about">
        <p className="eyebrow">About StyleHub</p>
        <h2>Buy from people who share your taste.</h2>
        <p>StyleHub connects fashion lovers through transparent, community-led resale.</p>
      </section>

      <section className="content-section" id="contact">
        <p className="eyebrow">Get in touch</p>
        <h2>Need a hand? We are here.</h2>
        <p>Contact hello@stylehub.example for listing and marketplace support.</p>
      </section>
    </main>
  );
}
