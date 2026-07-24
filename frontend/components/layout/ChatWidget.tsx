'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ROUTES } from '../../constants/routes';

declare global {
  interface Window {
    Tawk_API?: {
      onLoad?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      shutdown?: () => void;
      start?: (options?: { showWidget?: boolean }) => void;
    };
    __STYLEHUB_TAWK_ALLOWED__?: boolean;
    Tawk_LoadStart?: Date;
  }
}

export function ChatWidget() {
  const pathname = usePathname();

  useEffect(() => {
    const tawkId = process.env.NEXT_PUBLIC_TAWKTO_ID;
    if (!tawkId) return;

    const isAdminRoute =
      pathname === ROUTES.ADMIN_OVERVIEW ||
      pathname?.startsWith(`${ROUTES.ADMIN_OVERVIEW}/`);

    // Flag to prevent async load races
    window.__STYLEHUB_TAWK_ALLOWED__ = !isAdminRoute;

    const api = window.Tawk_API;

    // Handle entering Admin route
    if (isAdminRoute) {
      if (api) {
        api.hideWidget?.();
        // Optional: call shutdown if available to disconnect the socket
        // cleanly when not in use. Some implementations omit shutdown to
        // preserve fast reconnection.
        api.shutdown?.();
      }
      return;
    }

    // Handle returning to Public route
    if (api) {
      if (api.start) {
        api.start({ showWidget: true });
        return;
      }

      if (api.showWidget) {
        api.showWidget();
        return;
      }
    }

    // Initial load logic if the script hasn't been injected yet
    const scriptId = 'stylehub-tawk-script';
    if (!document.getElementById(scriptId)) {
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_LoadStart = new Date();

      window.Tawk_API.onLoad = () => {
        // Enforce the visibility flag inside the async callback
        if (window.__STYLEHUB_TAWK_ALLOWED__) {
          window.Tawk_API?.showWidget?.();
        } else {
          window.Tawk_API?.hideWidget?.();
          window.Tawk_API?.shutdown?.();
        }
      };

      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://embed.tawk.to/${tawkId}`;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      document.head.appendChild(script);
    }
  }, [pathname]);

  return null;
}
