"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/categories";

type NavigationProps = {
  categories: Category[];
};

const mainLinks = [
  { label: "Home", href: "/" },
  { label: "New In", href: "/#news" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function CategoryItems({
  categories,
  depth = 0,
  onNavigate,
}: {
  categories: Category[];
  depth?: number;
  onNavigate?: () => void;
}) {
  // Dynamic rendering: every database category is rendered with map().
  // Recursion repeats the same structure for any parent-child depth.
  return categories.map((category) => (
    <li className="category-item" key={category.id}>
      <Link
        href={`/shop?category=${encodeURIComponent(category.slug)}`}
        className="category-link"
        style={{ paddingLeft: `${1 + depth * 0.85}rem` }}
        onClick={onNavigate}
      >
        <span>{category.name}</span>
        {category.children.length > 0 && <span className="category-count">{category.children.length}</span>}
      </Link>

      {category.children.length > 0 && (
        <ul className="category-children">
          <CategoryItems categories={category.children} depth={depth + 1} onNavigate={onNavigate} />
        </ul>
      )}
    </li>
  ));
}

export default function Navigation({ categories }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const pathname = usePathname();

  const closeMobileMenu = () => {
    setMobileOpen(false);
    setMobileShopOpen(false);
  };

  // Component structure: brand, desktop navigation, utility action, then the
  // collapsible mobile navigation. Both menus share the same category data.
  return (
    <header className="site-header">
      <nav className="navigation-shell" aria-label="Main navigation">
        <Link href="/" className="brand" onClick={closeMobileMenu} aria-label="StyleHub home">
          <span className="brand-mark">S</span>
          <span>StyleHub</span>
        </Link>

        <ul className="desktop-nav">
          <li>
            <Link className={pathname === "/" ? "nav-link active" : "nav-link"} href="/">
              Home
            </Link>
          </li>
          <li className="shop-menu">
            <Link className={pathname === "/shop" ? "nav-link active" : "nav-link"} href="/shop">
              Shop
              <ChevronIcon className="chevron" />
            </Link>
            <div className="shop-dropdown">
              <div className="dropdown-heading">
                <span>Shop by category</span>
                <Link href="/shop">View all</Link>
              </div>
              <ul className="category-list">
                <CategoryItems categories={categories} />
              </ul>
            </div>
          </li>
          {mainLinks.slice(1).map((link) => (
            <li key={link.label}>
              <Link className="nav-link" href={link.href}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          <Link href="/shop" className="shop-button">
            Shop now
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={mobileOpen ? "mobile-panel open" : "mobile-panel"}>
          <Link className="mobile-link" href="/" onClick={closeMobileMenu}>
            Home
          </Link>
          <button
            type="button"
            className="mobile-link mobile-shop-toggle"
            aria-expanded={mobileShopOpen}
            onClick={() => setMobileShopOpen((open) => !open)}
          >
            Shop
            <ChevronIcon className={mobileShopOpen ? "chevron rotated" : "chevron"} />
          </button>
          {mobileShopOpen && (
            <ul className="mobile-category-list">
              <CategoryItems categories={categories} onNavigate={closeMobileMenu} />
            </ul>
          )}
          {mainLinks.slice(1).map((link) => (
            <Link className="mobile-link" href={link.href} key={link.label} onClick={closeMobileMenu}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
