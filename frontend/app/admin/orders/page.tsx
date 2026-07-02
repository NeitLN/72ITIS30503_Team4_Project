'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '../../../components/ui/Container';
import { Button } from '../../../components/ui/Button';
import { apiFetch } from '../../../lib/api';
import { formatVND } from '../../../lib/format';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  price: number;
  quantity: number;
  size: string;
  condition: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  payment_method: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all orders
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: Order[] }>('/api/orders');
      if (res.success) {
        setOrders(res.data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to fetch orders from database. Make sure the backend is running and Supabase tables are created.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Fetch specific order details (relational parent-child data)
  const handleSelectOrder = async (orderId: string) => {
    try {
      const res = await apiFetch<{ success: boolean; data: Order }>(`/api/orders/${orderId}`);
      if (res.success) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Error loading order details:', err);
      alert('Error fetching relational order details.');
    }
  };

  // Update order status (transition evidence)
  const handleStatusTransition = async (orderId: string, newStatus: 'pending' | 'processing' | 'completed' | 'cancelled') => {
    setIsUpdating(true);
    try {
      const res = await apiFetch<{ success: boolean; data: Order }>(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.success) {
        // Refresh local orders list
        setOrders(prevOrders =>
          prevOrders.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        // Refresh currently selected order details
        setSelectedOrder(prev => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status on Supabase.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center border border-yellow-600 bg-yellow-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-yellow-800">
            Pending
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center border border-blue-600 bg-blue-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-blue-800">
            Processing
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center border border-green-600 bg-green-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-green-800">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center border border-red-600 bg-red-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-red-800">
            Cancelled
          </span>
        );
    }
  };

  return (
    <Container className="py-10 sm:py-16">
      <div className="border-b border-neutral-200 pb-5 mb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
          StyleHub Control Room
        </span>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-neutral-900 mt-1.5">
          Administrative Order Dashboard
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Monitor incoming sales, check relational purchase orders, and transition fulfillment status.
        </p>
      </div>

      {error && (
        <div className="mb-8 border border-red-500 bg-red-50 p-4 font-mono text-xs text-red-800">
          <p className="font-bold">⚠️ SCHEMA / DATABASE CONNECTION ERROR:</p>
          <p className="mt-2">{error}</p>
          <p className="mt-4 font-sans text-neutral-600">
            💡 **How to solve:** Ensure you have executed the orders schema inside your **Supabase SQL Editor** using the commands in the newly created file:
            <br />
            <code className="bg-neutral-200 px-1 py-0.5 text-neutral-900 font-bold font-mono text-[11px]">
              supabase/migrations/20260702030000_create_stylehub_orders_schema.sql
            </code>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Orders List (Figure 5) */}
        <div className="lg:col-span-7">
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 flex justify-between items-center">
              <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-neutral-800">
                Incoming Orders ({orders.length})
              </h2>
              <button
                onClick={loadOrders}
                className="font-mono text-[10px] uppercase text-neutral-500 hover:text-neutral-900 underline"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="py-20 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 animate-pulse">
                  Querying order tables...
                </p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-20 text-center font-mono text-xs text-neutral-400 uppercase tracking-wider">
                No orders logged in database yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 font-mono text-[10px] uppercase tracking-wider text-neutral-500 bg-neutral-50">
                      <th className="px-5 py-3 font-semibold">Order ID</th>
                      <th className="px-5 py-3 font-semibold">Customer</th>
                      <th className="px-5 py-3 font-semibold">Total Amount</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => handleSelectOrder(order.id)}
                        className={`hover:bg-neutral-50 cursor-pointer transition-colors ${
                          selectedOrder?.id === order.id ? 'bg-neutral-100 font-semibold' : ''
                        }`}
                      >
                        <td className="px-5 py-4 font-mono text-[10px] text-neutral-500">
                          {order.id.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-neutral-900 font-semibold">{order.customer_name}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{order.customer_phone}</p>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-neutral-900">
                          {formatVND(Number(order.total_amount))}
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(order.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Detail & Status Transition (Figure 6 & 7) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-4">
              <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-neutral-800">
                Relational Detail Viewer
              </h2>
            </div>

            {!selectedOrder ? (
              <div className="py-24 text-center px-6">
                <span className="text-3xl">📂</span>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  Select an order from the list to load parental & child relational data.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Status Indicator & Transition Panel (Figure 7) */}
                <div className="border border-neutral-200 bg-neutral-50 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-2.5">
                    Order Status & Transitions (Fulfillment Proof)
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-neutral-600">Current Status:</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isUpdating || selectedOrder.status === 'processing'}
                      onClick={() => handleStatusTransition(selectedOrder.id, 'processing')}
                      className="border border-blue-900 bg-white text-blue-900 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-bold hover:bg-blue-50 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      ⚙️ Process Order
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating || selectedOrder.status === 'completed'}
                      onClick={() => handleStatusTransition(selectedOrder.id, 'completed')}
                      className="border border-green-900 bg-white text-green-900 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-bold hover:bg-green-50 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      ✅ Complete Order
                    </button>
                  </div>
                  {isUpdating && (
                    <p className="mt-2 text-[10px] font-mono text-neutral-400 uppercase tracking-widest animate-pulse">
                      Sending PATCH query to Supabase...
                    </p>
                  )}
                </div>

                {/* Parent Customer Info */}
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-3 border-b border-neutral-100 pb-1.5">
                    Customer Info (Parent Record)
                  </h3>
                  <dl className="grid grid-cols-2 gap-y-3 text-xs">
                    <div className="col-span-2">
                      <dt className="text-neutral-400 font-mono text-[9px] uppercase">Order UUID</dt>
                      <dd className="font-mono text-[10px] text-neutral-800 font-bold bg-neutral-100 px-1.5 py-0.5 inline-block select-all">
                        {selectedOrder.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Name</dt>
                      <dd className="font-semibold text-neutral-900">{selectedOrder.customer_name}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Phone</dt>
                      <dd className="font-semibold text-neutral-900 font-mono">{selectedOrder.customer_phone}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-neutral-400">Email</dt>
                      <dd className="font-semibold text-neutral-900 font-mono">{selectedOrder.customer_email}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-neutral-400">Address</dt>
                      <dd className="font-semibold text-neutral-900">
                        {selectedOrder.customer_address}, {selectedOrder.customer_city}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Payment Method</dt>
                      <dd className="font-mono font-bold text-neutral-900 uppercase">
                        {selectedOrder.payment_method}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Date Logged</dt>
                      <dd className="text-neutral-900">
                        {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Child Relational Line Items (Figure 6 details) */}
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-3 border-b border-neutral-100 pb-1.5">
                    Order Items (Child Relational Records)
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1 divide-y divide-neutral-100">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={item.id || idx} className="flex justify-between items-start text-xs pt-2.5 first:pt-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-neutral-900 truncate">{item.product_name}</h4>
                          <p className="font-mono text-[10px] text-neutral-400 mt-0.5">
                            Size {item.size} · {item.condition} · Qty {item.quantity}
                          </p>
                        </div>
                        <div className="text-right pl-3 font-mono">
                          <p className="font-bold text-neutral-900">{formatVND(Number(item.price))}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Sub: {formatVND(Number(item.price) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Cost Display */}
                <div className="border-t border-neutral-200 pt-4 flex justify-between items-baseline bg-neutral-900 p-4 text-white">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    Total Amount
                  </span>
                  <span className="font-mono text-lg font-black tracking-tight">
                    {formatVND(Number(selectedOrder.total_amount))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
