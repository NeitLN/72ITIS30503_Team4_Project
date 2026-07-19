import type { Metadata } from 'next';
import { Archivo, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { siteConfig } from '../constants/site';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { AuthProvider } from '../hooks/useAuth';
import { CartProvider } from '../hooks/useCart';
import { WishlistProvider } from '../hooks/useWishlist';

import { SITE_URL, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from '../lib/seo';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });
const archivo = Archivo({ subsets: ['latin', 'vietnamese'], variable: '--font-archivo' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${siteConfig.name}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: ['StyleHub', 'chợ thời trang C2C', 'mua bán thời trang', 'thời trang đã qua sử dụng', 'thời trang mới', 'streetwear Việt Nam', 'giày sneaker', 'chợ bán hàng cá nhân'],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "StyleHub",
              url: SITE_URL,
              description: DEFAULT_DESCRIPTION,
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} ${archivo.variable} font-sans min-h-screen flex flex-col`}>
        <AuthProvider><CartProvider>
          <WishlistProvider>
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </WishlistProvider>
        </CartProvider></AuthProvider>
        {process.env.NEXT_PUBLIC_TAWKTO_ID ? (
          <Script
            id="tawkto-widget"
            strategy="lazyOnload"
            src={`https://embed.tawk.to/${process.env.NEXT_PUBLIC_TAWKTO_ID}`}
          />
        ) : null}
      </body>
    </html>
  );
}



