'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { listMyOrders } from '../../lib/orders';
import { formatVND } from '../../lib/format';
import { ROUTES } from '../../constants/routes';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';

type Order = {
  id: string;
  order_code: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  created_at: string;
};

export const OrderHistoryClient = () => {
  const { isAuthenticated, isHydrated } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
              setErrorMsg(res.error?.message || 'Failed to load orders.');
            }
          }
        })
        .catch(() => {
          if (active) setErrorMsg('An unexpected network error occurred.');
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
        setErrorMsg(res.error?.message || 'Failed to load orders.');
      }
    } catch {
      setErrorMsg('An unexpected network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center border border-yellow-600 bg-yellow-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-yellow-800">Pending</span>;
      case 'processing':
        return <span className="inline-flex items-center border border-blue-600 bg-blue-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-blue-800">Processing</span>;
      case 'completed':
        return <span className="inline-flex items-center border border-green-600 bg-green-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-green-800">Completed</span>;
      case 'cancelled':
        return <span className="inline-flex items-center border border-red-600 bg-red-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-red-800">Cancelled</span>;
      default:
        return <span className="inline-flex items-center border border-neutral-600 bg-neutral-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-neutral-800">{status}</span>;
    }
  };

  const formatPaymentMethod = (method: string) => {
    if (method === 'cod') return 'COD';
    if (method === 'bank_transfer') return 'Bank Transfer';
    return method;
  };

  if (!isHydrated || isLoading) {
    return (
      <Container className="py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
          Loading orders...
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
            Log in to view your orders
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Your purchases are linked to your StyleHub account.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.ORDERS}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Log in
              </Button>
            </Link>
            <Link href={`${ROUTES.REGISTER}?redirect=${ROUTES.ORDERS}`}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Create Account
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
            My Orders
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Track your StyleHub purchases and checkout history.
          </p>
        </div>
        <Link href={ROUTES.SHOP}>
          <Button variant="outline" className="hidden sm:inline-flex font-mono text-xs uppercase tracking-wider">
            Continue Shopping
          </Button>
        </Link>
      </div>

      {errorMsg ? (
        <div className="mt-6 border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-800 font-medium mb-4">{errorMsg}</p>
          <Button variant="outline" onClick={retryLoadOrders} className="font-mono text-xs uppercase tracking-wider">
            Retry Loading
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-12 text-center border border-dashed border-neutral-300 py-16 px-4">
          <span className="text-3xl" aria-hidden="true">📦</span>
          <h2 className="mt-4 font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
            No orders yet
          </h2>
          <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto mb-8">
            When you place an order, it will appear here.
          </p>
          <Link href={ROUTES.SHOP}>
            <Button size="lg" className="font-mono text-xs uppercase tracking-wider">
              Explore Marketplace
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 font-mono text-[10px] uppercase tracking-wider text-neutral-500 bg-neutral-50">
                  <th className="px-5 py-4 font-semibold">Order ID</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Total</th>
                  <th className="px-5 py-4 font-semibold">Payment</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-5 font-mono text-xs font-bold text-neutral-900">
                      {order.order_code}
                    </td>
                    <td className="px-5 py-5 text-neutral-600 text-xs">
                      {new Intl.DateTimeFormat('vi-VN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(new Date(order.created_at))}
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
