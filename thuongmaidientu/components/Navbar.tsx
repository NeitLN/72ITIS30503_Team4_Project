import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <header className={styles.header}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.logoWrapper}>
          <div className={styles.logoMark}>
            <span className={styles.logoOrbit}></span>
            <span className={styles.logoInner}>SH</span>
          </div>

          <div className={styles.logoContent}>
            <span className={styles.brandName}>StyleHub</span>
            <small className={styles.brandTagline}>Fashion Marketplace</small>
          </div>
        </Link>

        <ul className={styles.menu}>
          <li>
            <Link href="/">Home</Link>
          </li>

          <li className={styles.dropdown}>
            <Link href="/category/women">Categories</Link>

            <div className={styles.dropdownPanel}>
              <Link href="/category/men">
                <span>Men</span>
                <small>T-Shirts, Jackets, Pants</small>
              </Link>

              <Link href="/category/women">
                <span>Women</span>
                <small>Dresses, Tops, Skirts</small>
              </Link>

              <Link href="/category/accessories">
                <span>Accessories</span>
                <small>Shoes, Bags, Jewelry</small>
              </Link>

              <Link href="/category/streetwear">
                <span>Streetwear</span>
                <small>Oversized and modern outfits</small>
              </Link>
            </div>
          </li>

          <li>
            <Link href="/sell">Sell Product</Link>
          </li>

          <li>
            <Link href="/search?keyword=vintage">Search</Link>
          </li>

          <li>
            <Link href="/about">About</Link>
          </li>

          <li>
            <Link href="/contact">Contact</Link>
          </li>
        </ul>

        <div className={styles.actions}>
          <Link href="/cart" className={styles.cartButton}>
            <span className={styles.cartIcon}>Bag</span>
            <span className={styles.cartBadge}>2</span>
          </Link>

          <Link href="/login" className={styles.loginButton}>
            Login
          </Link>

          <Link href="/register" className={styles.joinButton}>
            Join Now
          </Link>
        </div>
      </nav>
    </header>
  );
}
