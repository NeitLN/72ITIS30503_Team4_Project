'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  order_id: string;
  status: string;
  other_participant: { id: string; full_name: string; username: string };
}

export function ConversationDetailClient() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const [convRes, msgRes] = await Promise.all([
          apiFetch<{ success: boolean; data: Conversation; error?: { message: string } }>(`/api/conversations/${id}`),
          apiFetch<{ success: boolean; data: Message[]; error?: { message: string } }>(`/api/conversations/${id}/messages`)
        ]);

        if (!active) return;

        if (!convRes.success) throw new Error(convRes.error?.message || 'Lỗi tải cuộc trò chuyện');
        if (!msgRes.success) throw new Error(msgRes.error?.message || 'Lỗi tải tin nhắn');

        setConversation(convRes.data);
        setMessages([...msgRes.data].reverse());

        await apiFetch(`/api/conversations/${id}/read`, { method: 'PATCH' });

      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Lỗi không xác định');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDetails();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const res = await apiFetch<{ success: boolean; data: Message; error?: { message: string } }>(`/api/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: newMessage })
      });

      if (!res.success) throw new Error(res.error?.message || 'Không thể gửi tin nhắn');

      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Lỗi không xác định');
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-8 min-h-[60vh]">
        <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
          <div className="h-10 bg-neutral-100 mb-8" />
          <div className="h-64 bg-neutral-50" />
        </div>
      </Container>
    );
  }

  if (error || !conversation) {
    return (
      <Container className="py-8 min-h-[60vh]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-700 bg-red-50 p-4 border border-red-200 inline-block mb-4">{error || 'Không tìm thấy cuộc trò chuyện'}</p>
          <div>
            <Link href="/messages" className="text-sm uppercase tracking-widest font-mono hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
              ← Quay lại danh sách
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 min-h-[60vh]">
      <div className="max-w-3xl mx-auto flex flex-col h-[70vh] border border-neutral-300 bg-white">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/messages" aria-label="Quay lại" className="text-neutral-500 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
              ←
            </Link>
            <div>
              <h1 className="font-bold text-lg text-neutral-900 leading-tight">
                {conversation.other_participant.full_name}
              </h1>
              <p className="text-xs font-mono text-neutral-500">
                Đơn hàng: <Link href={`/orders/${conversation.order_id}`} className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">{conversation.order_id.substring(0,8)}</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white" aria-live="polite">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-400 font-mono text-xs uppercase tracking-widest">
              Bắt đầu trò chuyện
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = user?.id === msg.sender_id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2 text-sm whitespace-pre-wrap break-words border ${
                    isMine
                      ? 'bg-black text-white border-black rounded-l-xl rounded-tr-xl'
                      : 'bg-neutral-100 text-neutral-900 border-neutral-200 rounded-r-xl rounded-tl-xl'
                  }`}>
                    {msg.body}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-1 px-1 flex gap-2">
                    <span>{new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMine && <span title={msg.is_read ? 'Đã xem' : 'Đã gửi'}>{msg.is_read ? '✓✓' : '✓'}</span>}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {conversation.status === 'active' ? (
          <div className="p-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
            <form onSubmit={handleSend} className="flex gap-2">
              <label htmlFor="message-input" className="sr-only">Nội dung tin nhắn</label>
              <textarea
                id="message-input"
                rows={1}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 resize-none bg-white border border-neutral-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black focus:outline-none disabled:bg-neutral-100"
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <Button type="submit" disabled={!newMessage.trim() || sending} className="px-6">
                Gửi
              </Button>
            </form>
          </div>
        ) : (
          <div className="p-4 border-t border-neutral-200 bg-neutral-100 text-center shrink-0">
            <p className="text-xs text-neutral-500 font-mono">Cuộc trò chuyện đã đóng</p>
          </div>
        )}
      </div>
    </Container>
  );
}