'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { formatVND, formatVietnamDateTime } from '../../lib/format';
import { AdminOverviewData, getAdminOverview } from '../../lib/adminOverview';
import { Button } from '../ui/Button';
import { AdminPageShell } from './ui/AdminPageShell';
import { AdminPageHeader } from './ui/AdminPageHeader';
import { AdminMetricCard } from './ui/AdminMetricCard';
import { AdminErrorState } from './ui/AdminErrorState';
import { AdminStatusBadge } from './ui/AdminStatusBadge';

const methodLabel = (value: string | null | undefined) => {
  if (!value) return 'Không áp dụng';
  return {
    simulated_card: 'Thẻ',
    cod: 'COD',
    bank_transfer: 'Chuyển khoản',
  }[value] || value.replaceAll('_', ' ');
};

const OverviewSkeleton = () => (
  <AdminPageShell className="py-8 sm:py-12">
    <div data-state="skeleton" className="animate-pulse space-y-12" aria-label="Đang tải tổng quan">
      <div className="space-y-4">
        <div className="h-10 w-80 bg-neutral-100" />
        <div className="h-6 w-[32rem] bg-neutral-50" />
      </div>
      <div className="grid gap-5 xl:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[165px] bg-neutral-50" />
        ))}
      </div>
      <div className="h-40 bg-neutral-50" />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="h-64 bg-neutral-50" />
        <div className="h-64 bg-neutral-50" />
      </div>
    </div>
  </AdminPageShell>
);

export function AdminOverviewClient() {
  const { isAuthenticated, isAdmin, isHydrated } = useAuth();

  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchOverview = async () => {
      try {
        const response = await getAdminOverview();
        if (mounted) setData(response);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải dữ liệu quản trị. Vui lòng thử lại.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (isHydrated && isAuthenticated && isAdmin) {
      void fetchOverview();
    }
    return () => { mounted = false; };
  }, [isHydrated, isAuthenticated, isAdmin]);

  if (!isHydrated || isLoading) {
    return <OverviewSkeleton />;
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <AdminPageShell className="text-center max-w-2xl">
        <div className="border border-neutral-200 bg-white p-10 shadow-sm">
          <p className="font-mono text-[13px] uppercase tracking-widest text-neutral-500">Khu vực quản trị</p>
          <h1 className="mt-5 font-display text-[32px] font-black uppercase tracking-tight">Quyền truy cập bị từ chối</h1>
          <p className="mt-4 mb-8 text-[16px] leading-7 text-neutral-600">Yêu cầu quyền quản trị viên.</p>
          <Link href={ROUTES.LOGIN} className="inline-flex min-h-12 items-center justify-center bg-neutral-900 px-8 text-[14px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-800">
            Đăng nhập
          </Link>
        </div>
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell className="text-center max-w-2xl">
        <AdminErrorState message={error} />
        <div className="mt-4">
          <Button onClick={() => window.location.reload()} variant="outline" className="min-w-40 min-h-12 px-8 text-[14px] font-semibold">Thử lại</Button>
        </div>
      </AdminPageShell>
    );
  }

  if (!data) return null;

  const hasAttentionItems = data.attention.pendingTransactions > 0 ||
                            data.attention.processingOrders > 0 ||
                            data.attention.failedPayments > 0 ||
                            data.attention.cancellationRequests > 0;

  return (
    <div className="min-h-screen bg-[#F8F8F7]">
      <AdminPageShell className="!py-8 pb-16 lg:!py-10 lg:pb-20">
        <AdminPageHeader
          title="Tổng quan hệ thống"
          description="Theo dõi hoạt động mua bán, giao dịch và tình trạng vận hành của StyleHub."
          action={
            <p className="font-mono text-[12px] sm:text-[13px] font-medium text-neutral-500 shrink-0">
              Cập nhật lúc {formatVietnamDateTime(data.generatedAt).replace(' ', ' · ')}
            </p>
          }
        />

        {/* KEY METRICS */}
        <section className="mb-14 xl:mb-16">
          <div className="grid gap-5 xl:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <AdminMetricCard label="Tổng người dùng" value={data.metrics.totalUsers.toLocaleString('vi-VN')} />
            <AdminMetricCard label="Tổng người bán" value={data.metrics.activeSellers.toLocaleString('vi-VN')} note="Có tài khoản người bán" />
            <AdminMetricCard label="Sản phẩm đang bán" value={data.metrics.activeProducts.toLocaleString('vi-VN')} />
            <AdminMetricCard label="Tổng đơn hàng" value={data.metrics.totalOrders.toLocaleString('vi-VN')} />
            <AdminMetricCard label="Thanh toán đã ghi nhận" value={data.metrics.totalPayments.toLocaleString('vi-VN')} />
            <AdminMetricCard
              label="Giá trị đơn hàng"
              value={formatVND(data.metrics.transactionValue)}
              note="Đã hoàn tất"
              emphasized
            />
          </div>
        </section>

        {/* ATTENTION SECTION */}
        <section className="mb-10 lg:mb-12">
          <h2 className="mb-5 font-mono text-[13px] sm:text-[15px] font-bold uppercase tracking-widest text-neutral-900">Cần xử lý</h2>
          {!hasAttentionItems ? (
            <div className="border border-neutral-200 bg-white p-6 shadow-sm">
              <p className="text-[14px] text-neutral-600">Hiện không có vấn đề nào cần quản trị viên xử lý.</p>
            </div>
          ) : (
            <div className="grid gap-5 xl:gap-6 grid-cols-1 md:grid-cols-2">
              {data.attention.pendingTransactions > 0 && (
                <div className="flex flex-col justify-between border border-amber-200 bg-white p-6 lg:p-7 shadow-sm transition-colors hover:border-amber-400 group min-h-[140px]">
                  <div>
                    <span className="font-mono text-[40px] lg:text-[48px] font-bold tracking-tight leading-none text-amber-600 tabular-nums">{data.attention.pendingTransactions}</span>
                    <p className="mt-4 text-[14px] lg:text-[15px] font-semibold text-neutral-900">Thanh toán đang tạm giữ</p>
                  </div>
                  <Link href="/admin/transactions?paymentState=held" className="mt-6 inline-block font-mono text-[12px] font-bold uppercase tracking-widest text-amber-700 transition-colors group-hover:text-amber-900">
                    Xem giao dịch →
                  </Link>
                </div>
              )}
              {data.attention.processingOrders > 0 && (
                <div className="flex flex-col justify-between border border-blue-200 bg-white p-6 lg:p-7 shadow-sm transition-colors hover:border-blue-400 group min-h-[140px]">
                  <div>
                    <span className="font-mono text-[40px] lg:text-[48px] font-bold tracking-tight leading-none text-blue-600 tabular-nums">{data.attention.processingOrders}</span>
                    <p className="mt-4 text-[14px] lg:text-[15px] font-semibold text-neutral-900">Đơn hàng đang xử lý</p>
                  </div>
                  <Link href="/admin/orders?orderStatus=processing" className="mt-6 inline-block font-mono text-[12px] font-bold uppercase tracking-widest text-blue-700 transition-colors group-hover:text-blue-900">
                    Xem đơn hàng →
                  </Link>
                </div>
              )}
              {data.attention.failedPayments > 0 && (
                <div className="flex flex-col justify-between border border-red-200 bg-white p-6 lg:p-7 shadow-sm transition-colors hover:border-red-400 group min-h-[140px]">
                  <div>
                    <span className="font-mono text-[40px] lg:text-[48px] font-bold tracking-tight leading-none text-red-600 tabular-nums">{data.attention.failedPayments}</span>
                    <p className="mt-4 text-[14px] lg:text-[15px] font-semibold text-neutral-900">Thanh toán thất bại</p>
                  </div>
                  <Link href="/admin/transactions?paymentState=failed" className="mt-6 inline-block font-mono text-[12px] font-bold uppercase tracking-widest text-red-700 transition-colors group-hover:text-red-900">
                    Kiểm tra ngay →
                  </Link>
                </div>
              )}
              {data.attention.cancellationRequests > 0 && (
                <div className="flex flex-col justify-between border border-amber-200 bg-white p-6 lg:p-7 shadow-sm transition-colors hover:border-amber-400 group min-h-[140px]">
                  <div>
                    <span className="font-mono text-[40px] lg:text-[48px] font-bold tracking-tight leading-none text-amber-600 tabular-nums">{data.attention.cancellationRequests}</span>
                    <p className="mt-4 text-[14px] lg:text-[15px] font-semibold text-neutral-900">Yêu cầu hủy đơn</p>
                  </div>
                  <Link href="/admin/orders?orderStatus=cancelled" className="mt-6 inline-block font-mono text-[12px] font-bold uppercase tracking-widest text-amber-700 transition-colors group-hover:text-amber-900">
                    Xem đơn hàng →
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* TRANSACTION STATUS OVERVIEW */}
        <section className="mb-14 xl:mb-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="mb-6 font-mono text-[14px] sm:text-[16px] font-bold uppercase tracking-widest text-neutral-900">Tình trạng giao dịch</h2>
            <Link href="/admin/transactions" className="font-mono text-[12px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-900">Xem tất cả →</Link>
          </div>
          <div className="border border-neutral-200 bg-white p-7 sm:p-9 shadow-sm">
            <div className="flex flex-col gap-6 sm:gap-7">
              {[
                { label: 'Chờ xử lý', key: 'pending', count: data.transactionStatuses.pending, color: 'bg-amber-400' },
                { label: 'Đang xử lý', key: 'processing', count: data.transactionStatuses.processing, color: 'bg-blue-500' },
                { label: 'Hoàn tất', key: 'completed', count: data.transactionStatuses.completed, color: 'bg-emerald-500' },
                { label: 'Đã hủy', key: 'cancelled', count: data.transactionStatuses.cancelled, color: 'bg-red-500' },
              ].map((status) => {
                const total = data.metrics.totalOrders;
                const percentage = total > 0 ? Math.round((status.count / total) * 100) : 0;
                return (
                  <div key={status.key} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] lg:grid-cols-[160px_110px_70px_minmax(0,1fr)] items-center gap-3 sm:gap-5">
                    <span className="text-[14px] sm:text-[15px] font-semibold text-neutral-900">{status.label}</span>
                    <span className="hidden md:inline-block font-mono text-[14px] font-medium text-neutral-600 text-right tabular-nums">{status.count.toLocaleString('vi-VN')} giao dịch</span>
                    <span className="hidden md:inline-block font-mono text-[14px] font-bold text-neutral-900 text-right tabular-nums">{percentage}%</span>

                    {/* Mobile fallback text below label */}
                    <div className="md:hidden flex justify-between items-center w-full mb-1">
                       <span className="font-mono text-[13px] font-medium text-neutral-600 tabular-nums">{status.count.toLocaleString('vi-VN')} giao dịch</span>
                       <span className="font-mono text-[13px] font-bold text-neutral-900 tabular-nums">{percentage}%</span>
                    </div>

                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-100 flex-1">
                      <div className={`absolute top-0 bottom-0 left-0 ${status.color} transition-all duration-500 ease-out-expo`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* TWO COLUMNS: RECENT ORDERS & TRANSACTIONS */}
        <div className="mb-14 xl:mb-16 grid gap-8 xl:gap-10 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] items-start">
          {/* RECENT ORDERS */}
          <section className={`flex flex-col min-w-0 ${data.recentTransactions.length === 0 ? 'lg:col-span-2' : ''}`}>
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-mono text-[14px] sm:text-[16px] font-bold uppercase tracking-widest text-neutral-900">Đơn hàng gần đây</h2>
              <Link href="/admin/orders" className="font-mono text-[12px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-900">Xem tất cả →</Link>
            </div>
            <div className="flex flex-col border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {data.recentOrders.length === 0 ? (
                  <div className="p-12 text-center text-[15px] text-neutral-500">Chưa có đơn hàng nào trên hệ thống.</div>
                ) : (
                  <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead className="bg-neutral-50 font-mono text-[12px] sm:text-[13px] uppercase tracking-widest text-neutral-500 border-b border-neutral-200">
                      <tr>
                        <th className="px-6 py-5 font-semibold">Mã đơn</th>
                        <th className="px-6 py-5 font-semibold">Khách hàng</th>
                        <th className="px-6 py-5 font-semibold text-right">Tổng tiền</th>
                        <th className="px-6 py-5 font-semibold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {data.recentOrders.map((o) => (
                        <tr key={o.id} className="text-[14px] sm:text-[15px] transition-colors hover:bg-neutral-50/80 group">
                          <td className="px-6 py-5">
                            <Link href={`/admin/orders?search=${o.id}`} className="font-mono font-bold text-neutral-900 transition-colors group-hover:text-blue-600">
                              {o.order_code}
                            </Link>
                            {o.seller_count > 1 ? (
                              <p className="mt-2 font-mono text-[12px] text-neutral-500">{o.seller_count} người bán</p>
                            ) : (
                              <p className="mt-2 font-mono text-[12px] text-neutral-500">1 người bán</p>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-semibold text-neutral-900 truncate max-w-[200px]" title={o.buyer_name}>{o.buyer_name}</p>
                          </td>
                          <td className="px-6 py-5 text-right font-mono font-bold tabular-nums text-neutral-900">{formatVND(o.total_amount)}</td>
                          <td className="px-6 py-5"><AdminStatusBadge status={o.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          {/* RECENT TRANSACTIONS */}
          {data.recentTransactions.length > 0 && (
            <section className="flex flex-col min-w-0">
              <div className="mb-6 flex items-end justify-between">
                <h2 className="font-mono text-[14px] sm:text-[16px] font-bold uppercase tracking-widest text-neutral-900">Thanh toán gần đây</h2>
                <Link href="/admin/transactions" className="font-mono text-[12px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-900">Xem tất cả →</Link>
              </div>
              <div className="flex flex-col border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] border-collapse text-left">
                    <thead className="bg-neutral-50 font-mono text-[12px] sm:text-[13px] uppercase tracking-widest text-neutral-500 border-b border-neutral-200">
                      <tr>
                        <th className="px-6 py-5 font-semibold">Giao dịch</th>
                        <th className="px-6 py-5 font-semibold">Phương thức</th>
                        <th className="px-6 py-5 font-semibold text-right">Số tiền</th>
                        <th className="px-6 py-5 font-semibold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {data.recentTransactions.map((t) => (
                        <tr key={t.id} className="text-[14px] sm:text-[15px] transition-colors hover:bg-neutral-50/80 group">
                          <td className="px-6 py-5">
                            <Link href={`/admin/transactions?search=${t.order_id}`} className="font-mono font-bold text-neutral-900 transition-colors group-hover:text-blue-600">
                              {t.order_code}
                            </Link>
                          </td>
                          <td className="px-6 py-5 text-[13px] font-medium text-neutral-600">{methodLabel(t.payment_method)}</td>
                          <td className="px-6 py-5 text-right font-mono font-bold tabular-nums text-neutral-900">{formatVND(t.amount)}</td>
                          <td className="px-6 py-5"><AdminStatusBadge status={t.state} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* BOTTOM SECTION */}
        <div className="grid gap-8 xl:gap-10 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] items-start">
          {/* MARKETPLACE ACTIVITY & EMPTY PAYMENT FALLBACK */}
          <div className="flex flex-col gap-8 xl:gap-10 min-w-0">
            {data.recentTransactions.length === 0 && (
              <section className="flex flex-col min-w-0">
                <div className="border border-neutral-200 bg-white p-8 xl:p-10 flex items-center justify-between shadow-sm min-h-[90px] xl:min-h-[110px]">
                  <h2 className="font-mono text-[14px] sm:text-[16px] font-bold uppercase tracking-widest text-neutral-900">Thanh toán gần đây</h2>
                  <p className="text-[14px] sm:text-[15px] text-neutral-500 italic">Chưa có bản ghi thanh toán.</p>
                </div>
              </section>
            )}

            <section className="flex flex-col min-w-0">
              <h2 className="mb-6 font-mono text-[14px] sm:text-[16px] font-bold uppercase tracking-widest text-neutral-900 flex items-center">
                Hoạt động sàn <span className="text-neutral-500 font-medium ml-3 tracking-normal lowercase">(Trong 7 ngày)</span>
              </h2>
              <div className="grid gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3 shadow-sm">
                <div className="bg-white p-7 xl:p-8 flex flex-col justify-between min-h-[140px] xl:min-h-[150px]">
                  <p className="font-mono text-[12px] uppercase tracking-widest text-neutral-500">Sản phẩm mới</p>
                  <p className="mt-5 font-mono text-[34px] lg:text-[40px] font-bold tracking-tight tabular-nums text-neutral-900">+{data.marketplaceActivity.newProducts7d.toLocaleString('vi-VN')}</p>
                </div>
                <div className="bg-white p-7 xl:p-8 flex flex-col justify-between min-h-[140px] xl:min-h-[150px]">
                  <p className="font-mono text-[12px] uppercase tracking-widest text-neutral-500">Người bán mới</p>
                  <p className="mt-5 font-mono text-[34px] lg:text-[40px] font-bold tracking-tight tabular-nums text-neutral-900">+{data.marketplaceActivity.newSellers7d.toLocaleString('vi-VN')}</p>
                </div>
                <div className="bg-white p-7 xl:p-8 flex flex-col justify-between min-h-[140px] xl:min-h-[150px]">
                  <p className="font-mono text-[12px] uppercase tracking-widest text-neutral-500">Đơn hoàn tất</p>
                  <p className="mt-5 font-mono text-[34px] lg:text-[40px] font-bold tracking-tight tabular-nums text-emerald-600">+{data.marketplaceActivity.completedOrders7d.toLocaleString('vi-VN')}</p>
                </div>
              </div>
            </section>
          </div>

          {/* QUICK ACTIONS */}
          <section className="flex flex-col min-w-0">
            <h2 className="mb-6 font-mono text-[14px] sm:text-[16px] font-bold uppercase tracking-widest text-neutral-900">Truy cập nhanh</h2>
            <div className="flex flex-col gap-4">
              <Link href="/admin/transactions" className="inline-flex items-center justify-center min-h-[60px] bg-neutral-900 px-8 font-mono text-[13px] sm:text-[14px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800 shadow-sm">
                Quản lý giao dịch
              </Link>
              <Link href="/admin/orders" className="inline-flex items-center justify-center min-h-[60px] border border-neutral-300 bg-white px-8 font-mono text-[13px] sm:text-[14px] font-bold uppercase tracking-widest text-neutral-900 transition-colors hover:border-neutral-900 hover:bg-neutral-50 shadow-sm">
                Quản lý đơn hàng
              </Link>
              <Link href="/" className="mt-2 inline-flex items-center justify-center min-h-[50px] px-8 font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-600 transition-colors hover:text-neutral-900">
                Xem trang chủ sàn →
              </Link>
            </div>
          </section>
        </div>
      </AdminPageShell>
    </div>
  );
}