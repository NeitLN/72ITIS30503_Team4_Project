'use client';

import React, { useEffect, useState } from 'react';
import { getMyOrder, SellerOrderItem } from '../../lib/sellerDashboard';
import { formatVND, formatVietnamDateTime, formatCondition } from '../../lib/format';
import { FULFILLMENT_STATUS_LABELS } from '../../lib/listingOptions';

interface SellerOrderDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
}

export const SellerOrderDetailDrawer: React.FC<SellerOrderDetailDrawerProps> = ({ orderId, onClose }) => {
  const [data, setData] = useState<{ order: SellerOrderItem['order'], items: SellerOrderItem[], myTotal: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      return;
    }
    let cancelled = false;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMyOrder(orderId);
        if (cancelled) return;
        if (res.success) setData(res.data);
        else setError(res.error.message || 'Không thể tải chi tiết đơn hàng.');
      } catch {
        if (!cancelled) setError('Lỗi kết nối.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchOrder();

    return () => { cancelled = true; };
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-900/50 backdrop-blur-sm transition-opacity" data-testid="order-detail-drawer">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0 bg-neutral-50">
          <h2 className="font-display font-black uppercase tracking-tight text-neutral-900 text-lg">Chi tiết đơn bán</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 p-2" aria-label="Đóng">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading && <p className="animate-pulse text-sm text-neutral-500">Đang tải...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          
          {!loading && !error && data && data.order && (
            <>
              {/* Order Info */}
              <section className="space-y-3">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-bold border-b border-neutral-100 pb-2">Thông tin đơn hàng</h3>
                <div className="text-sm text-neutral-900 grid grid-cols-2 gap-2">
                  <span className="text-neutral-500">Mã đơn:</span>
                  <span className="font-mono">{data.order.order_code}</span>
                  
                  <span className="text-neutral-500">Ngày đặt:</span>
                  <span>{formatVietnamDateTime(data.order.created_at)}</span>
                  
                  <span className="text-neutral-500">Người mua:</span>
                  <span>{data.order.customer_name}</span>
                  
                  <span className="text-neutral-500">Điện thoại:</span>
                  <span>{data.order.customer_phone}</span>
                  
                  <span className="text-neutral-500">Giao đến:</span>
                  <span>{data.order.shipping_address}, {data.order.city}</span>
                </div>
              </section>

              {/* Items */}
              <section className="space-y-4">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-bold border-b border-neutral-100 pb-2">Sản phẩm của bạn</h3>
                <ul className="space-y-4">
                  {data.items.map(item => (
                    <li key={item.id} className="border border-neutral-200 p-3 flex flex-col gap-3">
                      <div className="flex gap-3 min-w-0">
                        {item.image_url && <img src={item.image_url} alt="" className="h-12 w-12 object-cover border border-neutral-200" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-neutral-900 line-clamp-2 leading-tight">{item.product_name}</p>
                          <p className="text-xs text-neutral-500 mt-1">
                            SL: {item.quantity} 
                            {item.size && ` · ${item.size}`}
                            {item.condition && ` · ${formatCondition(item.condition)}`}
                          </p>
                          <p className="text-sm font-bold text-neutral-900 mt-1">{formatVND(item.line_total || (item.unit_price || item.price || 0) * item.quantity)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider border border-neutral-300 px-2 py-0.5">
                          {FULFILLMENT_STATUS_LABELS[item.fulfillment_status] || item.fulfillment_status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Financials Summary */}
              <section className="space-y-3 bg-neutral-50 p-4 border border-neutral-200">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-2">Giá trị (Phần của bạn)</h3>
                <div className="flex justify-between text-sm">
                  <span>Tổng tiền hàng:</span>
                  <span className="font-bold">{formatVND(data.myTotal)}</span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-2 italic">Chi tiết phí nền tảng và thực nhận sẽ hiển thị trong phần Doanh Thu (Phase 6).</p>
              </section>

              {/* Actions (simplified, actual actions usually per item) */}
              <div className="flex justify-between items-center mt-4">
                <p className="text-xs text-neutral-500">
                  Vui lòng cập nhật trạng thái xử lý từng sản phẩm tại màn hình danh sách Đơn bán.
                </p>
                <button
                  type="button"
                  className="bg-black text-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/conversations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order_id: orderId })
                      }).then(r => r.json());
                      if (res.success && res.data?.id) {
                        window.location.href = `/messages/${res.data.id}`;
                      } else {
                        alert(res.error?.message || 'Không thể mở tin nhắn.');
                      }
                    } catch (e) {
                      alert('Lỗi kết nối.');
                    }
                  }}
                >
                  Nhắn người mua
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
