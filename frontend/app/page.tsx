import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <p className="eyebrow">New season, fresh perspective</p>
          <h1>Everything you love, <span>beautifully curated.</span></h1>
          <p className="hero-copy">
            Explore standout technology, everyday essentials, and modern style
            selected to make every day feel a little more considered.
          </p>
          <div className="hero-actions">
            <Link href="/shop" className="primary-button">Explore the shop</Link>
            <Link href="/#about" className="secondary-button">Our story</Link>
          </div>
          <div className="hero-proof">
            <div><strong>24h</strong><span>Fast dispatch</span></div>
            <div><strong>4.9</strong><span>Customer rating</span></div>
            <div><strong>30d</strong><span>Easy returns</span></div>
          </div>
        </div>
        <div className="hero-card" aria-label="Featured collection">
          <div className="card-tag">Editor&apos;s pick</div>
          <div className="product-visual">
            <div className="product-screen"><span>STYLE</span></div>
            <div className="product-base" />
          </div>
          <div className="card-copy">
            <span>Work, reimagined</span>
            <strong>Modern essentials</strong>
          </div>
        </div>
      </section>

      <section className="content-section" id="news">
        <p className="eyebrow">The journal</p>
        <h2>Stories behind better choices.</h2>
        <p>Fresh arrivals, buying guides, and ideas from the StyleHub community.</p>
      </section>

      <section className="content-section accent-section" id="about">
        <p className="eyebrow">About StyleHub</p>
        <h2>Useful things should still feel special.</h2>
        <p>We bring technology, accessories, and fashion together in one thoughtful marketplace.</p>
      </section>

      <section className="content-section" id="contact">
        <p className="eyebrow">Let&apos;s talk</p>
        <h2>Questions? We&apos;re here.</h2>
        <p>Contact our team at hello@stylehub.example for product or order support.</p>
      </section>
    </main>
  );
}
