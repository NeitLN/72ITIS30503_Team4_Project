import Image from "next/image";
import Link from "next/link";

export default function Home() {
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
            <div><strong>30+</strong><span>Curated listings</span></div>
            <div><strong>20+</strong><span>Brands to discover</span></div>
            <div><strong>C2C</strong><span>Direct from sellers</span></div>
          </div>
        </div>
        <div className="hero-card" aria-label="Featured collection">
          <div className="card-tag">Featured listing</div>
          <div className="product-visual marketplace-visual">
            <Image
              alt="Nike Free RN Flyknit Running Shoes"
              className="featured-market-image"
              fill
              priority
              sizes="(max-width: 850px) 90vw, 42vw"
              src="/images/products/nike-air-force-1.jpg"
            />
          </div>
          <div className="card-copy">
            <span>Listed by Quang Minh</span>
            <strong>Nike Free RN Flyknit</strong>
          </div>
        </div>
      </section>

      <section className="content-section" id="news">
        <p className="eyebrow">Fresh listings</p>
        <h2>Every piece has more life to give.</h2>
        <p>Find wardrobe favorites from global labels and independent Vietnamese brands.</p>
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
