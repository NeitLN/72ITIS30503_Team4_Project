'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { listAllOrdersForAdmin, updateOrderStatus } from '../../lib/orders';
import { formatVND } from '../../lib/format';
import { ROUTES } from '../../constants/routes';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';

type AdminOrder = {
  id: string;
  order_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_method: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  created_at: string;
  updated_at?: string;
};

export const AdminOrdersClient = () => {
  const { user, isAuthenticated, isHydrated, isAdmin } = useAuth();
  
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isHydrated) return;
    
    if (isAuthenticated && isAdmin) {
      listAllOrdersForAdmin()
        .then(res => {
          if (active) {
            if (res.success && Array.isArray(res.data)) {
              setOrders(res.data);
            } else {
              setErrorMsg(res.error?.message || 'Failed to load admin orders.');
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
      let mounted = true;
      Promise.resolve().then(() => {
        if (mounted) setIsLoading(false);
      });
      return () => { mounted = false; };
    }

    return () => {
      active = false;
    };
  }, [isHydrated, isAuthenticated, isAdmin]);

  const retryLoadOrders = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await listAllOrdersForAdmin();
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setErrorMsg(res.error?.message || 'Failed to load admin orders.');
      }
    } catch {
      setErrorMsg('An unexpected network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    setErrorMsg(null);
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: newStatus as AdminOrder['status'] } : order
        ));
      } else {
        setErrorMsg(res.error?.message || 'Failed to update order status.');
      }
    } catch {
      setErrorMsg('An unexpected network error occurred while updating status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderStatusActions = (order: AdminOrder) => {
    const isUpdating = updatingId === order.id;

    if (isUpdating) {
      return <span className="font-mono text-[10px] text-neutral-400 italic">Updating...</span>;
    }

    if (order.status === 'pending') {
      return (
        <div className="flex gap-2">
          <button 
            onClick={() => handleStatusChange(order.id, 'processing')}
            disabled={!!updatingId}
            className="text-[10px] font-mono uppercase bg-neutral-900 text-white px-2 py-1 hover:bg-neutral-700 disabled:opacity-50"
          >
            Mark Processing
          </button>
          <button 
            onClick={() => {
              if(window.confirm('Cancel this order?')) handleStatusChange(order.id, 'cancelled');
            }}
            disabled={!!updatingId}
            className="text-[10px] font-mono uppercase border border-red-200 text-red-600 bg-red-50 px-2 py-1 hover:bg-red-100 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      );
    }

    if (order.status === 'processing') {
      return (
        <div className="flex gap-2">
          <button 
            onClick={() => handleStatusChange(order.id, 'completed')}
            disabled={!!updatingId}
            className="text-[10px] font-mono uppercase bg-green-700 text-white px-2 py-1 hover:bg-green-600 disabled:opacity-50"
          >
            Mark Completed
          </button>
          <button 
            onClick={() => {
              if(window.confirm('Cancel this order?')) handleStatusChange(order.id, 'cancelled');
            }}
            disabled={!!updatingId}
            className="text-[10px] font-mono uppercase border border-red-200 text-red-600 bg-red-50 px-2 py-1 hover:bg-red-100 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      );
    }

    if (order.status === 'completed') {
      return <span className="font-mono text-[10px] text-neutral-500 italic">Finalized</span>;
    }

    if (order.status === 'cancelled') {
      return <span className="font-mono text-[10px] text-red-500 italic">Cancelled</span>;
    }

    return null;
  };

  const getStatusBadge = (status: AdminOrder['status']) => {
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
          Loading control room...
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
            Log in as admin
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Admin order management requires a StyleHub admin account.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.ADMIN_ORDERS}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  // If user is logged in but NOT an admin
  if (!isAdmin) {
    return (
      <Container className="py-16 sm:py-24 max-w-md">
        <div className="border border-red-200 bg-red-50 p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">⛔</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-red-900 mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-red-800 mb-8 font-medium">
            This area is reserved for StyleHub administrators. Your current role is: <span className="font-mono uppercase">{user?.role || 'customer'}</span>.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={ROUTES.SHOP}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Back to Shop
              </Button>
            </Link>
            <Link href={ROUTES.ORDERS}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider border-red-800 text-red-800 hover:bg-red-100">
                My Orders
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  // Summary Metrics (Basic count)
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;

  return (
    <Container className="py-10 sm:py-16 max-w-7xl">
      <div className="border-b border-neutral-200 pb-5 mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
            Control Room
          </span>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-neutral-900 mt-1.5">
            Admin Orders
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Review incoming StyleHub transactions.
          </p>
        </div>
        <Button variant="outline" onClick={retryLoadOrders} className="font-mono text-xs uppercase tracking-wider">
          Refresh List
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-neutral-200 bg-neutral-50 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Total</p>
          <p className="font-mono text-2xl font-bold text-neutral-900">{orders.length}</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Pending</p>
          <p className="font-mono text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Processing</p>
          <p className="font-mono text-2xl font-bold text-blue-600">{processingCount}</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Completed</p>
          <p className="font-mono text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
      </div>

      {errorMsg ? (
        <div className="mt-6 border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-800 font-medium mb-4">{errorMsg}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-12 text-center border border-dashed border-neutral-300 py-16 px-4 bg-white">
          <span className="text-3xl" aria-hidden="true">📭</span>
          <h2 className="mt-4 font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
            No orders found
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            The database currently has no order records.
          </p>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 font-mono text-[10px] uppercase tracking-wider text-neutral-500 bg-neutral-50">
                  <th className="px-5 py-4 font-semibold">Order</th>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Total</th>
                  <th className="px-5 py-4 font-semibold">Payment</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-5 font-mono text-xs font-bold text-neutral-900">
                      {order.order_code}
                    </td>
                    <td className="px-5 py-5">
                      <p className="font-semibold text-neutral-900">{order.customer_name}</p>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{order.customer_phone}</p>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{order.customer_email}</p>
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
                      {order.shipping_fee > 0 && <p className="text-[10px] text-neutral-400 font-normal mt-0.5">+ {formatVND(Number(order.shipping_fee))} ship</p>}
                    </td>
                    <td className="px-5 py-5 font-mono text-[10px] uppercase text-neutral-500">
                      {formatPaymentMethod(order.payment_method)}
                    </td>
                    <td className="px-5 py-5">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-5 py-5">
                      {renderStatusActions(order)}
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
