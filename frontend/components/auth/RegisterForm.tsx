'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { Button } from '../ui/Button';

export const RegisterForm = () => {
  const router = useRouter();
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
      router.push(ROUTES.PROFILE);
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
          Full Name
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
          Email Address
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
          Password
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
        <p className="mt-1.5 text-[10px] text-neutral-400">Must be at least 6 characters.</p>
      </div>

      <div>
        <label htmlFor="role" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          Account Type
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'customer' | 'seller' | 'admin')}
          className="block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none bg-white appearance-none"
        >
          <option value="customer">Shopper</option>
          <option value="seller">Seller</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      {role === 'admin' && (
        <div>
          <label htmlFor="adminCode" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
            Admin Registration Code
          </label>
          <input
            type="password"
            id="adminCode"
            required
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            className="block w-full border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            placeholder="Required for admin accounts"
          />
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full mt-4"
        disabled={isLoading}
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>

      <div className="mt-6 text-center text-xs text-neutral-500 border-t border-neutral-100 pt-6">
        Already have an account?{' '}
        <Link href={ROUTES.LOGIN} className="font-semibold text-neutral-900 hover:underline">
          Log in
        </Link>
      </div>
    </form>
  );
};
