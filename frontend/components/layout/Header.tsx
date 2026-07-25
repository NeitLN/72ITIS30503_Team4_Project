'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';
import { HeaderCartButton } from './HeaderCartButton';
import { HeaderWishlistButton } from './HeaderWishlistButton';
import { HeaderAuthMenu } from './HeaderAuthMenu';
import { ShopMegaMenu } from './ShopMegaMenu';
import { EN } from '../../lib/i18n';

export const Header = () => {
  const pathname = usePathname();
  const { user, isHydrated } = useAuth();

  const isAdminRoute = pathname === ROUTES.ADMIN_OVERVIEW || pathname?.startsWith(`${ROUTES.ADMIN_OVERVIEW}/`);
  const isAdminUser = user?.role === 'admin';

  const showPublicNavigation = !isAdminRoute;
  const showShoppingActions = !isAdminRoute && isHydrated && !isAdminUser;

  const logoHref = isAdminRoute ? ROUTES.ADMIN_OVERVIEW : ROUTES.HOME;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      {/* Route ticker — the marketplace's signature strip */}
      {showPublicNavigation && (
        <div className="border-b border-neutral-200 bg-neutral-900 py-1.5">
          <Container>
            <p className="truncate text-center font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-300">
              MUA ĐÚNG GU • BÁN ĐÚNG GIÁ • MẶC LÂU HƠN • KẾT NỐI CỘNG ĐỒNG C2C
            </p>
          </Container>
        </div>
      )}

      {isAdminRoute ? (
        <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex min-h-[68px] lg:min-h-[76px] items-center justify-between gap-4">
            <Link
              href={logoHref}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-2xl font-black uppercase tracking-tight text-neutral-900 hover:opacity-90 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/cat-logo.png"
                alt="StyleHub Cat Logo"
                className="h-10 w-10 object-contain"
              />
              <span>
                Style<span className="text-red-600">Hub</span>
              </span>
            </Link>

            <nav aria-label="Main navigation" className="flex min-w-0 items-center gap-4 overflow-x-auto sm:gap-5">
              <HeaderAuthMenu />
            </nav>
          </div>
        </div>
      ) : (
        <Container>
          <div className="flex min-h-[64px] lg:min-h-[72px] items-center justify-between gap-4">
            <Link
              href={logoHref}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-[22px] font-black uppercase tracking-tight text-neutral-900 hover:opacity-90 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/cat-logo.png"
                alt="StyleHub Cat Logo"
                className="h-9 w-9 object-contain"
              />
              <span>
                Style<span className="text-red-600">Hub</span>
              </span>
            </Link>

            <nav aria-label="Main navigation" className="flex min-w-0 items-center gap-4 overflow-x-auto sm:gap-5">
              <ShopMegaMenu />
              <Link href={ROUTES.ABOUT} className="hidden text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-500 md:block whitespace-nowrap">
                {EN.nav.about}
              </Link>
              <Link
                href={ROUTES.CONTACT}
                className="hidden text-neutral-900 transition-colors hover:text-neutral-500 md:block"
                title="Liên hệ"
                aria-label="Liên hệ"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 transition-transform hover:scale-110"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </Link>
              <span aria-hidden="true" className="hidden h-4 w-px bg-neutral-300 md:block mx-1" />

              <HeaderAuthMenu />

              {showShoppingActions && (
                <>
                  <span aria-hidden="true" className="h-4 w-px bg-neutral-300 mx-1" />
                  <div className="flex items-center gap-3">
                    <HeaderWishlistButton />
                    <HeaderCartButton />
                  </div>
                  <span aria-hidden="true" className="h-4 w-px bg-neutral-300 mx-1" />
                  <Link
                    href={ROUTES.SELL}
                    className="bg-neutral-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-neutral-700 rounded-sm"
                  >
                    {EN.nav.sell}
                  </Link>
                </>
              )}
            </nav>
          </div>
        </Container>
      )}
    </header>
  );
};







