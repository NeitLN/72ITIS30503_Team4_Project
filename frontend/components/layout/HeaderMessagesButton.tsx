'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

export const HeaderMessagesButton = () => {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const isActive = pathname?.startsWith('/messages');

  useEffect(() => {
    let active = true;

    // Unread count is included in listMyConversations.
    // For a simple badge, we can quickly fetch it. It's not a standalone endpoint yet,
    // so we'll fetch conversations and sum.
    const fetchCount = () => {
      apiFetch<{ success: boolean; data: { unread_count?: number }[] }>('/api/conversations')
        .then((res) => {
          if (active && res.success && res.data) {
            const sum = res.data.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
            setUnreadCount(sum);
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
      href="/messages"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-sm transition-colors ${
        isActive
          ? 'bg-neutral-100 text-neutral-900 border border-neutral-300'
          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'
      }`}
      aria-label={`Tin nhắn ${unreadCount > 0 ? `(${unreadCount} chưa đọc)` : ''}`}
      data-testid="messages-link"
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>

      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-white"
          data-testid="messages-unread-count"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
};