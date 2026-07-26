'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

export const HeaderNotificationsButton = () => {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const isActive = pathname === '/notifications';

  useEffect(() => {
    let active = true;

    const fetchCount = () => {
      apiFetch<{ success: boolean; data: { count: number } }>('/api/notifications/unread-count')
        .then((res) => {
          if (active && res.success && res.data) {
            setUnreadCount(res.data.count);
          }
        })
        .catch(() => {});
    };

    fetchCount();

    const onFocus = () => fetchCount();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchCount();
    }, 60000);

    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-sm transition-colors ${
        isActive
          ? 'bg-neutral-100 text-neutral-900 border border-neutral-300'
          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'
      }`}
      aria-label={`Thông báo ${unreadCount > 0 ? `(${unreadCount} chưa đọc)` : ''}`}
      data-testid="notifications-link"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>

      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-white"
          data-testid="notifications-unread-count"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
};