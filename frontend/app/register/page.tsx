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
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
          Tham gia StyleHub
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
