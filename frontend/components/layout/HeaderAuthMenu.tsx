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
      <div className="flex items-center gap-4 text-sm font-medium">
        <span className="text-neutral-900 hidden sm:inline-block">
          Hi, {user.name.split(' ')[0]}
        </span>
        
        {user.role === 'admin' && (
          <span className="bg-red-100 text-red-800 text-[10px] uppercase font-mono px-1.5 py-0.5 border border-red-200 hidden md:inline-block">
            Admin
          </span>
        )}
        
        <button
          onClick={() => logout()}
          className="text-neutral-500 transition-colors hover:text-neutral-900 focus:outline-none"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm font-medium">
      <Link href={ROUTES.LOGIN} className="text-neutral-900 transition-colors hover:text-neutral-500">
        Log in
      </Link>
      <Link href={ROUTES.REGISTER} className="hidden text-neutral-900 transition-colors hover:text-neutral-500 sm:inline-block">
        Join
      </Link>
    </div>
  );
};
