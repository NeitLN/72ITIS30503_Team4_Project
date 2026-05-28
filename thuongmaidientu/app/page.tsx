import Link from "next/link";
import styles from "./page.module.css";

const categories = [
  {
    title: "Men",
    subtitle: "T-Shirts, Jackets, Pants",
    href: "/category/men",
    number: "01",
  },
  {
    title: "Women",
    subtitle: "Dresses, Tops, Skirts",
    href: "/category/women",
    number: "02",
  },
  {
    title: "Accessories",
    subtitle: "Shoes, Bags, Jewelry",
    href: "/category/accessories",
    number: "03",
  },
];

const products = [
  {
    name: "Vintage Denim Jacket",
    category: "Women",
    price: "$18",
    oldPrice: "$32",
    tag: "second-hand",
    image: "/image/Vintage-Denim-Jacket.jpg",
  },
  {
    name: "Oversized Streetwear Tee",
    category: "Men",
    price: "$12",
    oldPrice: "$22",
    tag: "streetwear",
    image: "/image/Oversized-Streetwear-Tee.jpg",
  },
  {
    name: "Minimal Leather Bag",
    category: "Accessories",
    price: "$20",
    oldPrice: "$35",
    tag: "new-arrival",
    image: "/image/Minimal-Leather-Bag.jpg",
  },
  {
    name: "Soft Summer Dress",
    category: "Women",
    price: "$16",
    oldPrice: "$28",
    tag: "student-price",
    image: "/image/Soft-Summer-Dress.jpg",
  },
];

const steps = [
  {
    title: "Upload Item",
    desc: "Sellers can list fashion items with images, category, price and tags.",
  },
  {
    title: "Browse & Filter",
    desc: "Buyers explore products by category, search keyword and fashion tags.",
  },
  {
    title: "Buy & Restyle",
    desc: "Users purchase affordable pieces and give clothes a second life.",
  },
];

const tags = [
  "vintage",
  "streetwear",
  "oversized",
  "minimal",
  "student-price",
  "second-hand",
  "new-arrival",
  "affordable",
  "local-seller",
  "eco-fashion",
];

export default function HomePage() {
  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroGlowOne}></div>
        <div className={styles.heroGlowTwo}></div>

        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <span></span>
            C2C Fashion Marketplace
          </div>

          <h1>
            Buy less.
            <br />
            Style more.
            <br />
            <span>Resell smarter.</span>
          </h1>

          <p className={styles.heroDescription}>
            StyleHub is a modern customer-to-customer fashion marketplace where
            students, young adults and fashion resellers can buy, sell and
            discover affordable second-hand outfits.
          </p>

          <div className={styles.heroButtons}>
            <Link href="/category/women" className={styles.primaryButton}>
              Explore Marketplace
            </Link>

            <Link href="/sell" className={styles.secondaryButton}>
              Start Selling
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div>
              <strong>1.2K+</strong>
              <span>Fashion Items</span>
            </div>

            <div>
              <strong>800+</strong>
              <span>Young Sellers</span>
            </div>

            <div>
              <strong>7</strong>
              <span>Fashion Tags</span>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.floatingLabel}>second-hand</div>
          <div className={styles.discountBadge}>-40%</div>

          <div className={styles.mainFashionCard}>
            <img src="/image/Streetwear.jpg" alt="StyleHub fashion outfit" />

            <div className={styles.cardOverlay}>
              <p>Featured Outfit</p>
              <h3>Urban Vintage Look</h3>
              <div>
                <span>$24</span>
                <Link href="/product/1">View</Link>
              </div>
            </div>
          </div>

          <div className={styles.miniCardOne}>
            <img
              src="/image/Oversized-Streetwear-Tee.jpg"
              alt="Streetwear tee"
            />
            <div>
              <strong>Streetwear Tee</strong>
              <span>$12</span>
            </div>
          </div>

          <div className={styles.miniCardTwo}>
            <img src="/image/Minimal-Fit.jpg" alt="Minimal fashion outfit" />
            <div>
              <strong>Minimal Fit</strong>
              <span>$18</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.marqueeSection}>
        <div className={styles.marqueeTrack}>
          {[...tags, ...tags].map((tag, index) => (
            <span key={`${tag}-${index}`}>#{tag}</span>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>Information Architecture</span>
          <h2>Explore StyleHub Categories</h2>
          <p>
            Parent categories and child categories help users browse products
            faster and support dynamic category routes.
          </p>
        </div>

        <div className={styles.categoryGrid}>
          {categories.map((category) => (
            <Link
              href={category.href}
              className={styles.categoryCard}
              key={category.title}
            >
              <span className={styles.categoryNumber}>{category.number}</span>
              <h3>{category.title}</h3>
              <p>{category.subtitle}</p>
              <div>View category</div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.darkSection}>
        <div className={styles.darkContent}>
          <span>Unique Value Proposition</span>
          <h2>Affordable fashion, powered by real users.</h2>
          <p>
            StyleHub focuses on category-based product discovery, simple user
            product uploads and a second-hand marketplace experience designed
            for students and young consumers.
          </p>
        </div>

        <div className={styles.darkCards}>
          <div>
            <strong>01</strong>
            <h3>User Product Upload</h3>
            <p>Users can list second-hand fashion items for resale.</p>
          </div>

          <div>
            <strong>02</strong>
            <h3>Category Filtering</h3>
            <p>Products are organized by Men, Women and Accessories.</p>
          </div>

          <div>
            <strong>03</strong>
            <h3>Fashion Tags</h3>
            <p>Flat tags connect products across different categories.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>Featured Products</span>
          <h2>Latest Marketplace Deals</h2>
          <p>
            Product cards represent dynamic product data that can be connected
            to database tables such as products, categories and tags.
          </p>
        </div>

        <div className={styles.productGrid}>
          {products.map((product, index) => (
            <article
              className={styles.productCard}
              key={product.name}
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              <div className={styles.productImageWrap}>
                <img src={product.image} alt={product.name} />
                <span>{product.tag}</span>
              </div>

              <div className={styles.productInfo}>
                <p>{product.category}</p>
                <h3>{product.name}</h3>

                <div className={styles.productBottom}>
                  <div>
                    <strong>{product.price}</strong>
                    <del>{product.oldPrice}</del>
                  </div>

                  <Link href="/product/1">Details</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.processSection}>
        <div className={styles.sectionHeader}>
          <span>How It Works</span>
          <h2>Simple C2C Fashion Flow</h2>
          <p>
            The marketplace structure supports product uploading, browsing,
            searching, reviewing and purchasing.
          </p>
        </div>

        <div className={styles.stepGrid}>
          {steps.map((step, index) => (
            <div className={styles.stepCard} key={step.title}>
              <span>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.sellerBanner}>
        <div>
          <span>Become a seller</span>
          <h2>Turn your closet into a fashion store.</h2>
          <p>
            Upload unused fashion products, add category and tags, then connect
            with buyers looking for affordable style.
          </p>
        </div>

        <Link href="/sell">Sell Product Now</Link>
      </section>
    </main>
  );
}
