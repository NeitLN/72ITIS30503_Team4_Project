'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '../../components/auth/LoginForm';
import { Container } from '../../components/ui/Container';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isHydrated, user } = useAuth();

  useEffect(() => {
    if (isHydrated && isAuthenticated && user) {
      const redirectParam = searchParams.get('redirect');

      if (user.role === 'admin') {
        if (redirectParam && redirectParam.startsWith('/admin') && !redirectParam.startsWith('//')) {
          router.replace(redirectParam);
        } else {
          router.replace(ROUTES.ADMIN_OVERVIEW);
        }
      } else {
        if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
          router.replace(redirectParam);
        } else {
          router.replace(ROUTES.PROFILE);
        }
      }
    }
  }, [isHydrated, isAuthenticated, user, router, searchParams]);

  if (!isHydrated || isAuthenticated) {
    return <div className="h-64 animate-pulse bg-neutral-50" aria-label="Đang kiểm tra trạng thái đăng nhập..."></div>;
  }

  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Container className="py-16 sm:py-24 max-w-md">
      <div className="border border-neutral-200 bg-white p-6 sm:p-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 mb-3">
          StyleHub Member
        </p>
        <h1 className="font-display text-[28px] sm:text-[44px] font-black uppercase tracking-tight text-neutral-900 leading-[1] sm:leading-[0.98] mb-5">
          <span className="sm:hidden">Chào mừng trở lại</span>
          <span className="hidden sm:inline">Chào mừng<br />trở lại</span>
        </h1>
        <p className="text-sm leading-relaxed text-neutral-500 max-w-[420px] mb-8">
          Đăng nhập để tiếp tục mua sắm, theo dõi đơn hàng và kết nối với cộng đồng StyleHub.
        </p>
        <Suspense fallback={<div className="h-64 animate-pulse bg-neutral-50"></div>}>
          <LoginContent />
        </Suspense>
      </div>
    </Container>
  );
}
