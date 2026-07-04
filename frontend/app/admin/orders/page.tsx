import { Metadata } from 'next';
import { AdminOrdersClient } from '../../../components/admin/AdminOrdersClient';

export const metadata: Metadata = {
  title: 'Admin Orders | StyleHub',
  description: 'StyleHub administrative order management.',
};

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}
