'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  action_href: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationsClient() {
  const { isHydrated, isAuthenticated, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token) return;

    let active = true;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const res = await apiFetch<{ success: boolean; data: Notification[]; error?: { message: string } }>('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;
        if (!res.success) throw new Error(res.error?.message || 'Lỗi tải thông báo');
        setNotifications(res.data);
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Lỗi không xác định');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchNotifications();
    return () => { active = false; };
  }, [isHydrated, isAuthenticated, token]);

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      const res = await apiFetch<{ success: boolean }>('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    try {
      const res = await apiFetch<{ success: boolean }>(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Container className="py-8 min-h-[60vh]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-neutral-200 pb-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-neutral-900">
          Thông báo
        </h1>
        {notifications.some(n => !n.is_read) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} data-testid="notifications-mark-all">
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {error ? `Lỗi: ${error}` : ''}
      </div>

      {!isHydrated || (isAuthenticated && loading) ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-neutral-100 border border-neutral-200" />)}
        </div>
      ) : !isAuthenticated ? (
        <div className="py-12 text-center" data-testid="notifications-signed-out">
          <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">
            Vui lòng đăng nhập để xem thông báo
          </p>
        </div>
      ) : error ? (
        <p className="text-red-700 bg-red-50 p-4 border border-red-200">{error}</p>
      ) : notifications.length === 0 ? (
        <div className="py-12 text-center" data-testid="notifications-empty">
          <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">Không có thông báo nào</p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Danh sách thông báo">
          {notifications.map((notif) => (
            <li
              key={notif.id}
              data-testid="notification-row"
              className={`p-4 border transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${
                notif.is_read ? 'bg-white border-neutral-200 text-neutral-600' : 'bg-neutral-50 border-neutral-400 text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {!notif.is_read && <span className="w-2 h-2 bg-black rounded-full shrink-0" aria-label="Chưa đọc" />}
                  <h2 className="font-bold truncate text-base">{notif.title}</h2>
                  <span className="text-xs font-mono text-neutral-500 ml-auto sm:ml-2 shrink-0">
                    {new Date(notif.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <p className="text-sm line-clamp-2 mt-1">{notif.body}</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end mt-2 sm:mt-0">
                {notif.action_href && (
                  <Link href={notif.action_href} passHref legacyBehavior>
                    <a className="text-xs font-mono uppercase tracking-widest hover:underline whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                      Xem chi tiết →
                    </a>
                  </Link>
                )}
                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    aria-label="Đánh dấu đã đọc"
                    title="Đánh dấu đã đọc"
                    data-testid="notification-mark-read"
                  >
                    ✓ Đã đọc
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}