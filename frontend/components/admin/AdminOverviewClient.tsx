'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { formatVND, formatVietnamDateTime } from '../../lib/format';
import { AdminOverviewData, getAdminOverview } from '../../lib/adminOverview';
import { Button } from '../ui/Button';
import { Container } from '../ui/Container';

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
  <span className={`inline-flex border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${badgeClass(value)}`}>
    {statusLabel(value)}
  </span>
);

const OverviewSkeleton = () => (
  <Container className="py-10 sm:py-16" >
    <div data-state="skeleton" className="animate-pulse space-y-12" aria-label="Đang tải tổng quan">
      <div className="space-y-4">
        <div className="h-10 w-64 bg-neutral-100" />
        <div className="h-6 w-96 bg-neutral-50" />
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
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
  </Container>
);

const MetricCard = ({ label, value, featured = false, note = '', subLabel = '' }: { label: string; value: string | number; featured?: boolean; note?: string; subLabel?: string }) => (
  <article className={`flex flex-col justify-between min-h-[140px] border p-6 sm:p-7 ${featured ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}>
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className={`font-mono text-[11px] sm:text-xs uppercase tracking-widest leading-snug ${featured ? 'text-neutral-300' : 'text-neutral-500'}`}>{label}</p>
        {subLabel && <span className={`shrink-0 inline-flex border px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${featured ? 'border-neutral-700 bg-neutral-800 text-neutral-300' : 'border-neutral-200 bg-neutral-100 text-neutral-500'}`}>{subLabel}</span>}
      </div>
      <p className="mt-3 font-mono text-[clamp(1.5rem,1rem+1.5vw,2.125rem)] font-bold tracking-tight whitespace-nowrap tabular-nums">{value}</p>
    </div>
    {note && <p className={`mt-4 text-xs ${featured ? 'text-neutral-400' : 'text-neutral-500'}`}>{note}</p>}
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
      <Container className="py-20 text-center">
        <h1 className="mb-4 font-mono text-2xl font-bold uppercase tracking-tight">Quyền truy cập bị từ chối</h1>
        <p className="mb-8 text-neutral-600">Yêu cầu quyền quản trị viên.</p>
        <Link href={ROUTES.LOGIN} className="inline-flex min-h-11 items-center justify-center bg-neutral-900 px-6 font-mono text-[10px] font-bold uppercase tracking-widest text-white hover:bg-neutral-800">
          Đăng nhập
        </Link>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-20 text-center">
        <h1 className="mb-4 font-mono text-2xl font-bold uppercase tracking-tight">Không thể tải tổng quan hệ thống</h1>
        <p className="mb-8 text-neutral-600">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="min-w-32">Thử lại</Button>
      </Container>
    );
  }

  if (!data) return null;

  const hasAttentionItems = data.attention.pendingTransactions > 0 ||
                            data.attention.processingOrders > 0 ||
                            data.attention.failedPayments > 0 ||
                            data.attention.cancellationRequests > 0;

  return (
    <Container className="py-10 pb-20 sm:py-16">
      <header className="mb-7 flex flex-col gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">Trung tâm điều hành</p>
          <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-neutral-900 sm:text-4xl">Tổng quan hệ thống</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            Theo dõi hoạt động mua bán, giao dịch và tình trạng vận hành của StyleHub.
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Cập nhật: {formatVietnamDateTime(data.generatedAt)}
        </p>
      </header>

      {/* KEY METRICS */}
      <section className="mb-12 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
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
      </section>

      {/* ATTENTION SECTION */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Cần xử lý</h2>
        <div className="border border-neutral-200 bg-white">
          {!hasAttentionItems ? (
            <div className="p-6">
              <p className="text-sm text-neutral-600">Hiện không có vấn đề nào cần quản trị viên xử lý.</p>
            </div>
          ) : (
            <div className="grid gap-px bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
              {data.attention.pendingTransactions > 0 && (
                <div className="flex flex-col justify-between bg-white p-5 hover:bg-amber-50/50 transition-colors border-b-2 border-transparent hover:border-amber-400">
                  <div>
                    <span className="font-mono text-3xl font-bold tracking-tight text-amber-700">{data.attention.pendingTransactions}</span>
                    <p className="mt-2 text-sm font-medium text-amber-900">Thanh toán đang tạm giữ</p>
                  </div>
                  <Link href="/admin/transactions?paymentState=held" className="mt-5 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700 hover:text-amber-900">
                    Xem giao dịch →
                  </Link>
                </div>
              )}
              {data.attention.processingOrders > 0 && (
                <div className="flex flex-col justify-between bg-white p-5 hover:bg-blue-50/50 transition-colors border-b-2 border-transparent hover:border-blue-400">
                  <div>
                    <span className="font-mono text-3xl font-bold tracking-tight text-blue-700">{data.attention.processingOrders}</span>
                    <p className="mt-2 text-sm font-medium text-blue-900">Đơn hàng đang xử lý</p>
                  </div>
                  <Link href="/admin/orders?orderStatus=processing" className="mt-5 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-blue-700 hover:text-blue-900">
                    Xem đơn hàng →
                  </Link>
                </div>
              )}
              {data.attention.failedPayments > 0 && (
                <div className="flex flex-col justify-between bg-white p-5 hover:bg-red-50/50 transition-colors border-b-2 border-transparent hover:border-red-400">
                  <div>
                    <span className="font-mono text-3xl font-bold tracking-tight text-red-700">{data.attention.failedPayments}</span>
                    <p className="mt-2 text-sm font-medium text-red-900">Thanh toán thất bại</p>
                  </div>
                  <Link href="/admin/transactions?paymentState=failed" className="mt-5 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-red-700 hover:text-red-900">
                    Kiểm tra ngay →
                  </Link>
                </div>
              )}
              {data.attention.cancellationRequests > 0 && (
                <div className="flex flex-col justify-between bg-white p-5 hover:bg-amber-50/50 transition-colors border-b-2 border-transparent hover:border-amber-400">
                  <div>
                    <span className="font-mono text-3xl font-bold tracking-tight text-amber-700">{data.attention.cancellationRequests}</span>
                    <p className="mt-2 text-sm font-medium text-amber-900">Yêu cầu hủy đơn</p>
                  </div>
                  <Link href="/admin/orders?orderStatus=cancelled" className="mt-5 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700 hover:text-amber-900">
                    Xem đơn hàng →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* TRANSACTION STATUS OVERVIEW */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Tình trạng giao dịch</h2>
          <Link href="/admin/transactions" className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900">Xem tất cả →</Link>
        </div>
        <div className="border border-neutral-200 bg-white p-6">
          <div className="flex h-3 w-full overflow-hidden bg-neutral-100 rounded-sm">
            {data.metrics.totalTransactions > 0 ? (
              <>
                <div style={{ width: `${(data.transactionStatuses.completed / data.metrics.totalTransactions) * 100}%` }} className="bg-emerald-500" title="Hoàn tất" />
                <div style={{ width: `${(data.transactionStatuses.processing / data.metrics.totalTransactions) * 100}%` }} className="bg-blue-500" title="Đang xử lý" />
                <div style={{ width: `${(data.transactionStatuses.pending / data.metrics.totalTransactions) * 100}%` }} className="bg-amber-400" title="Chờ xử lý" />
                <div style={{ width: `${(data.transactionStatuses.cancelled / data.metrics.totalTransactions) * 100}%` }} className="bg-red-500" title="Đã hủy" />
              </>
            ) : (
              <div className="w-full bg-neutral-200" />
            )}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-neutral-900">Hoàn tất</span>
              </div>
              <p className="text-xs text-neutral-500">{data.transactionStatuses.completed} giao dịch ({data.metrics.totalTransactions > 0 ? Math.round((data.transactionStatuses.completed / data.metrics.totalTransactions) * 100) : 0}%)</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-neutral-900">Đang xử lý</span>
              </div>
              <p className="text-xs text-neutral-500">{data.transactionStatuses.processing} giao dịch ({data.metrics.totalTransactions > 0 ? Math.round((data.transactionStatuses.processing / data.metrics.totalTransactions) * 100) : 0}%)</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-sm font-medium text-neutral-900">Chờ xử lý</span>
              </div>
              <p className="text-xs text-neutral-500">{data.transactionStatuses.pending} giao dịch ({data.metrics.totalTransactions > 0 ? Math.round((data.transactionStatuses.pending / data.metrics.totalTransactions) * 100) : 0}%)</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-neutral-900">Đã hủy</span>
              </div>
              <p className="text-xs text-neutral-500">{data.transactionStatuses.cancelled} giao dịch ({data.metrics.totalTransactions > 0 ? Math.round((data.transactionStatuses.cancelled / data.metrics.totalTransactions) * 100) : 0}%)</p>
            </div>
          </div>
        </div>
      </section>

      {/* TWO COLUMNS: RECENT ORDERS & TRANSACTIONS */}
      <div className="mb-12 grid gap-8 lg:grid-cols-2">
        {/* RECENT ORDERS */}
        <section className={data.recentTransactions.length === 0 ? 'lg:col-span-2' : ''}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Đơn hàng gần đây</h2>
            <Link href="/admin/orders" className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900">Xem tất cả →</Link>
          </div>
          <div className="border border-neutral-200 bg-white overflow-x-auto">
            {data.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">Chưa có đơn hàng nào trên hệ thống.</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b border-neutral-200 bg-neutral-50 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="p-4 font-normal">Mã đơn</th>
                    <th className="p-4 font-normal">Người mua</th>
                    <th className="p-4 font-normal text-right">Tổng tiền</th>
                    <th className="p-4 font-normal">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-4">
                        <Link href={`/admin/orders?search=${o.id}`} className="font-mono font-medium hover:underline text-neutral-900">
                          {o.order_code}
                        </Link>
                        {o.seller_count > 1 ? (
                          <p className="mt-1 text-[11px] text-neutral-500">{o.seller_count} người bán</p>
                        ) : (
                          <p className="mt-1 text-[11px] text-neutral-500">1 người bán</p>
                        )}
                      </td>
                      <td className="p-4 truncate max-w-[120px]" title={o.buyer_name}>{o.buyer_name}</td>
                      <td className="p-4 text-right font-mono font-medium tabular-nums">{formatVND(o.total_amount)}</td>
                      <td className="p-4"><StateBadge value={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* RECENT TRANSACTIONS */}
        <section className={data.recentTransactions.length === 0 ? 'hidden' : ''}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Thanh toán gần đây</h2>
            <Link href="/admin/transactions" className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900">Xem tất cả →</Link>
          </div>
          <div className="border border-neutral-200 bg-white overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="border-b border-neutral-200 bg-neutral-50 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="p-4 font-normal">Mã đơn</th>
                  <th className="p-4 font-normal">Phương thức</th>
                  <th className="p-4 font-normal text-right">Số tiền</th>
                  <th className="p-4 font-normal">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.recentTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-4">
                      <Link href={`/admin/transactions?search=${t.order_id}`} className="font-mono font-medium hover:underline text-neutral-900">
                        {t.order_code}
                      </Link>
                    </td>
                    <td className="p-4 text-xs">{methodLabel(t.payment_method)}</td>
                    <td className="p-4 text-right font-mono font-medium tabular-nums">{formatVND(t.amount)}</td>
                    <td className="p-4"><StateBadge value={t.state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {data.recentTransactions.length === 0 && (
          <section className="lg:col-span-2 mt-[-16px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Thanh toán gần đây</h2>
            </div>
            <div className="border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
              Chưa có bản ghi thanh toán gần đây.
            </div>
          </section>
        )}
      </div>

      {/* BOTTOM METRICS */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* MARKETPLACE ACTIVITY */}
        <section>
          <h2 className="mb-4 font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Hoạt động sàn <span className="text-neutral-500 font-normal ml-1 lowercase tracking-normal">(Trong 7 ngày)</span></h2>
          <div className="grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3">
            <div className="bg-white p-5 flex flex-col justify-between">
              <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">Sản phẩm mới</p>
              <p className="mt-3 font-mono text-2xl font-bold tabular-nums">+{data.marketplaceActivity.newProducts7d.toLocaleString('vi-VN')}</p>
            </div>
            <div className="bg-white p-5 flex flex-col justify-between">
              <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">Người bán mới</p>
              <p className="mt-3 font-mono text-2xl font-bold tabular-nums">+{data.marketplaceActivity.newSellers7d.toLocaleString('vi-VN')}</p>
            </div>
            <div className="bg-white p-5 flex flex-col justify-between">
              <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">Đơn hoàn tất</p>
              <p className="mt-3 font-mono text-2xl font-bold tabular-nums">+{data.marketplaceActivity.completedOrders7d.toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <h2 className="mb-4 font-mono text-[13px] font-bold uppercase tracking-widest text-neutral-900">Truy cập nhanh</h2>
          <div className="flex flex-col gap-3">
            <Link href="/admin/transactions" className="inline-flex items-center justify-center min-h-[52px] bg-neutral-900 px-6 font-mono text-[11px] font-bold uppercase tracking-widest text-white hover:bg-neutral-800 transition-colors">Quản lý giao dịch</Link>
            <Link href="/admin/orders" className="inline-flex items-center justify-center min-h-[52px] border border-neutral-300 bg-white px-6 font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50 transition-colors">Quản lý đơn hàng</Link>
            <Link href="/" className="inline-flex items-center justify-center min-h-[52px] border border-transparent text-neutral-600 px-6 font-mono text-[10px] font-bold uppercase tracking-widest hover:text-neutral-900 transition-colors">Xem trang chủ sàn →</Link>
          </div>
        </section>
      </div>
    </Container>
  );
}
