'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { Button } from '../ui/Button';

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await login({ email, password });

    if (success) {
      const redirectParam = searchParams.get('redirect');
      if (redirectParam && redirectParam.startsWith('/')) {
        router.push(redirectParam);
      } else {
        router.push(ROUTES.PROFILE);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-medium">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          Email
        </label>
        <input
          type="email"
          id="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          Mật khẩu
        </label>
        <input
          type="password"
          id="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full mt-4"
        disabled={isLoading}
      >
        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </Button>

      <div className="mt-6 text-center text-xs text-neutral-500 border-t border-neutral-100 pt-6">
        Bạn chưa có tài khoản?{' '}
        <Link href={ROUTES.REGISTER} className="font-semibold text-neutral-900 hover:underline">
          Đăng ký ngay
        </Link>
      </div>
    </form>
  );
};
