
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const HeaderAuthMenu = () => {
  const { user, isAuthenticated, isHydrated, logout } = useAuth();
  const pathname = usePathname();

  if (!isHydrated) {
    // Neutral placeholder to avoid layout shift before hydration
    return <div className="h-5 w-16" aria-hidden="true" />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      const isAdminRoute = pathname?.startsWith('/admin');

      if (isAdminRoute) {
        return (
          <div className="flex items-center gap-4 sm:gap-6 text-[13px] sm:text-[14px] font-medium whitespace-nowrap">
            <Link
              href={ROUTES.ADMIN_OVERVIEW}
              aria-current={pathname === ROUTES.ADMIN_OVERVIEW ? 'page' : undefined}
              className={`transition-colors hover:text-neutral-900 ${pathname === ROUTES.ADMIN_OVERVIEW ? 'text-neutral-900 font-bold' : 'text-neutral-600'}`}
            >
              Tổng quan
            </Link>

            <Link
              href={ROUTES.ADMIN_TRANSACTIONS}
              aria-current={pathname === ROUTES.ADMIN_TRANSACTIONS ? 'page' : undefined}
              className={`transition-colors hover:text-neutral-900 ${pathname === ROUTES.ADMIN_TRANSACTIONS ? 'text-neutral-900 font-bold' : 'text-neutral-600'}`}
            >
              Quản lý giao dịch
            </Link>

            <Link
              href={ROUTES.ADMIN_ORDERS}
              aria-current={pathname === ROUTES.ADMIN_ORDERS ? 'page' : undefined}
              className={`transition-colors hover:text-neutral-900 ${pathname === ROUTES.ADMIN_ORDERS ? 'text-neutral-900 font-bold' : 'text-neutral-600'}`}
            >
              Quản lý đơn hàng
            </Link>

            <Link
              href={ROUTES.HOME}
              className="text-neutral-600 transition-colors hover:text-neutral-900"
            >
              Xem trang chủ sàn
            </Link>

            <button
              onClick={() => logout()}
              className="text-neutral-600 transition-colors hover:text-neutral-900 focus:outline-none"
            >
              Đăng xuất
            </button>
          </div>
        );
      }

      // Admin user viewing a public route
      return (
        <div className="flex items-center gap-4 sm:gap-6 text-[13px] sm:text-[14px] font-medium whitespace-nowrap">
          <Link
            href={ROUTES.ADMIN_OVERVIEW}
            className="text-neutral-600 transition-colors hover:text-neutral-900 font-semibold"
          >
            Về trang quản trị
          </Link>
          <button
            onClick={() => logout()}
            className="text-neutral-600 transition-colors hover:text-neutral-900 focus:outline-none"
          >
            Đăng xuất
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium whitespace-nowrap">
        <div className="hidden md:flex items-center">
          <Link href={ROUTES.PROFILE} className="text-neutral-900 transition-colors hover:text-neutral-500 font-semibold truncate max-w-[120px]">
            {user.full_name || user.name || 'Hồ sơ của tôi'}
          </Link>
        </div>

        <Link href={ROUTES.ORDERS} className="text-neutral-600 transition-colors hover:text-neutral-900 hidden sm:inline-block">
          Đơn hàng
        </Link>

        <Link href={ROUTES.SELLER_DASHBOARD} className="text-neutral-600 transition-colors hover:text-neutral-900 hidden sm:inline-block">
          Kênh người bán
        </Link>

        <button
          onClick={() => logout()}
          className="text-neutral-600 transition-colors hover:text-neutral-900 focus:outline-none"
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium whitespace-nowrap">
      <Link href={ROUTES.LOGIN} className="text-neutral-600 transition-colors hover:text-neutral-900">
        Đăng nhập
      </Link>
      <Link href={ROUTES.REGISTER} className="hidden text-neutral-600 transition-colors hover:text-neutral-900 sm:inline-block">
        Đăng ký
      </Link>
    </div>
  );
};


