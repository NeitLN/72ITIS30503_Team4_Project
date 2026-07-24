'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { listAllOrdersForAdmin, updateOrderStatus } from '../../lib/orders';
import { formatVND, formatVietnamDateTime } from '../../lib/format';
import { ROUTES } from '../../constants/routes';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { vi, tStatus, tPaymentMethod } from '../../lib/i18n';
import { OrderDetailDrawer } from './OrderDetailDrawer';

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
  // Customer details usually joined, but fallback to raw structure for now since orders drops native names
};

export const AdminOrdersClient = () => {
  const { user, isAuthenticated, isHydrated, isAdmin } = useAuth();
  
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [filters, setFilters] = useState<{ query?: string; orderStatus?: string; paymentMethod?: string }>({});
  const [draftFilters, setDraftFilters] = useState<{ query?: string; orderStatus?: string; paymentMethod?: string }>({});

  useEffect(() => {
    let active = true;

    if (!isHydrated) return;
    
    if (isAuthenticated && isAdmin) {
      listAllOrdersForAdmin({ ...filters, page, pageSize })
        .then(res => {
          if (active) {
            if (res.success && res.data && Array.isArray(res.data.data)) {
              setOrders(res.data.data);
              setPagination({
                page: res.data.pagination?.page || 1,
                pageSize: res.data.pagination?.pageSize || 20,
                totalItems: res.data.pagination?.totalItems || 0,
                totalPages: res.data.pagination?.totalPages || 0,
                hasPreviousPage: res.data.pagination?.hasPreviousPage || false,
                hasNextPage: res.data.pagination?.hasNextPage || false,
              });
            } else {
              setErrorMsg(res.error?.message || 'Không thể tải danh sách đơn hàng.');
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
      let mounted = true;
      Promise.resolve().then(() => {
        if (mounted) setIsLoading(false);
      });
      return () => { mounted = false; };
    }

    return () => {
      active = false;
    };
  }, [isHydrated, isAuthenticated, isAdmin, filters, page, pageSize]);

  const retryLoadOrders = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await listAllOrdersForAdmin({ ...filters, page, pageSize });
      if (res.success && res.data && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
        setPagination({
          page: res.data.pagination?.page || 1,
          pageSize: res.data.pagination?.pageSize || 20,
          totalItems: res.data.pagination?.totalItems || 0,
          totalPages: res.data.pagination?.totalPages || 0,
          hasPreviousPage: res.data.pagination?.hasPreviousPage || false,
          hasNextPage: res.data.pagination?.hasNextPage || false,
        });
      } else {
        setErrorMsg(res.error?.message || 'Không thể tải danh sách đơn hàng.');
      }
    } catch (err) {
      const e = err as Error;
      setErrorMsg(e?.message || 'Đã xảy ra lỗi kết nối không mong muốn.');
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
        setErrorMsg(res.error?.message || 'Không thể cập nhật trạng thái đơn hàng.');
      }
    } catch (err) {
      const e = err as Error;
      setErrorMsg(e?.message || 'Đã xảy ra lỗi kết nối không mong muốn khi cập nhật trạng thái.');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderStatusActions = (order: AdminOrder) => {
    const isUpdating = updatingId === order.id;

    const detailButton = (
      <button
        onClick={() => setSelectedOrderId(order.id)}
        className="text-[10px] font-mono uppercase bg-neutral-100 text-neutral-700 px-2 py-1 hover:bg-neutral-200"
      >
        Xem chi tiết
      </button>
    );

    if (isUpdating) {
      return (
        <div className="flex gap-2">
          {detailButton}
          <span className="font-mono text-[10px] text-neutral-400 italic">{vi.common.loading}</span>
        </div>
      );
    }

    if (order.status === 'pending') {
      return (
        <div className="flex gap-2 flex-wrap">
          {detailButton}
          <button 
            onClick={() => handleStatusChange(order.id, 'processing')}
            disabled={!!updatingId}
            className="text-[10px] font-mono uppercase bg-neutral-900 text-white px-2 py-1 hover:bg-neutral-700 disabled:opacity-50"
          >
            Chuyển sang xử lý
          </button>
          <button
            onClick={() => {
              if(window.confirm('Hủy đơn hàng này?')) handleStatusChange(order.id, 'cancelled');
            }}
            disabled={!!updatingId}
            className="text-[10px] font-mono uppercase border border-red-200 text-red-600 bg-red-50 px-2 py-1 hover:bg-red-100 disabled:opacity-50"
          >
            Hủy
          </button>
        </div>
      );
    }

    if (order.status === 'processing') {
      return (
        <div className="flex gap-2 flex-wrap">
          {detailButton}
          <button
            onClick={() => handleStatusChange(order.id, 'completed')}
            disabled={!!updatingId}
            className="text-[10px] font-mono uppercase bg-green-700 text-white px-2 py-1 hover:bg-green-600 disabled:opacity-50"
          >
            Đánh dấu hoàn tất
          </button>
          <button
            onClick={() => {
              if(window.confirm('Hủy đơn hàng này?')) handleStatusChange(order.id, 'cancelled');
            }}
            disabled={!!updatingId}
            className="text-[10px] font-mono uppercase border border-red-200 text-red-600 bg-red-50 px-2 py-1 hover:bg-red-100 disabled:opacity-50"
          >
            Hủy
          </button>
        </div>
      );
    }

    if (order.status === 'completed') {
      return (
        <div className="flex gap-2 items-center flex-wrap">
          {detailButton}
          <span className="font-mono text-[10px] text-neutral-500 italic">Đã hoàn tất</span>
        </div>
      );
    }

    if (order.status === 'cancelled') {
      return (
        <div className="flex gap-2 items-center flex-wrap">
          {detailButton}
          <span className="font-mono text-[10px] text-red-500 italic">{tStatus('cancelled')}</span>
        </div>
      );
    }

    return <div className="flex gap-2">{detailButton}</div>;
  };

  const getStatusBadge = (status: AdminOrder['status']) => {
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
            Trung tâm điều hành
          </span>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-neutral-900 mt-1.5">
            {vi.adminOrders.title}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Quản lý và xem xét các giao dịch StyleHub.
          </p>
        </div>
        <Button variant="outline" onClick={retryLoadOrders} className="font-mono text-xs uppercase tracking-wider">
          Làm mới
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setFilters(draftFilters);
        }}
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
            onChange={(e) => setDraftFilters(prev => ({ ...prev, orderStatus: e.target.value }))}
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
            onChange={(e) => setDraftFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
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
            onClick={() => {
              setDraftFilters({});
              setFilters({});
              setPage(1);
            }}
            className="font-mono text-xs uppercase tracking-wider flex-1 md:flex-none"
          >
            Đặt lại
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-neutral-200 bg-neutral-50 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Tổng cộng</p>
          <p className="font-mono text-2xl font-bold text-neutral-900">{orders.length}</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{tStatus('pending')}</p>
          <p className="font-mono text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{tStatus('processing')}</p>
          <p className="font-mono text-2xl font-bold text-blue-600">{processingCount}</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{tStatus('completed')}</p>
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
          {Object.keys(filters).length > 0 ? (
            <>
              <h2 className="mt-4 font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
                Không tìm thấy đơn hàng phù hợp
              </h2>
              <p className="mt-2 text-sm text-neutral-500 mb-6">
                Hãy thay đổi từ khóa hoặc bộ lọc rồi thử lại.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftFilters({});
                  setFilters({});
                }}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Đặt lại bộ lọc
              </Button>
            </>
          ) : (
            <>
              <h2 className="mt-4 font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
                Không tìm thấy đơn hàng
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Hiện chưa có đơn hàng nào trong hệ thống.
              </p>
            </>
          )}
        </div>
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
                    value={pageSize}
                    disabled={isLoading}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
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
                    onClick={() => setPage(p => p - 1)}
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
                    onClick={() => setPage(p => p + 1)}
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

      <OrderDetailDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </Container>
  );
};
