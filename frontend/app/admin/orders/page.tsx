import { Metadata } from 'next';
import { AdminOrdersClient } from '../../../components/admin/AdminOrdersClient';

export const metadata: Metadata = {
  title: 'Quản lý đơn hàng',
  description: 'Quản lý đơn hàng dành cho quản trị viên StyleHub.',
};

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}
