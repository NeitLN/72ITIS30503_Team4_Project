import { Metadata } from 'next';
import { ConversationListClient } from '../../components/messages/ConversationListClient';

export const metadata: Metadata = {
  title: 'Tin nhắn',
  description: 'Danh sách cuộc trò chuyện của bạn trên StyleHub.',
};

export default function MessagesPage() {
  return <ConversationListClient />;
}