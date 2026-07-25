'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { Button } from '../ui/Button';

export const RegisterForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isLoading, error } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'seller' | 'admin'>('customer');
  const [adminCode, setAdminCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await register({
      name,
      email,
      password,
      role,
      ...(role === 'admin' ? { adminCode } : {}),
    });

    if (success) {
      const redirectParam = searchParams.get('redirect');

      if (role === 'admin') {
        if (redirectParam && redirectParam.startsWith('/admin') && !redirectParam.startsWith('//')) {
          router.push(redirectParam);
        } else {
          router.push(ROUTES.ADMIN_OVERVIEW);
        }
        return;
      }

      if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
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
        <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          Họ và tên
        </label>
        <input
          type="text"
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </div>

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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
        <p className="mt-1.5 text-[10px] text-neutral-400">Phải có ít nhất 6 ký tự.</p>
      </div>

      <div>
        <label htmlFor="role" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          Loại tài khoản
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'customer' | 'seller' | 'admin')}
          className="block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none bg-white appearance-none"
        >
          <option value="customer">Người mua</option>
          <option value="seller">Người bán</option>
          <option value="admin">Quản trị viên</option>
        </select>
      </div>

      {role === 'admin' && (
        <div>
          <label htmlFor="adminCode" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
            Mã đăng ký quản trị viên
          </label>
          <input
            type="password"
            id="adminCode"
            required
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            className="block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            placeholder="Bắt buộc đối với tài khoản quản trị viên"
          />
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full mt-4"
        disabled={isLoading}
      >
        {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
      </Button>

      <div className="mt-6 text-center text-xs text-neutral-500 border-t border-neutral-100 pt-6">
        Bạn đã có tài khoản?{' '}
        <Link href={ROUTES.LOGIN} className="font-semibold text-neutral-900 hover:underline">
          Đăng nhập
        </Link>
      </div>
    </form>
  );
};
