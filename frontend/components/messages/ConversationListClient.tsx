'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '../ui/Container';
import { apiFetch } from '../../lib/api';

interface Conversation {
  id: string;
  order_id: string;
  status: string;
  updated_at: string;
  other_participant: { id: string; full_name: string; username: string };
  last_message: { body: string; created_at: string; sender_id: string } | null;
  unread_count: number;
}

export function ConversationListClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<{ success: boolean; data: Conversation[]; error?: { message: string } }>('/api/conversations')
      .then((res) => {
        if (!active) return;
        if (!res.success) throw new Error(res.error?.message || 'Lỗi tải danh sách tin nhắn');
        setConversations(res.data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <Container className="py-8 min-h-[60vh]">
      <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-neutral-900 mb-6 border-b border-neutral-200 pb-4">
        Tin nhắn
      </h1>

      <div aria-live="polite" className="sr-only">
        {error ? `Lỗi: ${error}` : ''}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => <div key={i} className="h-20 bg-neutral-100 border border-neutral-200" />)}
        </div>
      ) : error ? (
        <p className="text-red-700 bg-red-50 p-4 border border-red-200">{error}</p>
      ) : conversations.length === 0 ? (
        <div className="py-12 text-center" data-testid="conversations-empty">
          <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">Không có cuộc trò chuyện nào</p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Danh sách cuộc trò chuyện">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <Link href={`/messages/${conv.id}`} passHref legacyBehavior>
                <a className={`block p-4 border transition-colors hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  conv.unread_count > 0 ? 'bg-neutral-50 border-neutral-400' : 'bg-white border-neutral-200'
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold truncate text-base text-neutral-900">
                          {conv.other_participant.full_name}
                        </h2>
                        {conv.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center bg-black text-white text-[10px] font-mono px-1.5 py-0.5 min-w-[1.25rem] rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-neutral-500 mt-1 truncate">
                        Mã đơn hàng: {conv.order_id.substring(0,8)}...
                      </p>
                      {conv.last_message && (
                        <p className={`text-sm mt-2 truncate ${conv.unread_count > 0 ? 'text-black font-medium' : 'text-neutral-600'}`}>
                          {conv.last_message.sender_id === conv.other_participant.id ? '' : 'Bạn: '}
                          {conv.last_message.body}
                        </p>
                      )}
                    </div>
                    {conv.last_message && (
                      <span className="text-xs font-mono text-neutral-400 shrink-0">
                        {new Date(conv.last_message.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}