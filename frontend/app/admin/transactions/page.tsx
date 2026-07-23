import type { Metadata } from 'next';
import { AdminTransactionsClient } from '../../../components/admin/AdminTransactionsClient';

export const metadata: Metadata = {
  title: 'Quản lý giao dịch',
  description: 'Theo dõi thanh toán, phân bổ và trạng thái giao dịch StyleHub.',
};

export default function AdminTransactionsPage() {
  return <AdminTransactionsClient />;
}
