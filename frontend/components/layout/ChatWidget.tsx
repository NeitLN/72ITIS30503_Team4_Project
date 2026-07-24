'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

export function ChatWidget() {
  const pathname = usePathname();

  // Hide chat on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  if (!process.env.NEXT_PUBLIC_TAWKTO_ID) {
    return null;
  }

  return (
    <Script
      id="tawkto-widget"
      strategy="lazyOnload"
      src={`https://embed.tawk.to/${process.env.NEXT_PUBLIC_TAWKTO_ID}`}
    />
  );
}
