import { Metadata } from 'next';
import { NotificationsClient } from '../../components/notifications/NotificationsClient';

export const metadata: Metadata = {
  title: 'Thông báo',
  description: 'Quản lý thông báo của bạn trên StyleHub.',
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}