'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { listAllOrdersForAdmin } from '../../lib/orders';
import { formatVND, formatVietnamDateTime } from '../../lib/format';
import { ROUTES } from '../../constants/routes';
import { Button } from '../ui/Button';
import { vi, tStatus, tPaymentMethod } from '../../lib/i18n';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { AdminPageShell } from './ui/AdminPageShell';
import { AdminPageHeader } from './ui/AdminPageHeader';
import { AdminMetricCard } from './ui/AdminMetricCard';
import { AdminEmptyState } from './ui/AdminEmptyState';
import { AdminErrorState } from './ui/AdminErrorState';
import { AdminStatusBadge } from './ui/AdminStatusBadge';
import {
  parseAdminOrdersSearchParams,
  serializeAdminOrdersSearchParams,
  AdminOrdersUrlState,
  DEFAULT_ADMIN_ORDERS_STATE
} from '../../lib/adminOrdersUrlState';

type AdminOrder = {
  id: string;
  order_code: string;
  user_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  subtotal: number;
  shipping_fee: number;
  discount_amount?: number;
  total_amount: number;
  created_at: string;
  updated_at?: string;
};

export const AdminOrdersClient = () => {
  const { user, isAuthenticated, isHydrated, isAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const urlState = parseAdminOrdersSearchParams(new URLSearchParams(searchParams.toString()));

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [pagination, setPagination] = useState({
    page: urlState.page,
    pageSize: urlState.pageSize,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [draftFilters, setDraftFilters] = useState<AdminOrdersUrlState>(urlState);
  const [prevSearchParamsStr, setPrevSearchParamsStr] = useState(searchParams.toString());

  // Sync draft filters with URL changes (e.g. Back/Forward) safely
  if (prevSearchParamsStr !== searchParams.toString()) {
    setPrevSearchParamsStr(searchParams.toString());
    setDraftFilters(urlState);
  }

  const listAbortController = useRef<AbortController | null>(null);

  const loadOrders = useCallback(async (state: AdminOrdersUrlState) => {
    setIsLoading(true);
    setErrorMsg(null);

    if (listAbortController.current) {
      listAbortController.current.abort();
    }
    const controller = new AbortController();
    listAbortController.current = controller;

    try {
      const res = await listAllOrdersForAdmin(state, controller.signal);
      if (controller.signal.aborted) return;

      if (res.success && res.data && Array.isArray(res.data.data)) {
        setOrders(res.data.data);

        // Out of range check
        if (res.data.data.length === 0 && res.data.pagination?.totalPages > 0 && state.page > res.data.pagination.totalPages) {
          const newState = { ...state, page: res.data.pagination.totalPages };
          router.replace(`${ROUTES.ADMIN_ORDERS}?${serializeAdminOrdersSearchParams(newState)}`);
          return;
        }

        setPagination({
          page: res.data.pagination?.page || state.page,
          pageSize: res.data.pagination?.pageSize || state.pageSize,
          totalItems: res.data.pagination?.totalItems || 0,
          totalPages: res.data.pagination?.totalPages || 0,
          hasPreviousPage: res.data.pagination?.hasPreviousPage || false,
          hasNextPage: res.data.pagination?.hasNextPage || false,
        });
      } else {
        setErrorMsg(res.error?.message || 'Không thể tải danh sách đơn hàng.');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const e = err as Error;
      setErrorMsg(e?.message || 'Đã xảy ra lỗi kết nối không mong muốn.');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isHydrated) return;

    if (isAuthenticated && isAdmin) {
      setTimeout(() => {
        void loadOrders(urlState);
      }, 0);
    } else {
      setTimeout(() => {
        setIsLoading(false);
      }, 0);
    }

    return () => {
      if (listAbortController.current) {
        listAbortController.current.abort();
      }
    };
  }, [isHydrated, isAuthenticated, isAdmin, searchParams, loadOrders, urlState]); // Re-run when URL state changes

  const retryLoadOrders = () => {
    void loadOrders(urlState);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const newState = { ...draftFilters, page: 1 };
    router.push(`${ROUTES.ADMIN_ORDERS}?${serializeAdminOrdersSearchParams(newState)}`);
  };

  const handleResetFilters = () => {
    const newState = { ...DEFAULT_ADMIN_ORDERS_STATE, pageSize: urlState.pageSize };
    setDraftFilters(newState);
    router.push(`${ROUTES.ADMIN_ORDERS}?${serializeAdminOrdersSearchParams(newState)}`);
  };

  const changePage = (newPage: number) => {
    const newState = { ...urlState, page: newPage };
    router.push(`${ROUTES.ADMIN_ORDERS}?${serializeAdminOrdersSearchParams(newState)}`);
  };

  const changePageSize = (newPageSize: number) => {
    const validSize = [10, 20, 50].includes(newPageSize) ? (newPageSize as 10 | 20 | 50) : 20;
    const newState = { ...urlState, pageSize: validSize, page: 1 };
    router.push(`${ROUTES.ADMIN_ORDERS}?${serializeAdminOrdersSearchParams(newState)}`);
  };

  const renderStatusActions = (order: AdminOrder) => {
    return (
      <button
        onClick={() => setSelectedOrderId(order.id)}
        className="text-[10px] font-mono uppercase bg-neutral-100 text-neutral-700 px-2 py-1 hover:bg-neutral-200"
      >
        Xem chi tiết
      </button>
    );
  };

  const formatPaymentMethod = (method: string) => {
    return tPaymentMethod(method);
  };

  if (!isHydrated || isLoading) {
    return (
      <AdminPageShell className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
          {vi.common.loading}
        </p>
      </AdminPageShell>
    );
  }

  // If user is a guest, prompt them to login
  if (!isAuthenticated) {
    return (
      <AdminPageShell className="!py-16 sm:!py-24 max-w-md">
        <div className="border border-neutral-200 bg-white p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔒</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
            Đăng nhập với quyền quản trị
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Khu vực này dành riêng cho quản trị viên StyleHub.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.ADMIN_ORDERS}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                {vi.checkout.goToLogin}
              </Button>
            </Link>
          </div>
        </div>
      </AdminPageShell>
    );
  }

  // If user is logged in but NOT an admin
  if (!isAdmin) {
    return (
      <AdminPageShell className="!py-16 sm:!py-24 max-w-md">
        <div className="border border-red-200 bg-red-50 p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">⛔</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-red-900 mb-2">
            Truy cập bị từ chối
          </h1>
          <p className="text-sm text-red-800 mb-8 font-medium">
            Khu vực này dành riêng cho quản trị viên StyleHub. Vai trò hiện tại của bạn: <span className="font-mono uppercase">{user?.role || 'customer'}</span>.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={ROUTES.SHOP}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                {vi.common.back}
              </Button>
            </Link>
            <Link href={ROUTES.ORDERS}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider border-red-800 text-red-800 hover:bg-red-100">
                {vi.checkout.viewMyOrders}
              </Button>
            </Link>
          </div>
        </div>
      </AdminPageShell>
    );
  }

  // Summary Metrics (Basic count)
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={vi.adminOrders.title}
        description="Quản lý và xem xét các giao dịch StyleHub."
        action={
          <Button variant="outline" onClick={retryLoadOrders} className="font-mono text-xs uppercase tracking-wider">
            Làm mới
          </Button>
        }
      />

      <form
        onSubmit={handleApplyFilters}
        className="mb-8 border border-neutral-200 bg-neutral-50 p-5 flex flex-col md:flex-row gap-4 items-end"
      >
        <div className="flex-1 w-full">
          <label htmlFor="search-query" className="block font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
            Tìm kiếm đơn hàng
          </label>
          <input
            id="search-query"
            type="text"
            placeholder="Tìm theo mã đơn, người mua hoặc email"
            value={draftFilters.query || ''}
            onChange={(e) => setDraftFilters(prev => ({ ...prev, query: e.target.value }))}
            className="w-full border border-neutral-300 p-2 text-sm focus:outline-none focus:border-neutral-900"
          />
        </div>
        <div className="w-full md:w-48">
          <label htmlFor="order-status" className="block font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
            Trạng thái đơn hàng
          </label>
          <select
            id="order-status"
            value={draftFilters.orderStatus || ''}
            onChange={(e) => setDraftFilters(prev => ({ ...prev, orderStatus: e.target.value as 'pending' | 'processing' | 'completed' | 'cancelled' | '' }))}
            className="w-full border border-neutral-300 p-2 text-sm focus:outline-none focus:border-neutral-900 bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">{tStatus('pending')}</option>
            <option value="processing">{tStatus('processing')}</option>
            <option value="completed">{tStatus('completed')}</option>
            <option value="cancelled">{tStatus('cancelled')}</option>
          </select>
        </div>
        <div className="w-full md:w-48">
          <label htmlFor="payment-method" className="block font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
            Phương thức thanh toán
          </label>
          <select
            id="payment-method"
            value={draftFilters.paymentMethod || ''}
            onChange={(e) => setDraftFilters(prev => ({ ...prev, paymentMethod: e.target.value as 'cod' | 'bank_transfer' | 'simulated_card' | '' }))}
            className="w-full border border-neutral-300 p-2 text-sm focus:outline-none focus:border-neutral-900 bg-white"
          >
            <option value="">Tất cả</option>
            <option value="cod">{tPaymentMethod('cod')}</option>
            <option value="bank_transfer">{tPaymentMethod('bank_transfer')}</option>
            <option value="simulated_card">{tPaymentMethod('simulated_card')}</option>
          </select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button type="submit" className="font-mono text-xs uppercase tracking-wider flex-1 md:flex-none">
            Áp dụng
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="font-mono text-xs uppercase tracking-wider flex-1 md:flex-none"
          >
            Đặt lại
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <AdminMetricCard label="Tổng cộng" value={orders.length} emphasized={true} />
        <AdminMetricCard label={tStatus('pending')} value={<span className="text-yellow-600">{pendingCount}</span>} />
        <AdminMetricCard label={tStatus('processing')} value={<span className="text-blue-600">{processingCount}</span>} />
        <AdminMetricCard label={tStatus('completed')} value={<span className="text-green-600">{completedCount}</span>} />
      </div>

      {errorMsg ? (
        <AdminErrorState message={errorMsg} />
      ) : orders.length === 0 ? (
        <AdminEmptyState
          title={(urlState.query || urlState.orderStatus || urlState.paymentMethod) ? "Không tìm thấy đơn hàng phù hợp" : "Không tìm thấy đơn hàng"}
          description={(urlState.query || urlState.orderStatus || urlState.paymentMethod) ? "Hãy thay đổi từ khóa hoặc bộ lọc rồi thử lại." : "Hiện chưa có đơn hàng nào trong hệ thống."}
          actionLabel={(urlState.query || urlState.orderStatus || urlState.paymentMethod) ? "Đặt lại bộ lọc" : undefined}
          onAction={(urlState.query || urlState.orderStatus || urlState.paymentMethod) ? handleResetFilters : undefined}
          filtered={!!(urlState.query || urlState.orderStatus || urlState.paymentMethod)}
        />
      ) : (
        <div className="border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 font-mono text-[10px] uppercase tracking-wider text-neutral-500 bg-neutral-50">
                  <th className="px-5 py-4 font-semibold">{vi.adminOrders.orderCode}</th>
                  <th className="px-5 py-4 font-semibold">{vi.adminOrders.customer}</th>
                  <th className="px-5 py-4 font-semibold">{vi.adminOrders.createdAt}</th>
                  <th className="px-5 py-4 font-semibold">{vi.adminOrders.total}</th>
                  <th className="px-5 py-4 font-semibold">{vi.adminOrders.paymentMethod}</th>
                  <th className="px-5 py-4 font-semibold">{vi.adminOrders.status}</th>
                  <th className="px-5 py-4 font-semibold">{vi.adminOrders.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-5 font-mono text-xs font-bold text-neutral-900">
                      {order.order_code}
                    </td>
                    <td className="px-5 py-5">
                      <p className="font-semibold text-neutral-900">{order.customer_name || `Người dùng: ${order.user_id}`}</p>
                      {order.customer_email && <p className="text-xs text-neutral-500">{order.customer_email}</p>}
                      {order.customer_phone && <p className="text-xs text-neutral-500">{order.customer_phone}</p>}
                    </td>
                    <td className="px-5 py-5 text-neutral-600 text-xs">
                      {formatVietnamDateTime(order.created_at)}
                    </td>
                    <td className="px-5 py-5 font-mono font-bold text-neutral-900">
                      {formatVND(Number(order.total_amount))}
                      {order.shipping_fee > 0 && <p className="text-[10px] text-neutral-400 font-normal mt-0.5">+ {formatVND(Number(order.shipping_fee))} vận chuyển</p>}
                    </td>
                    <td className="px-5 py-5 font-mono text-[10px] uppercase text-neutral-500">
                      {formatPaymentMethod(order.payment_method)}
                    </td>
                    <td className="px-5 py-5">
                      <AdminStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-5">
                      {renderStatusActions(order)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="font-mono text-xs text-neutral-500">
              {pagination.totalItems > 0 ? (
                `Hiển thị ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} trong tổng số ${pagination.totalItems} đơn hàng`
              ) : (
                'Không có đơn hàng để hiển thị'
              )}
            </div>
            {pagination.totalItems > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="page-size" className="font-mono text-[10px] uppercase text-neutral-500">
                    Số dòng:
                  </label>
                  <select
                    id="page-size"
                    value={pagination.pageSize}
                    disabled={isLoading}
                    onChange={(e) => changePageSize(Number(e.target.value))}
                    className="border border-neutral-300 bg-white p-1 text-xs focus:outline-none focus:border-neutral-900"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!pagination.hasPreviousPage || isLoading}
                    onClick={() => changePage(pagination.page - 1)}
                    className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 h-auto"
                  >
                    Trang trước
                  </Button>
                  <span className="font-mono text-xs text-neutral-500" aria-live="polite">
                    Trang {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!pagination.hasNextPage || isLoading}
                    onClick={() => changePage(pagination.page + 1)}
                    className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 h-auto"
                  >
                    Trang sau
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      <OrderDetailDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} onUpdateSuccess={retryLoadOrders} />
    </AdminPageShell>
  );
};
