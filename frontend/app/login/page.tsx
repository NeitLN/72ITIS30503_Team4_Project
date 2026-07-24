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
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
          Đăng nhập vào StyleHub
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-8">
          Chào mừng bạn trở lại chợ thời trang.
        </p>
        <Suspense fallback={<div className="h-64 animate-pulse bg-neutral-50"></div>}>
          <LoginContent />
        </Suspense>
      </div>

      <div className="mt-8 border border-neutral-200 bg-neutral-50 p-6 text-sm">
        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-3 font-bold border-b border-neutral-200 pb-2">
          Tài khoản demo
        </p>
        <div className="grid gap-3">
          <div>
            <span className="font-semibold text-neutral-900">Khách hàng:</span>
            <code className="ml-2 bg-neutral-200 px-1 py-0.5 text-xs">customer@stylehub.vn</code>
            <code className="ml-2 bg-neutral-200 px-1 py-0.5 text-xs">customer123</code>
          </div>
          <div>
            <span className="font-semibold text-neutral-900">Quản trị viên:</span>
            <code className="ml-2 bg-neutral-200 px-1 py-0.5 text-xs">admin@stylehub.vn</code>
            <code className="ml-2 bg-neutral-200 px-1 py-0.5 text-xs">admin123</code>
          </div>
        </div>
        <p className="mt-4 text-xs text-neutral-500 italic">
          *Hãy tạo các tài khoản này qua trang Đăng ký trước nếu chúng chưa tồn tại.
        </p>
      </div>
    </Container>
  );
}
