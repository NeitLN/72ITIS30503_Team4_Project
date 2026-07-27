import { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { Container } from '../../components/ui/Container';

export const metadata: Metadata = {
  title: 'Đăng ký',
  description: 'Tham gia StyleHub để bắt đầu mua và bán thời trang đã qua sử dụng.',
};

export default function RegisterPage() {
  return (
    <Container className="py-16 sm:py-24 max-w-md">
      <div className="border border-neutral-200 bg-white p-6 sm:p-10">
        <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
          <span>Tham gia</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/cat-logo.png"
            alt="StyleHub Cat Logo"
            className="h-7 w-7 object-contain"
          />
          <span>
            Style<span className="text-red-600">Hub</span>
          </span>
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-8">
          Tạo tài khoản để thanh toán và quản lý đơn hàng.
        </p>
        <Suspense fallback={<div className="h-64 animate-pulse bg-neutral-50"></div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </Container>
  );
}
