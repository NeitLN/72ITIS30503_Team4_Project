import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminOrdersClient } from '../../../components/admin/AdminOrdersClient';
import { AdminPageShell } from '../../../components/admin/ui/AdminPageShell';

export const metadata: Metadata = {
  title: 'Quản lý đơn hàng',
  description: 'Quản lý đơn hàng dành cho quản trị viên StyleHub.',
};

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <AdminPageShell className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
          ĐANG TẢI...
        </p>
      </AdminPageShell>
    }>
      <AdminOrdersClient />
    </Suspense>
  );
}
