'use client';

import { useEffect, useRef, useState } from 'react';
import { getOrderById } from '../../lib/orders';
import { formatVND, formatVietnamDateTime } from '../../lib/format';
import { Button } from '../ui/Button';
import { vi, tStatus, tPaymentMethod } from '../../lib/i18n';

// Local types matching the API detail response
type OrderItem = {
  id: string;
  product_name: string;
  variant_name?: string;
  image_url?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  seller_id: string;
};

type Payment = {
  id: string;
  payment_method: string;
  state: string;
  gross_amount: number;
  created_at?: string;
};

type Allocation = {
  id: string;
  seller_id: string;
  state: string;
  seller_net_amount: number;
};

type Event = {
  id: string;
  event_type: string;
  previous_state?: string;
  new_state: string;
  created_at: string;
};

type OrderDetail = {
  id: string;
  order_code: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  city?: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  items: OrderItem[];
  payments: Payment[];
  paymentAllocations: Allocation[];
  paymentEvents: Event[];
};

interface OrderDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
}

export const OrderDetailDrawer = ({ orderId, onClose }: OrderDetailDrawerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const fetchAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (orderId) {
      if (!dialog.open) {
        dialog.showModal();
        document.body.style.overflow = 'hidden';
      }

      if (fetchAbortController.current) {
        fetchAbortController.current.abort();
      }
      const controller = new AbortController();
      fetchAbortController.current = controller;

      Promise.resolve().then(() => {
        if (!controller.signal.aborted) {
          setLoading(true);
          setError(null);
          setDetail(null);
        }
      });

      getOrderById(orderId)
        .then((res) => {
          if (!controller.signal.aborted) {
            if (res.success) {
              setDetail(res.data);
            } else {
              setError(res.error?.message || 'Không thể tải chi tiết đơn hàng');
            }
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setError(err.message || 'Không thể kết nối đến máy chủ');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    } else {
      if (dialog.open) {
        dialog.close();
        document.body.style.overflow = '';
      }
    }
  }, [orderId]);

  // Clean up overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      if (fetchAbortController.current) {
        fetchAbortController.current.abort();
      }
    };
  }, []);

  const handleClose = () => {
    if (fetchAbortController.current) {
      fetchAbortController.current.abort();
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-neutral-500">
          <p className="font-mono text-xs uppercase tracking-[0.2em] animate-pulse">
            {vi.common.loading}
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-4" aria-hidden="true">⚠️</span>
          <h3 className="font-display text-lg font-bold uppercase text-red-900 mb-2">
            Không thể tải chi tiết đơn hàng
          </h3>
          <p className="text-sm text-red-800 mb-6">{error}</p>
          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => {
                if (!orderId) return;
                setLoading(true);
                setError(null);
                getOrderById(orderId)
                  .then(res => {
                    if (res.success) setDetail(res.data);
                    else setError(res.error?.message || 'Không thể tải chi tiết đơn hàng');
                  })
                  .catch(err => setError(err.message))
                  .finally(() => setLoading(false));
              }}
              className="font-mono text-xs uppercase"
            >
              Thử lại
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-xs uppercase">
              Đóng
            </Button>
          </div>
        </div>
      );
    }

    if (!detail) return null;

    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 bg-neutral-50">
        <section className="bg-white border border-neutral-200 p-5">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-4 border-b border-neutral-100 pb-2">Thông tin chung</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-500 text-xs">Mã đơn hàng</p>
              <p className="font-mono font-bold">{detail.order_code}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs">Trạng thái</p>
              <p className="font-semibold">{tStatus(detail.status)}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs">Ngày tạo</p>
              <p>{formatVietnamDateTime(detail.created_at)}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs">Cập nhật lần cuối</p>
              <p>{formatVietnamDateTime(detail.updated_at)}</p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-neutral-200 p-5">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-4 border-b border-neutral-100 pb-2">Người mua & Giao hàng</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-1">Thông tin người mua</p>
              <p>{detail.customer_name || 'Khách vãng lai'}</p>
              <p className="text-neutral-600">{detail.customer_email || 'Chưa có'}</p>
              <p className="text-neutral-600">{detail.customer_phone || 'Chưa có'}</p>
            </div>
            {detail.shipping_address && (
              <div>
                <p className="font-semibold mb-1">Địa chỉ giao hàng</p>
                <p className="text-neutral-600">{detail.shipping_address}</p>
                {detail.city && <p className="text-neutral-600">{detail.city}</p>}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-neutral-200 p-5">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-4 border-b border-neutral-100 pb-2">Chi tiết thanh toán</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Tạm tính:</span>
              <span>{formatVND(detail.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Phí vận chuyển:</span>
              <span>{formatVND(detail.shipping_fee)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span className="text-green-600/80">Giảm giá:</span>
              <span>-{formatVND(detail.discount_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-neutral-100">
              <span>Tổng cộng:</span>
              <span>{formatVND(detail.total_amount)}</span>
            </div>
          </div>
        </section>

        <section className="bg-white border border-neutral-200 overflow-hidden">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 p-5 pb-0 mb-4">Sản phẩm ({detail.items.length})</h3>
          <div className="divide-y divide-neutral-100">
            {detail.items.map((item) => (
              <div key={item.id} className="flex gap-4 p-5 text-sm">
                <div className="w-16 h-16 bg-neutral-100 flex-shrink-0 border border-neutral-200 relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">IMG</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900">{item.product_name}</p>
                  <p className="text-neutral-500 text-xs">{item.variant_name || 'Mặc định'}</p>
                  <p className="font-mono mt-1">{formatVND(item.unit_price)} x {item.quantity}</p>
                </div>
                <div className="text-right font-mono font-semibold">
                  {formatVND(item.line_total)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-neutral-200 p-5">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-4 border-b border-neutral-100 pb-2">Bản ghi thanh toán</h3>
          {detail.payments && detail.payments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {detail.payments.map((p) => (
                <div key={p.id} className="border border-neutral-100 p-3 bg-neutral-50 text-sm">
                  <div className="flex justify-between font-mono mb-1">
                    <span>{tPaymentMethod(p.payment_method)}</span>
                    <span className="font-bold">{formatVND(p.gross_amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Trạng thái: <strong className="text-neutral-700">{p.state}</strong></span>
                    <span>Mã: {p.id.split('-')[0]}...</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 italic">Chưa có bản ghi thanh toán</p>
          )}
        </section>

        <section className="bg-white border border-neutral-200 p-5">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-4 border-b border-neutral-100 pb-2">Dữ liệu phân bổ</h3>
          {detail.paymentAllocations && detail.paymentAllocations.length > 0 ? (
            <div className="flex flex-col gap-3">
              {detail.paymentAllocations.map((a) => (
                <div key={a.id} className="border border-neutral-100 p-3 bg-neutral-50 text-sm">
                  <p className="font-mono text-xs mb-1">Seller: {a.seller_id}</p>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Thực nhận: <strong className="text-neutral-700 font-mono">{formatVND(a.seller_net_amount)}</strong></span>
                    <span>Trạng thái: {a.state}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 italic">Chưa có dữ liệu phân bổ</p>
          )}
        </section>

        <section className="bg-white border border-neutral-200 p-5">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-4 border-b border-neutral-100 pb-2">Sự kiện thanh toán</h3>
          {detail.paymentEvents && detail.paymentEvents.length > 0 ? (
            <div className="flex flex-col gap-3">
              {detail.paymentEvents.map((e) => (
                <div key={e.id} className="border-l-2 border-neutral-300 pl-3 py-1 text-sm">
                  <p className="font-mono font-semibold">{e.event_type}</p>
                  <p className="text-xs text-neutral-500">{formatVietnamDateTime(e.created_at)}</p>
                  {e.new_state && <p className="text-xs mt-1">Trạng thái mới: {e.new_state}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 italic">Chưa có sự kiện thanh toán</p>
          )}
        </section>
      </div>
    );
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleClose}
      onClick={handleBackdropClick}
      className="p-0 m-0 fixed right-0 top-0 h-full max-h-screen w-full sm:w-[500px] md:w-[600px] border-l border-neutral-300 shadow-2xl bg-white backdrop:bg-black/40 outline-none transform transition-transform duration-300 open:translate-x-0 translate-x-full ml-auto"
      aria-labelledby="drawer-title"
    >
      <div className="flex flex-col h-full w-full max-w-full">
        <header className="flex-shrink-0 p-5 border-b border-neutral-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 id="drawer-title" className="font-display text-lg font-black uppercase tracking-tight text-neutral-900">
            Chi tiết đơn hàng
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            aria-label="Đóng"
          >
            ✕
          </button>
        </header>

        {renderContent()}

      </div>
    </dialog>
  );
};
