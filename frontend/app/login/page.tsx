import { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '../../components/auth/LoginForm';
import { Container } from '../../components/ui/Container';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to your StyleHub account.',
};

export default function LoginPage() {
  return (
    <Container className="py-16 sm:py-24 max-w-md">
      <div className="border border-neutral-200 bg-white p-6 sm:p-10">
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
          Log in to StyleHub
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-8">
          Welcome back to the marketplace.
        </p>
        <Suspense fallback={<div className="h-64 animate-pulse bg-neutral-50"></div>}>
          <LoginForm />
        </Suspense>
      </div>

      <div className="mt-8 border border-neutral-200 bg-neutral-50 p-6 text-sm">
        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-3 font-bold border-b border-neutral-200 pb-2">
          Demo Accounts
        </p>
        <div className="grid gap-3">
          <div>
            <span className="font-semibold text-neutral-900">Customer:</span>
            <code className="ml-2 bg-neutral-200 px-1 py-0.5 text-xs">customer@stylehub.vn</code>
            <code className="ml-2 bg-neutral-200 px-1 py-0.5 text-xs">customer123</code>
          </div>
          <div>
            <span className="font-semibold text-neutral-900">Admin:</span>
            <code className="ml-2 bg-neutral-200 px-1 py-0.5 text-xs">admin@stylehub.vn</code>
            <code className="ml-2 bg-neutral-200 px-1 py-0.5 text-xs">admin123</code>
          </div>
        </div>
        <p className="mt-4 text-xs text-neutral-500 italic">
          *Create these accounts through Register first if they do not exist yet.
        </p>
      </div>
    </Container>
  );
}
