'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { formatVND, formatVietnamDateTime } from '../../lib/format';
import { AdminOverviewData, getAdminOverview } from '../../lib/adminOverview';
import { Button } from '../ui/Button';
import { AdminContainer } from './AdminContainer';

const statusLabel = (value: string | null | undefined) => {
  const labels: Record<string, string> = {
    pending: 'Chờ xử lý',
    processing: 'Đang xử lý',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
    held: 'Đang tạm giữ',
    released: 'Đã giải ngân',
    failed: 'Thất bại',
    disputed: 'Đang tranh chấp',
  };
  if (value === ['re', 'funded'].join('')) return 'Đã hoàn lại';
  return value ? labels[value] || value.replaceAll('_', ' ') : 'Không áp dụng';
};

const methodLabel = (value: string | null | undefined) => {
  if (!value) return 'Không áp dụng';
  return {
    simulated_card: 'Thẻ',
    cod: 'COD',
    bank_transfer: 'Chuyển khoản',
  }[value] || value.replaceAll('_', ' ');
};

const badgeClass = (value: string | null | undefined) => {
  if (['completed', 'released'].includes(value || '')) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (['cancelled', 'failed'].includes(value || '')) return 'border-red-200 bg-red-50 text-red-800';
  if (['processing', 'held'].includes(value || '')) return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
};

const StateBadge = ({ value }: { value: string | null | undefined }) => (
  <span className={`inline-flex items-center justify-center border px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wide rounded-sm ${badgeClass(value)}`}>
    {statusLabel(value)}
  </span>
);

const OverviewSkeleton = () => (
  <AdminContainer className="py-8 sm:py-12" >
    <div data-state="skeleton" className="animate-pulse space-y-12" aria-label="Đang tải tổng quan">
      <div className="space-y-4">
        <div className="h-10 w-64 bg-neutral-100" />
        <div className="h-6 w-96 bg-neutral-50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[140px] bg-neutral-50" />
        ))}
      </div>
      <div className="h-40 bg-neutral-50" />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="h-64 bg-neutral-50" />
        <div className="h-64 bg-neutral-50" />
      </div>
    </div>
  </AdminContainer>
);

const MetricCard = ({ label, value, featured = false, note = '', subLabel = '' }: { label: string; value: string | number; featured?: boolean; note?: string; subLabel?: string }) => (
  <article className={`flex flex-col justify-between min-h-[140px] border p-5 sm:p-6 lg:p-7 ${featured ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}>
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className={`font-mono text-[11px] lg:text-xs uppercase tracking-widest leading-snug ${featured ? 'text-neutral-300' : 'text-neutral-500'}`}>{label}</p>
        {subLabel && <span className={`shrink-0 inline-flex items-center justify-center border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest rounded-sm ${featured ? 'border-neutral-700 bg-neutral-800 text-neutral-300' : 'border-neutral-200 bg-neutral-100 text-neutral-500'}`}>{subLabel}</span>}
      </div>
      <p className="mt-4 font-mono text-[clamp(1.75rem,1.5rem+1vw,2.375rem)] leading-none font-bold tracking-tight whitespace-nowrap tabular-nums">{value}</p>
    </div>
    {note && <p className={`mt-4 text-[13px] ${featured ? 'text-neutral-400' : 'text-neutral-500'}`}>{note}</p>}
  </article>
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
      <AdminContainer className="py-20 text-center max-w-lg">
        <div className="border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Khu vực quản trị</p>
          <h1 className="mt-4 font-display text-2xl font-black uppercase tracking-tight">Quyền truy cập bị từ chối</h1>
          <p className="mt-3 mb-7 text-sm leading-6 text-neutral-600">Yêu cầu quyền quản trị viên.</p>
          <Link href={ROUTES.LOGIN} className="inline-flex min-h-11 items-center justify-center bg-neutral-900 px-6 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-800">
            Đăng nhập
          </Link>
        </div>
      </AdminContainer>
    );
  }

  if (error) {
    return (
      <AdminContainer className="py-20 text-center max-w-lg">
        <div className="border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Lỗi hệ thống</p>
          <h1 className="mt-4 font-display text-2xl font-black uppercase tracking-tight">Không thể tải dữ liệu</h1>
          <p className="mt-3 mb-7 text-sm leading-6 text-neutral-600">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="min-w-32 min-h-11 px-6 text-sm font-semibold">Thử lại</Button>
        </div>
      </AdminContainer>
    );
  }

  if (!data) return null;

  const hasAttentionItems = data.attention.pendingTransactions > 0 ||
                            data.attention.processingOrders > 0 ||
                            data.attention.failedPayments > 0 ||
                            data.attention.cancellationRequests > 0;

  return (
    <div className="min-h-screen bg-[#F8F8F7]">
      <AdminContainer className="py-8 pb-20 sm:py-12">
        <header className="mb-10 flex flex-col gap-6 border-b border-neutral-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-neutral-500">Trung tâm điều hành</p>
            <h1 className="mt-3 font-display text-[32px] sm:text-[40px] font-black uppercase tracking-tight leading-tight text-neutral-900">Tổng quan hệ thống</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
              Theo dõi hoạt động mua bán, giao dịch và tình trạng vận hành của StyleHub.
            </p>
          </div>
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-neutral-500 md:text-right shrink-0">
            Cập nhật: {formatVietnamDateTime(data.generatedAt)}
          </p>
        </header>

        {/* KEY METRICS */}
        <section className="mb-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Tổng người dùng" value={data.metrics.totalUsers.toLocaleString('vi-VN')} />
            <MetricCard label="Tổng người bán" value={data.metrics.activeSellers.toLocaleString('vi-VN')} note="Có tài khoản người bán" />
            <MetricCard label="Sản phẩm đang bán" value={data.metrics.activeProducts.toLocaleString('vi-VN')} />
            <MetricCard label="Tổng đơn hàng" value={data.metrics.totalOrders.toLocaleString('vi-VN')} />
            <MetricCard label="Tổng giao dịch" value={data.metrics.totalTransactions.toLocaleString('vi-VN')} />
            <MetricCard
              label="Giá trị đơn hàng"
              subLabel="Hoàn tất"
              value={formatVND(data.metrics.transactionValue)}
              featured
            />
          </div>
        </section>

        {/* ATTENTION SECTION */}
        <section className="mb-12">
          <h2 className="mb-5 font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Cần xử lý</h2>
          {!hasAttentionItems ? (
            <div className="border border-neutral-200 bg-white p-6 shadow-sm">
              <p className="text-[14px] text-neutral-600">Hiện không có vấn đề nào cần quản trị viên xử lý.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.attention.pendingTransactions > 0 && (
                <div className="flex flex-col justify-between border border-amber-200 bg-white p-5 lg:p-6 shadow-sm transition-colors hover:border-amber-400 group">
                  <div>
                    <span className="font-mono text-[32px] lg:text-[40px] font-bold tracking-tight leading-none text-amber-600 tabular-nums">{data.attention.pendingTransactions}</span>
                    <p className="mt-3 text-[14px] font-semibold text-neutral-900">Thanh toán đang tạm giữ</p>
                  </div>
                  <Link href="/admin/transactions?paymentState=held" className="mt-6 inline-block font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700 transition-colors group-hover:text-amber-900">
                    Xem giao dịch →
                  </Link>
                </div>
              )}
              {data.attention.processingOrders > 0 && (
                <div className="flex flex-col justify-between border border-blue-200 bg-white p-5 lg:p-6 shadow-sm transition-colors hover:border-blue-400 group">
                  <div>
                    <span className="font-mono text-[32px] lg:text-[40px] font-bold tracking-tight leading-none text-blue-600 tabular-nums">{data.attention.processingOrders}</span>
                    <p className="mt-3 text-[14px] font-semibold text-neutral-900">Đơn hàng đang xử lý</p>
                  </div>
                  <Link href="/admin/orders?orderStatus=processing" className="mt-6 inline-block font-mono text-[11px] font-bold uppercase tracking-widest text-blue-700 transition-colors group-hover:text-blue-900">
                    Xem đơn hàng →
                  </Link>
                </div>
              )}
              {data.attention.failedPayments > 0 && (
                <div className="flex flex-col justify-between border border-red-200 bg-white p-5 lg:p-6 shadow-sm transition-colors hover:border-red-400 group">
                  <div>
                    <span className="font-mono text-[32px] lg:text-[40px] font-bold tracking-tight leading-none text-red-600 tabular-nums">{data.attention.failedPayments}</span>
                    <p className="mt-3 text-[14px] font-semibold text-neutral-900">Thanh toán thất bại</p>
                  </div>
                  <Link href="/admin/transactions?paymentState=failed" className="mt-6 inline-block font-mono text-[11px] font-bold uppercase tracking-widest text-red-700 transition-colors group-hover:text-red-900">
                    Kiểm tra ngay →
                  </Link>
                </div>
              )}
              {data.attention.cancellationRequests > 0 && (
                <div className="flex flex-col justify-between border border-amber-200 bg-white p-5 lg:p-6 shadow-sm transition-colors hover:border-amber-400 group">
                  <div>
                    <span className="font-mono text-[32px] lg:text-[40px] font-bold tracking-tight leading-none text-amber-600 tabular-nums">{data.attention.cancellationRequests}</span>
                    <p className="mt-3 text-[14px] font-semibold text-neutral-900">Yêu cầu hủy đơn</p>
                  </div>
                  <Link href="/admin/orders?orderStatus=cancelled" className="mt-6 inline-block font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700 transition-colors group-hover:text-amber-900">
                    Xem đơn hàng →
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* TRANSACTION STATUS OVERVIEW */}
        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Tình trạng giao dịch</h2>
            <Link href="/admin/transactions" className="font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-900">Xem tất cả →</Link>
          </div>
          <div className="border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5">
              {[
                { label: 'Chờ xử lý', key: 'pending', count: data.transactionStatuses.pending, color: 'bg-amber-400' },
                { label: 'Đang xử lý', key: 'processing', count: data.transactionStatuses.processing, color: 'bg-blue-500' },
                { label: 'Hoàn tất', key: 'completed', count: data.transactionStatuses.completed, color: 'bg-emerald-500' },
                { label: 'Đã hủy', key: 'cancelled', count: data.transactionStatuses.cancelled, color: 'bg-red-500' },
              ].map((status) => {
                const total = data.metrics.totalTransactions;
                const percentage = total > 0 ? Math.round((status.count / total) * 100) : 0;
                return (
                  <div key={status.key} className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex w-full sm:w-48 items-center justify-between shrink-0">
                      <span className="text-[14px] font-semibold text-neutral-900">{status.label}</span>
                      <div className="text-right">
                        <span className="font-mono text-[13px] font-bold tabular-nums">{status.count.toLocaleString('vi-VN')}</span>
                        <span className="ml-2 font-mono text-xs text-neutral-500 tabular-nums w-8 inline-block text-right">{percentage}%</span>
                      </div>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-100 flex-1">
                      <div className={`absolute top-0 bottom-0 left-0 ${status.color} transition-all duration-500 ease-out-expo`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* TWO COLUMNS: RECENT ORDERS & TRANSACTIONS */}
        <div className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] items-start">
          {/* RECENT ORDERS */}
          <section className="flex flex-col min-w-0">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Đơn hàng gần đây</h2>
              <Link href="/admin/orders" className="font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-900">Xem tất cả →</Link>
            </div>
            <div className="flex flex-col border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {data.recentOrders.length === 0 ? (
                  <div className="p-10 text-center text-[14px] text-neutral-500">Chưa có đơn hàng nào trên hệ thống.</div>
                ) : (
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead className="bg-neutral-50 font-mono text-[11px] uppercase tracking-widest text-neutral-500 border-b border-neutral-200">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Mã đơn</th>
                        <th className="px-5 py-4 font-semibold">Khách hàng</th>
                        <th className="px-5 py-4 font-semibold text-right">Tổng tiền</th>
                        <th className="px-5 py-4 font-semibold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {data.recentOrders.map((o) => (
                        <tr key={o.id} className="text-[13px] transition-colors hover:bg-neutral-50/80 group">
                          <td className="px-5 py-4">
                            <Link href={`/admin/orders?search=${o.id}`} className="font-mono font-bold text-neutral-900 transition-colors group-hover:text-blue-600">
                              {o.order_code}
                            </Link>
                            {o.seller_count > 1 ? (
                              <p className="mt-1.5 font-mono text-[11px] text-neutral-500">{o.seller_count} người bán</p>
                            ) : (
                              <p className="mt-1.5 font-mono text-[11px] text-neutral-500">1 người bán</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-neutral-900 truncate max-w-[160px]" title={o.buyer_name}>{o.buyer_name}</p>
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold tabular-nums text-neutral-900">{formatVND(o.total_amount)}</td>
                          <td className="px-5 py-4"><StateBadge value={o.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          {/* RECENT TRANSACTIONS */}
          <section className="flex flex-col min-w-0">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Thanh toán gần đây</h2>
              {data.recentTransactions.length > 0 && (
                <Link href="/admin/transactions" className="font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-900">Xem tất cả →</Link>
              )}
            </div>
            {data.recentTransactions.length === 0 ? (
              <div className="border border-neutral-200 bg-white p-10 text-center shadow-sm">
                <p className="text-[14px] text-neutral-500">Chưa có bản ghi thanh toán gần đây.</p>
              </div>
            ) : (
              <div className="flex flex-col border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-left">
                    <thead className="bg-neutral-50 font-mono text-[11px] uppercase tracking-widest text-neutral-500 border-b border-neutral-200">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Giao dịch</th>
                        <th className="px-5 py-4 font-semibold">Phương thức</th>
                        <th className="px-5 py-4 font-semibold text-right">Số tiền</th>
                        <th className="px-5 py-4 font-semibold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {data.recentTransactions.map((t) => (
                        <tr key={t.id} className="text-[13px] transition-colors hover:bg-neutral-50/80 group">
                          <td className="px-5 py-4">
                            <Link href={`/admin/transactions?search=${t.order_id}`} className="font-mono font-bold text-neutral-900 transition-colors group-hover:text-blue-600">
                              {t.order_code}
                            </Link>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-neutral-600">{methodLabel(t.payment_method)}</td>
                          <td className="px-5 py-4 text-right font-mono font-bold tabular-nums text-neutral-900">{formatVND(t.amount)}</td>
                          <td className="px-5 py-4"><StateBadge value={t.state} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* BOTTOM METRICS */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] items-start">
          {/* MARKETPLACE ACTIVITY */}
          <section className="flex flex-col min-w-0">
            <h2 className="mb-5 font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900 flex items-center">
              Hoạt động sàn <span className="text-neutral-500 font-medium ml-2 tracking-normal lowercase">(Trong 7 ngày)</span>
            </h2>
            <div className="grid gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3 shadow-sm">
              <div className="bg-white p-6 lg:p-7 flex flex-col justify-between min-h-[120px]">
                <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">Sản phẩm mới</p>
                <p className="mt-4 font-mono text-3xl font-bold tracking-tight tabular-nums text-neutral-900">+{data.marketplaceActivity.newProducts7d.toLocaleString('vi-VN')}</p>
              </div>
              <div className="bg-white p-6 lg:p-7 flex flex-col justify-between min-h-[120px]">
                <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">Người bán mới</p>
                <p className="mt-4 font-mono text-3xl font-bold tracking-tight tabular-nums text-neutral-900">+{data.marketplaceActivity.newSellers7d.toLocaleString('vi-VN')}</p>
              </div>
              <div className="bg-white p-6 lg:p-7 flex flex-col justify-between min-h-[120px]">
                <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">Đơn hoàn tất</p>
                <p className="mt-4 font-mono text-3xl font-bold tracking-tight tabular-nums text-emerald-600">+{data.marketplaceActivity.completedOrders7d.toLocaleString('vi-VN')}</p>
              </div>
            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="flex flex-col min-w-0">
            <h2 className="mb-5 font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Truy cập nhanh</h2>
            <div className="flex flex-col gap-3">
              <Link href="/admin/transactions" className="inline-flex items-center justify-center min-h-14 bg-neutral-900 px-6 font-mono text-[11px] lg:text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800 shadow-sm">
                Quản lý giao dịch
              </Link>
              <Link href="/admin/orders" className="inline-flex items-center justify-center min-h-14 border border-neutral-300 bg-white px-6 font-mono text-[11px] lg:text-xs font-bold uppercase tracking-widest text-neutral-900 transition-colors hover:border-neutral-900 hover:bg-neutral-50 shadow-sm">
                Quản lý đơn hàng
              </Link>
              <Link href="/" className="inline-flex items-center justify-center min-h-14 px-6 font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-600 transition-colors hover:text-neutral-900">
                Xem trang chủ sàn →
              </Link>
            </div>
          </section>
        </div>
      </AdminContainer>
    </div>
  );
}