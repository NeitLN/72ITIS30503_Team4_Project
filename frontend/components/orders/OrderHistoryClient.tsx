'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { cancelOrder, listMyOrders } from '../../lib/orders';
import { formatVND, formatVietnamDateTime } from '../../lib/format';
import { ROUTES } from '../../constants/routes';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { vi, tStatus, tPaymentMethod } from '../../lib/i18n';

type Order = {
  id: string;
  order_code: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount?: number;
  total_amount: number;
  created_at: string;
};

export const OrderHistoryClient = () => {
  const { isAuthenticated, isHydrated } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isHydrated) return;
    
    if (isAuthenticated) {
      listMyOrders()
        .then(res => {
          if (active) {
            if (res.success && Array.isArray(res.data)) {
              setOrders(res.data);
            } else {
              setErrorMsg(res.error?.message || 'Không thể tải đơn hàng.');
            }
          }
        })
        .catch((err) => {
          if (active) {
            const e = err as Error;
            setErrorMsg(e?.message || 'Đã xảy ra lỗi kết nối không mong muốn.');
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    } else {
      // Guest view
      let mounted = true;
      Promise.resolve().then(() => {
        if (mounted) setIsLoading(false);
      });
      return () => { mounted = false; };
    }

    return () => {
      active = false;
    };
  }, [isHydrated, isAuthenticated]);

  const retryLoadOrders = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await listMyOrders();
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setErrorMsg(res.error?.message || 'Không thể tải đơn hàng.');
      }
    } catch (err) {
      const e = err as Error;
      setErrorMsg(e?.message || 'Đã xảy ra lỗi kết nối không mong muốn.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center border border-yellow-600 bg-yellow-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-yellow-800">{tStatus('pending')}</span>;
      case 'processing':
        return <span className="inline-flex items-center border border-blue-600 bg-blue-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-blue-800">{tStatus('processing')}</span>;
      case 'completed':
        return <span className="inline-flex items-center border border-green-600 bg-green-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-green-800">{tStatus('completed')}</span>;
      case 'cancelled':
        return <span className="inline-flex items-center border border-red-600 bg-red-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-red-800">{tStatus('cancelled')}</span>;
      default:
        return <span className="inline-flex items-center border border-neutral-600 bg-neutral-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-neutral-800">{tStatus(status)}</span>;
    }
  };

  const formatPaymentMethod = (method: string) => {
    return tPaymentMethod(method);
  };

  const handleCancel = async (order: Order) => {
    if (!window.confirm(`Hủy đơn ${order.order_code}? Tồn kho sẽ được hoàn lại nếu đơn đủ điều kiện.`)) return;
    setCancellingId(order.id);
    setErrorMsg(null);
    try {
      await cancelOrder(order.id);
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: 'cancelled' } : item));
    } catch (err) {
      setErrorMsg((err as Error).message || 'Không thể hủy đơn hàng.');
    } finally {
      setCancellingId(null);
    }
  };

  if (!isHydrated || isLoading) {
    return (
      <Container className="py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
          {vi.common.loading}
        </p>
      </Container>
    );
  }

  // If user is a guest, prompt them to login
  if (!isAuthenticated) {
    return (
      <Container className="py-16 sm:py-24 max-w-md">
        <div className="border border-neutral-200 bg-white p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔒</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
            Đăng nhập để xem đơn hàng
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Đơn hàng của bạn được liên kết với tài khoản StyleHub.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.ORDERS}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                {vi.checkout.goToLogin}
              </Button>
            </Link>
            <Link href={`${ROUTES.REGISTER}?redirect=${ROUTES.ORDERS}`}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                {vi.checkout.createAccount}
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10 sm:py-16">
      <div className="border-b border-neutral-200 pb-5 mb-8 flex justify-between items-end">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-neutral-900">
            {vi.orders.title}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Theo dõi lịch sử mua hàng tại StyleHub của bạn.
          </p>
        </div>
        <Link href={ROUTES.SHOP}>
          <Button variant="outline" className="hidden sm:inline-flex font-mono text-xs uppercase tracking-wider">
            {vi.common.continueShopping}
          </Button>
        </Link>
      </div>

      {errorMsg ? (
        <div className="mt-6 border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-800 font-medium mb-4">{errorMsg}</p>
          <Button variant="outline" onClick={retryLoadOrders} className="font-mono text-xs uppercase tracking-wider">
            {vi.common.retry}
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-12 text-center border border-dashed border-neutral-300 py-16 px-4">
          <span className="text-3xl" aria-hidden="true">📦</span>
          <h2 className="mt-4 font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
            {vi.orders.empty}
          </h2>
          <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto mb-8">
            Khi bạn đặt hàng, đơn hàng sẽ xuất hiện tại đây.
          </p>
          <Link href={ROUTES.SHOP}>
            <Button size="lg" className="font-mono text-xs uppercase tracking-wider">
              {vi.common.continueShopping}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 font-mono text-[10px] uppercase tracking-wider text-neutral-500 bg-neutral-50">
                  <th className="px-5 py-4 font-semibold">{vi.orders.orderId}</th>
                  <th className="px-5 py-4 font-semibold">{vi.orders.orderDate}</th>
                  <th className="px-5 py-4 font-semibold">{vi.orders.total}</th>
                  <th className="px-5 py-4 font-semibold">{vi.orders.paymentMethod}</th>
                  <th className="px-5 py-4 font-semibold">{vi.orders.status}</th>
                  <th className="px-5 py-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-5 font-mono text-xs font-bold text-neutral-900">
                      {order.order_code}
                    </td>
                    <td className="px-5 py-5 text-neutral-600 text-xs">
                      {formatVietnamDateTime(order.created_at)}
                    </td>
                    <td className="px-5 py-5 font-mono font-bold text-neutral-900">
                      {formatVND(Number(order.total_amount))}
                    </td>
                    <td className="px-5 py-5 font-mono text-[10px] uppercase text-neutral-500">
                      {formatPaymentMethod(order.payment_method)}
                    </td>
                    <td className="px-5 py-5">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-5 py-5 text-right flex flex-col gap-2 items-end">
                      {order.status === 'pending' && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancel(order)}
                          className="font-mono text-[10px] uppercase tracking-wider"
                        >
                          {cancellingId === order.id ? 'Đang hủy…' : 'Hủy đơn'}
                        </Button>
                      )}
                      {(order.status === 'pending' || order.status === 'processing') && (
                        <Button
                          type="button"
                          variant="outline"
                          className="font-mono text-[10px] uppercase tracking-wider bg-black text-white hover:bg-neutral-800"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/conversations', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ order_id: order.id })
                              }).then(r => r.json());
                              if (res.success && res.data?.id) {
                                window.location.href = `/messages/${res.data.id}`;
                              } else {
                                alert(res.error?.message || 'Không thể mở tin nhắn.');
                              }
                            } catch {
                              alert('Lỗi kết nối.');
                            }
                          }}
                        >
                          Nhắn người bán
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Container>
  );
};
