'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { getOrderById } from '../../lib/orders';
import { formatVND } from '../../lib/format';
import { ROUTES } from '../../constants/routes';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { ListingImage } from '../marketplace/ListingImage';
import { tPaymentMethod, tStatus, vi } from '../../lib/i18n';

type OrderDetail = {
  id: string;
  order_code: string;
  status: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  payment?: {
    state: string;
    method: string;
    card_brand: string | null;
    last_four: string | null;
  } | null;
  bank_transfer?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    amount: number;
    transferContent: string;
    expiresAt: string;
    isExpired: boolean;
  } | null;
  items: Array<{ id: string; product_name: string; variant_name?: string | null; image_url?: string | null; unit_price: number; quantity: number; line_total: number }>;
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API unavailable — leave the value visible for manual copy.
        }
      }}
      className="ml-2 shrink-0 border border-neutral-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
    >
      {copied ? 'Đã sao chép' : 'Sao chép'}
    </button>
  );
}

function BankTransferPanel({ transfer }: { transfer: NonNullable<OrderDetail['bank_transfer']> }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const expiresAt = new Date(transfer.expiresAt).getTime();
  const remainingMs = Math.max(0, expiresAt - now);
  const isExpired = transfer.isExpired || remainingMs <= 0;
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return (
    <div className="mt-4 border border-neutral-300 bg-white p-4" data-testid="bank-transfer-instructions">
      <p className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-3">Hướng dẫn chuyển khoản</p>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2"><dt className="text-neutral-500">Ngân hàng</dt><dd className="font-medium text-right">{transfer.bankName}</dd></div>
        <div className="flex items-center justify-between gap-2"><dt className="text-neutral-500">Chủ tài khoản</dt><dd className="font-medium text-right">{transfer.accountName}</dd></div>
        <div className="flex items-center justify-between gap-2"><dt className="text-neutral-500">Số tài khoản</dt><dd className="flex items-center font-mono font-bold">{transfer.accountNumber}<CopyButton value={transfer.accountNumber} /></dd></div>
        <div className="flex items-center justify-between gap-2"><dt className="text-neutral-500">Số tiền</dt><dd className="font-mono font-bold">{formatVND(Number(transfer.amount))}</dd></div>
        <div className="flex items-center justify-between gap-2"><dt className="text-neutral-500">Nội dung chuyển khoản</dt><dd className="flex items-center font-mono font-bold">{transfer.transferContent}<CopyButton value={transfer.transferContent} /></dd></div>
      </dl>
      <div className="mt-3 border-t border-neutral-200 pt-3 text-xs">
        {isExpired ? (
          <p role="status" className="font-semibold text-red-700">Hướng dẫn chuyển khoản đã hết hạn. Vui lòng liên hệ StyleHub để được hỗ trợ.</p>
        ) : (
          <p className="text-neutral-600">Vui lòng chuyển khoản trong <span className="font-mono font-bold text-neutral-900">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span> để đơn hàng được xử lý đúng hạn.</p>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">Vui lòng nhập đúng nội dung chuyển khoản để đơn hàng được đối soát tự động. Trạng thái thanh toán sẽ được cập nhật sau khi StyleHub xác nhận với ngân hàng — trang này không tự xác nhận thanh toán.</p>
    </div>
  );
}

export function CheckoutSuccessClient({ orderId }: { orderId: string }) {
  const { isAuthenticated, isHydrated } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated || !orderId) return;
    let active = true;
    getOrderById(orderId)
      .then((response) => { if (active) setOrder(response.data); })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [isHydrated, isAuthenticated, orderId]);

  if (!isHydrated || (!order && !error)) return <Container className="py-20 text-center"><p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">Đang tải xác nhận đơn hàng…</p></Container>;
  if (!order) return <Container className="py-20 max-w-xl text-center"><div role="alert" className="border border-red-300 bg-red-50 p-8"><h1 className="font-display text-xl font-black uppercase">Không tìm thấy đơn hàng</h1><p className="mt-3 text-sm text-red-900">{error || 'Không thể mở xác nhận đơn hàng này.'}</p><Link href={ROUTES.ORDERS}><Button className="mt-6">Xem đơn hàng của tôi</Button></Link></div></Container>;

  return (
    <Container className="py-12 sm:py-20 max-w-3xl">
      <div className="border border-neutral-900 bg-white p-6 sm:p-10 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-green-800">Đơn hàng đã được ghi nhận</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-6"><div><h1 className="font-display text-2xl font-black uppercase">{order.payment_method === 'cod' ? 'Đặt hàng thành công — Thanh toán khi nhận hàng' : order.payment_method === 'bank_transfer' ? 'Đặt hàng thành công — Đang chờ chuyển khoản' : 'Cảm ơn bạn đã đặt hàng'}</h1><p className="mt-2 font-mono text-xs text-neutral-500">Mã đơn: <strong className="text-neutral-900">{order.order_code}</strong></p></div><span className="border border-neutral-400 px-2 py-1 font-mono text-[10px] uppercase font-bold">{tStatus(order.status)}</span></div>
        <div className="divide-y divide-neutral-200">{order.items.map((item) => <div key={item.id} className="flex gap-4 py-5"><div className="h-16 w-16 shrink-0 border bg-neutral-50"><ListingImage src={item.image_url || null} alt={item.product_name} className="h-full w-full object-cover" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.product_name}</p>{item.variant_name && <p className="mt-1 text-xs text-neutral-500">{item.variant_name}</p>}<p className="mt-1 font-mono text-[10px] text-neutral-500">{item.quantity} × {formatVND(Number(item.unit_price))}</p></div><p className="font-mono text-sm font-bold">{formatVND(Number(item.line_total))}</p></div>)}</div>
        <dl className="ml-auto mt-3 max-w-sm space-y-3 border-t pt-5 text-sm"><div className="flex justify-between"><dt>Tạm tính</dt><dd className="font-mono">{formatVND(Number(order.subtotal))}</dd></div><div className="flex justify-between"><dt>Phí giao hàng</dt><dd className="font-mono">{order.shipping_fee === 0 ? 'Miễn phí' : formatVND(Number(order.shipping_fee))}</dd></div>{Number(order.discount_amount) > 0 && <div className="flex justify-between text-green-800"><dt>Giảm giá</dt><dd className="font-mono">− {formatVND(Number(order.discount_amount))}</dd></div>}<div className="flex justify-between border-t pt-3 text-base font-bold"><dt>Tổng cộng</dt><dd className="font-mono">{formatVND(Number(order.total_amount))}</dd></div></dl>
        <div className="mt-7 border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <strong>Thanh toán: {tPaymentMethod(order.payment_method)}</strong>
          {order.payment_method === 'simulated_card' && order.payment ? (
            <div className="mt-2 space-y-1 text-neutral-700">
              <p>Trạng thái ký quỹ: <span className="font-mono font-bold uppercase text-neutral-900">{order.payment.state}</span></p>
              <p>{String(order.payment.card_brand || '').toUpperCase()} <span className="font-mono">•••• {order.payment.last_four}</span></p>
              <p className="pt-1 text-xs text-amber-900">{vi.checkout.simulatedCardWarning}</p>
            </div>
          ) : (
            <p className="mt-1 text-neutral-600">{order.payment_method === 'cod' ? 'Thanh toán cho đơn vị vận chuyển khi nhận được sản phẩm.' : 'Đơn đã được tạo. Vui lòng làm theo hướng dẫn chuyển khoản bên dưới. Trạng thái thanh toán chưa được xác nhận tự động.'}</p>
          )}
          {order.payment_method === 'bank_transfer' && order.bank_transfer && <BankTransferPanel transfer={order.bank_transfer} />}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={ROUTES.ORDERS} className="flex-1"><Button variant="outline" className="w-full">Xem đơn hàng</Button></Link><Link href={ROUTES.SHOP} className="flex-1"><Button className="w-full">Tiếp tục mua sắm</Button></Link></div>
      </div>
    </Container>
  );
}
