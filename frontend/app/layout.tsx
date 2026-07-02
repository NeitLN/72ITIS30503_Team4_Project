import type { Metadata } from 'next';
import { Archivo, Inter } from 'next/font/google';
import './globals.css';
import { siteConfig } from '../constants/site';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { CartProvider } from '../hooks/useCart';
import { WishlistProvider } from '../hooks/useWishlist';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });
const archivo = Archivo({ subsets: ['latin', 'vietnamese'], variable: '--font-archivo' });

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${archivo.variable} font-sans min-h-screen flex flex-col`}>
        <CartProvider>
          <WishlistProvider>
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
