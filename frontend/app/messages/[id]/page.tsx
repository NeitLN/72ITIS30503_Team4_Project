import { Metadata } from 'next';
import { ConversationDetailClient } from '../../../components/messages/ConversationDetailClient';

export const metadata: Metadata = {
  title: 'Chi tiết tin nhắn',
  description: 'Xem cuộc trò chuyện của bạn trên StyleHub.',
};

export default function ConversationDetailPage() {
  return <ConversationDetailClient />;
}