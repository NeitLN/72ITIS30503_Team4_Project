import type { Metadata } from 'next';
import { AdminOverviewClient } from '../../components/admin/AdminOverviewClient';

export const metadata: Metadata = {
  title: 'Tổng quan hệ thống',
  description: 'Theo dõi hoạt động mua bán, giao dịch và tình trạng vận hành của StyleHub.',
};

export default function AdminOverviewPage() {
  return <AdminOverviewClient />;
}
