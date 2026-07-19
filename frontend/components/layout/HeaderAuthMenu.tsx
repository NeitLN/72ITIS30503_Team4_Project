
'use client';

import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const HeaderAuthMenu = () => {
  const { user, isAuthenticated, isHydrated, logout } = useAuth();

  if (!isHydrated) {
    // Neutral placeholder to avoid layout shift before hydration
    return <div className="h-5 w-16" aria-hidden="true" />;
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium whitespace-nowrap">
        <div className="hidden md:flex items-center">
          <Link href={ROUTES.PROFILE} className="text-neutral-900 transition-colors hover:text-neutral-500 font-semibold truncate max-w-[120px]">
            {user.full_name || user.name || 'Hồ sơ của tôi'}
          </Link>
          {user.role === 'admin' && (
            <span className="ml-1.5 text-[9px] uppercase tracking-wider font-mono text-neutral-500">
              [QUẢN TRỊ]
            </span>
          )}
        </div>

        {user.role === 'admin' && (
          <Link href={ROUTES.ADMIN_ORDERS} className="text-neutral-600 transition-colors hover:text-neutral-900 hidden sm:inline-block">
            Quản trị
          </Link>
        )}

        <Link href={ROUTES.ORDERS} className="text-neutral-600 transition-colors hover:text-neutral-900 hidden sm:inline-block">
          Đơn hàng
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


