import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "@/components/Navigation";
import { MarketplaceProvider } from "@/components/MarketplaceProvider";
import { getCategories } from "@/lib/categories";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StyleHub | C2C Fashion Marketplace",
  description: "Shop pre-owned fashion from international, Vietnamese, and premium brands.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCategories();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <MarketplaceProvider>
          <Navigation categories={categories} />
          {children}
        </MarketplaceProvider>
      </body>
    </html>
  );
}
