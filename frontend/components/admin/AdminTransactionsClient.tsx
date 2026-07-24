'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { formatVND, formatVietnamDateTime } from '../../lib/format';
import {
  AdminTransactionAction,
  AdminTransactionApiError,
  AdminTransactionDetail,
  AdminTransactionFilters,
  AdminTransactionMeta,
  AdminTransactionRow,
  AdminTransactionSummary,
  getAdminTransaction,
  getAdminTransactionSummary,
  listAdminTransactions,
  runAdminTransactionAction,
} from '../../lib/adminTransactions';
import { Button } from '../ui/Button';
import { AdminContainer } from './AdminContainer';

const DEFAULT_FILTERS: AdminTransactionFilters = {
  page: 1,
  pageSize: 20,
  search: '',
  orderStatus: '',
  paymentState: '',
  paymentMethod: '',
  dateFrom: '',
  dateTo: '',
  sort: 'created_at',
  direction: 'desc',
};

const statusLabel = (value: string | null | undefined, method?: string | null | undefined) => {
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

  if (value) {
    return labels[value] || value.replaceAll('_', ' ');
  }

  if (method === 'cod') {
    return 'Chưa thu tiền';
  }

  if (method === 'bank_transfer') {
    return 'Chưa ghi nhận';
  }

  if (!method) {
    return 'Chưa có bản ghi';
  }

  return 'Chưa xác định';
};

const methodLabel = (value: string | null | undefined) => {
  if (!value) return 'Không áp dụng';
  return {
    simulated_card: 'Thẻ mô phỏng',
    cod: 'Thanh toán khi nhận hàng',
    bank_transfer: 'Chuyển khoản',
  }[value] || value.replaceAll('_', ' ');
};

const badgeClass = (value: string | null | undefined, method?: string | null | undefined) => {
  if (['completed', 'released'].includes(value || '')) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (['cancelled', 'failed'].includes(value || '')) return 'border-red-200 bg-red-50 text-red-800';
  if (['processing', 'held'].includes(value || '')) return 'border-blue-200 bg-blue-50 text-blue-800';

  if (value === 'pending' || (!value && ['cod', 'bank_transfer'].includes(method || ''))) {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  return 'border-neutral-200 bg-neutral-50 text-neutral-600';
};

const StateBadge = ({ value, method }: { value: string | null | undefined, method?: string | null | undefined }) => (
  <span className={`inline-flex items-center justify-center border px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wide rounded-sm ${badgeClass(value, method)}`}>
    {statusLabel(value, method)}
  </span>
);

const TransactionSkeleton = () => (
  <AdminContainer className="py-8 sm:py-12" >
    <div data-state="skeleton" className="animate-pulse space-y-8" aria-label="Đang tải giao dịch">
      <div className="h-24 max-w-2xl bg-neutral-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 bg-neutral-100" />)}
      </div>
      <div className="h-40 bg-neutral-100" />
      <div className="h-96 bg-neutral-100" />
    </div>
  </AdminContainer>
);

const EmptyAccess = ({ adminOnly = false }: { adminOnly?: boolean }) => (
  <AdminContainer className="max-w-lg py-20">
    <section data-state={adminOnly ? 'unauthorized' : 'login-required'} className="border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Khu vực quản trị</p>
      <h1 className="mt-4 font-display text-2xl font-black uppercase tracking-tight">
        {adminOnly ? 'Truy cập bị từ chối' : 'Đăng nhập để tiếp tục'}
      </h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        {adminOnly ? 'Tài khoản hiện tại không có quyền quản trị giao dịch.' : 'Trang này chỉ dành cho quản trị viên StyleHub.'}
      </p>
      <Link href={adminOnly ? ROUTES.HOME : `${ROUTES.LOGIN}?redirect=${ROUTES.ADMIN_TRANSACTIONS}`} className="mt-7 inline-flex min-h-11 items-center justify-center bg-neutral-900 px-6 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-800">
        {adminOnly ? 'Về trang chủ' : 'Đăng nhập'}
      </Link>
    </section>
  </AdminContainer>
);

const SummaryCard = ({ label, value, note, featured = false }: { label: string; value: string | number; note: string; featured?: boolean }) => (
  <article className={`flex min-h-[140px] flex-col justify-between border p-5 lg:p-6 ${featured ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}>
    <h3 className={`font-mono text-[11px] lg:text-xs uppercase tracking-widest ${featured ? 'text-neutral-300' : 'text-neutral-500'}`}>{label}</h3>
    <div className="mt-4">
      <p className="font-mono text-3xl lg:text-[34px] font-bold tracking-tight tabular-nums leading-none">{value}</p>
      <p className={`mt-3 text-[13px] ${featured ? 'text-neutral-300' : 'text-neutral-500'}`}>{note}</p>
    </div>
  </article>
);

const Filters = ({ values, onChange, onSubmit, onReset }: {
  values: AdminTransactionFilters;
  onChange: (key: keyof AdminTransactionFilters, value: string | number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
}) => (
  <form onSubmit={onSubmit} className="border border-neutral-200 bg-neutral-50 p-5 lg:p-6 shadow-sm">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
      <label className="sm:col-span-2 lg:col-span-4">
        <span className="mb-2 block font-mono text-[11px] lg:text-xs uppercase tracking-widest text-neutral-500">Tìm kiếm</span>
        <input value={values.search || ''} onChange={(e) => onChange('search', e.target.value)} placeholder="Mã đơn, email hoặc UUID" className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-[13px] lg:text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
      </label>
      <label className="lg:col-span-2">
        <span className="mb-2 block font-mono text-[11px] lg:text-xs uppercase tracking-widest text-neutral-500">Trạng thái đơn</span>
        <select value={values.orderStatus || ''} onChange={(e) => onChange('orderStatus', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-[13px] lg:text-sm outline-none focus:border-neutral-900">
          <option value="">Tất cả</option><option value="pending">Chờ xử lý</option><option value="processing">Đang xử lý</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option>
        </select>
      </label>
      <label className="lg:col-span-2">
        <span className="mb-2 block font-mono text-[11px] lg:text-xs uppercase tracking-widest text-neutral-500">Thanh toán</span>
        <select value={values.paymentState || ''} onChange={(e) => onChange('paymentState', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-[13px] lg:text-sm outline-none focus:border-neutral-900">
          <option value="">Tất cả</option><option value="pending">Chờ xử lý</option><option value="held">Đang tạm giữ</option><option value="released">Đã giải ngân</option><option value="failed">Thất bại</option><option value={['re', 'funded'].join('')}>Đã hoàn lại</option><option value="disputed">Đang tranh chấp</option>
        </select>
      </label>
      <label className="lg:col-span-2">
        <span className="mb-2 block font-mono text-[11px] lg:text-xs uppercase tracking-widest text-neutral-500">Phương thức</span>
        <select value={values.paymentMethod || ''} onChange={(e) => onChange('paymentMethod', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-[13px] lg:text-sm outline-none focus:border-neutral-900">
          <option value="">Tất cả</option><option value="simulated_card">Thẻ mô phỏng</option><option value="cod">Khi nhận hàng</option><option value="bank_transfer">Chuyển khoản</option>
        </select>
      </label>
      <label className="lg:col-span-2">
        <span className="mb-2 block font-mono text-[11px] lg:text-xs uppercase tracking-widest text-neutral-500">Sắp xếp</span>
        <select value={`${values.sort}:${values.direction}`} onChange={(e) => { const [sort, direction] = e.target.value.split(':'); onChange('sort', sort); onChange('direction', direction); }} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-[13px] lg:text-sm outline-none focus:border-neutral-900">
          <option value="created_at:desc">Mới nhất</option><option value="created_at:asc">Cũ nhất</option><option value="total_amount:desc">Giá trị cao nhất</option><option value="total_amount:asc">Giá trị thấp nhất</option>
        </select>
      </label>
    </div>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
      <div className="flex gap-4 sm:grid-cols-2 lg:w-1/2">
        <label className="flex-1">
          <span className="mb-2 block font-mono text-[11px] lg:text-xs uppercase tracking-widest text-neutral-500">Từ ngày</span>
          <input type="date" value={values.dateFrom || ''} onChange={(e) => onChange('dateFrom', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-[13px] lg:text-sm outline-none focus:border-neutral-900" />
        </label>
        <label className="flex-1">
          <span className="mb-2 block font-mono text-[11px] lg:text-xs uppercase tracking-widest text-neutral-500">Đến ngày</span>
          <input type="date" value={values.dateTo || ''} onChange={(e) => onChange('dateTo', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-[13px] lg:text-sm outline-none focus:border-neutral-900" />
        </label>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="min-h-11 px-6 text-sm" onClick={onReset}>Đặt lại</Button>
        <Button type="submit" className="min-h-11 px-6 text-sm">Áp dụng bộ lọc</Button>
      </div>
    </div>
  </form>
);

const TransactionTable = ({
  rows,
  selectedId,
  onSelect,
  meta,
  onPageChange
}: {
  rows: AdminTransactionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  meta: AdminTransactionMeta | null;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex flex-col border border-neutral-200 bg-white shadow-sm overflow-hidden">
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead className="bg-neutral-50 font-mono text-[11px] lg:text-xs uppercase tracking-widest text-neutral-500 border-b border-neutral-200">
          <tr>
            <th className="px-5 py-4 font-semibold">Giao dịch</th>
            <th className="px-5 py-4 font-semibold">Khách hàng</th>
            <th className="px-5 py-4 font-semibold">Giá trị</th>
            <th className="px-5 py-4 font-semibold">Thanh toán</th>
            <th className="px-5 py-4 font-semibold">Đơn hàng</th>
            <th className="px-5 py-4 font-semibold">Thời gian</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row.id)}
              className={`cursor-pointer text-[13px] lg:text-sm transition-colors hover:bg-neutral-50 focus-visible:outline-neutral-900 ${selectedId === row.id ? 'bg-neutral-50 border-l-[3px] border-l-neutral-900' : 'border-l-[3px] border-l-transparent'}`}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(row.id); }}
            >
              <td className="px-5 py-4">
                <p className="font-mono text-[13px] font-bold text-neutral-900">{row.order_code}</p>
                <p className="mt-1.5 max-w-[160px] truncate font-mono text-[11px] text-neutral-400" title={row.payment_id || row.order_id}>{row.payment_id || row.order_id}</p>
              </td>
              <td className="px-5 py-4">
                <p className="font-semibold text-neutral-900">{row.buyer?.full_name || 'Khách hàng'}</p>
                <p className="mt-1.5 text-xs text-neutral-500">{row.buyer?.email || '—'}</p>
              </td>
              <td className="px-5 py-4 font-mono font-bold tabular-nums text-neutral-900">{formatVND(row.total_amount)}</td>
              <td className="px-5 py-4">
                <StateBadge value={row.payment_state} method={row.payment_method} />
                <p className="mt-2.5 text-xs text-neutral-500">{methodLabel(row.payment_method)}</p>
              </td>
              <td className="px-5 py-4"><StateBadge value={row.order_status} /></td>
              <td className="px-5 py-4 text-xs text-neutral-500 tabular-nums">{formatVietnamDateTime(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="md:hidden flex flex-col divide-y divide-neutral-200">
      {rows.map((row) => (
        <button key={row.id} type="button" onClick={() => onSelect(row.id)} className={`w-full p-5 text-left transition-colors hover:bg-neutral-50 ${selectedId === row.id ? 'bg-neutral-50 border-l-[3px] border-l-neutral-900' : 'border-l-[3px] border-l-transparent'}`}>
          <div className="flex items-start justify-between gap-4">
            <span className="font-mono text-sm font-bold text-neutral-900">{row.order_code}</span>
            <span className="font-mono text-sm font-bold tabular-nums text-neutral-900">{formatVND(row.total_amount)}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-neutral-800">{row.buyer?.full_name || row.buyer?.email || 'Khách hàng'}</p>
          <div className="mt-4 flex flex-wrap gap-2"><StateBadge value={row.order_status} /><StateBadge value={row.payment_state} method={row.payment_method} /></div>
          <p className="mt-3 text-xs text-neutral-500 tabular-nums">{methodLabel(row.payment_method)} · {formatVietnamDateTime(row.created_at)}</p>
        </button>
      ))}
    </div>

    {/* Table Footer Pagination */}
    <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-5 py-4">
      <p className="text-[13px] text-neutral-600 font-medium">
        {meta ? `Hiển thị ${(meta.page - 1) * meta.pageSize + (rows.length > 0 ? 1 : 0)}–${(meta.page - 1) * meta.pageSize + rows.length} trong ${meta.total} giao dịch` : 'Không có dữ liệu'}
      </p>
      {meta && meta.totalPages > 1 && (
        <nav className="flex items-center gap-4" aria-label="Phân trang giao dịch">
          <Button type="button" size="sm" variant="outline" className="min-h-10 px-4" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>Trang trước</Button>
          <span className="font-mono text-xs text-neutral-600 tabular-nums font-medium">
            Trang {meta.page} / {meta.totalPages}
          </span>
          <Button type="button" size="sm" variant="outline" className="min-h-10 px-4" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>Trang sau</Button>
        </nav>
      )}
    </div>
  </div>
);

const DetailPanel = ({ detail, loading, action, reason, submitting, actionError, onAction, onReason, onCancel, onSubmit }: {
  detail: AdminTransactionDetail | null;
  loading: boolean;
  action: AdminTransactionAction | null;
  reason: string;
  submitting: boolean;
  actionError: string | null;
  onAction: (action: AdminTransactionAction) => void;
  onReason: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) => {
  if (loading) return (
    <aside className="self-start sticky top-8 w-full border border-neutral-200 bg-white p-8 shadow-sm" aria-live="polite">
      <p className="font-mono text-xs font-medium uppercase tracking-widest text-neutral-500">Đang tải chi tiết…</p>
    </aside>
  );

  if (!detail) return (
    <aside className="self-start sticky top-8 w-full border border-dashed border-neutral-300 bg-neutral-50/50 p-10 text-center shadow-sm">
      <h3 className="font-display text-base font-bold uppercase tracking-tight text-neutral-900">CHƯA CHỌN GIAO DỊCH</h3>
      <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">Chọn một giao dịch trong danh sách để xem thông tin đối soát, thanh toán và lịch sử xử lý.</p>
    </aside>
  );

  const needsReason = action === 'completed' || action === 'cancelled';

  return (
    <aside className="self-start sticky top-8 w-full border border-neutral-900 bg-white shadow-sm overflow-hidden" aria-label="Chi tiết giao dịch">
      <div className="bg-neutral-900 p-6 text-white">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">Chi tiết giao dịch</p>
        <h2 className="mt-3 font-mono text-xl font-bold tracking-tight">{detail.order.order_code}</h2>
        <p className="mt-2 break-all font-mono text-[11px] text-neutral-400 opacity-80">{detail.id}</p>
      </div>
      <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
        <div className="space-y-7 p-6">
          <section>
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-500">Tổng quan</h3>
            <dl className="mt-4 grid grid-cols-2 gap-y-5 gap-x-4 text-[13px]">
              <div><dt className="text-xs text-neutral-500 mb-1.5">Đơn hàng</dt><dd><StateBadge value={detail.order.status} /></dd></div>
              <div><dt className="text-xs text-neutral-500 mb-1.5">Thanh toán</dt><dd><StateBadge value={detail.payment?.state || null} method={detail.payment?.method || null} /></dd></div>
              <div className="col-span-2 sm:col-span-1"><dt className="text-xs text-neutral-500 mb-1.5">Khách hàng</dt><dd className="font-semibold text-neutral-900">{detail.buyer?.full_name || 'Khách hàng'}</dd></div>
              <div className="col-span-2 sm:col-span-1"><dt className="text-xs text-neutral-500 mb-1.5">Tổng tiền</dt><dd className="font-mono text-sm font-bold tabular-nums">{formatVND(detail.order.total_amount)}</dd></div>
            </dl>
          </section>

          {detail.payment && (
            <section className="border-t border-neutral-200 pt-6">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-500">Thanh toán an toàn</h3>
              <dl className="mt-4 grid grid-cols-2 gap-y-5 gap-x-4 text-[13px]">
                <div><dt className="text-xs text-neutral-500 mb-1.5">Phương thức</dt><dd className="font-medium">{methodLabel(detail.payment.method)}</dd></div>
                <div><dt className="text-xs text-neutral-500 mb-1.5">Thẻ</dt><dd className="font-mono font-medium tabular-nums">{detail.payment.card_brand ? `${detail.payment.card_brand} •••• ${detail.payment.last_four}` : '—'}</dd></div>
                <div><dt className="text-xs text-neutral-500 mb-1.5">Phí nền tảng</dt><dd className="font-mono font-medium tabular-nums">{formatVND(detail.payment.platform_fee_total)}</dd></div>
                <div><dt className="text-xs text-neutral-500 mb-1.5">Cho người bán</dt><dd className="font-mono font-medium tabular-nums">{formatVND(detail.payment.seller_amount_total)}</dd></div>
              </dl>
            </section>
          )}

          <section className="border-t border-neutral-200 pt-6">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-500">Phân bổ người bán</h3>
            {detail.allocations.length ? (
              <ul className="mt-4 space-y-3">
                {detail.allocations.map((item) => (
                  <li key={item.id} className="border border-neutral-200 bg-neutral-50/50 p-4 text-[13px]">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="font-semibold text-neutral-900">{item.seller.full_name || (item.seller.username ? `@${item.seller.username}` : 'Người bán')}</span>
                      <StateBadge value={item.state} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-600">
                      <span>Thực nhận</span>
                      <span className="font-mono text-sm font-bold text-neutral-900 tabular-nums">{formatVND(item.seller_net_amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 text-[13px] text-neutral-500 italic">Không có phân bổ thanh toán.</p>}
          </section>

          <section className="border-t border-neutral-200 pt-6">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-500">Lịch sử bất biến</h3>
            {detail.events.length ? (
              <ol className="mt-4 space-y-4 border-l-2 border-neutral-200 pl-4 ml-1">
                {detail.events.map((event, index) => (
                  <li key={`${String(event.id)}-${index}`} className="text-[13px] relative">
                    <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-neutral-400"></span>
                    <p className="font-semibold text-neutral-900">{statusLabel(String(event.action || event.event_type || event.new_state || 'Cập nhật'))}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{event.reason ? String(event.reason) : 'Cập nhật trạng thái hệ thống'}</p>
                    <p className="mt-1 font-mono text-[10px] text-neutral-400 tabular-nums">{formatVietnamDateTime(String(event.created_at || ''))}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-4 text-[13px] text-neutral-500 italic">Chưa có sự kiện.</p>}
          </section>

          {detail.valid_actions.length > 0 && (
            <section className="border-t border-neutral-200 pt-6 pb-2">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-500">Thao tác hợp lệ</h3>
              {!action ? (
                <div className="mt-4 flex flex-col gap-3">
                  {detail.valid_actions.map((item) => (
                    <Button key={item} type="button" size="sm" variant={item === 'cancelled' ? 'outline' : 'primary'} className="min-h-11 w-full text-sm font-semibold" onClick={() => onAction(item)}>
                      {item === 'processing' ? 'Chuyển sang đang xử lý' : item === 'completed' ? 'Xác nhận hoàn tất' : 'Hủy đơn hàng'}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 border border-neutral-900 bg-neutral-50 p-5">
                  <p className="text-[13px] font-bold text-neutral-900">Xác nhận: {statusLabel(action)}</p>
                  {needsReason && (
                    <label className="mt-4 block">
                      <span className="mb-2 block text-xs font-semibold text-neutral-700">Lý do <span aria-hidden="true" className="text-red-500">*</span></span>
                      <textarea value={reason} onChange={(e) => onReason(e.target.value)} maxLength={1000} rows={3} className="w-full border border-neutral-300 bg-white p-3 text-[13px] outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" placeholder="Ghi rõ lý do để lưu vào nhật ký hệ thống" />
                    </label>
                  )}
                  {actionError && <p className="mt-3 text-xs font-bold text-red-600" role="alert" aria-live="assertive">{actionError}</p>}
                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <Button type="button" size="sm" className="min-h-11 flex-1 text-sm font-semibold" disabled={submitting || (needsReason && !reason.trim())} onClick={onSubmit}>{submitting ? 'Đang xử lý…' : 'Xác nhận'}</Button>
                    <Button type="button" size="sm" variant="outline" className="min-h-11 flex-1 text-sm font-semibold" disabled={submitting} onClick={onCancel}>Quay lại</Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </aside>
  );
};

export const AdminTransactionsClient = () => {
  const { isAuthenticated, isAdmin, isHydrated } = useAuth();
  const [summary, setSummary] = useState<AdminTransactionSummary | null>(null);
  const [transactions, setTransactions] = useState<AdminTransactionRow[]>([]);
  const [meta, setMeta] = useState<AdminTransactionMeta | null>(null);
  const [filters, setFilters] = useState<AdminTransactionFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AdminTransactionFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminTransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<AdminTransactionAction | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (currentFilters: AdminTransactionFilters) => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, listData] = await Promise.all([getAdminTransactionSummary(), listAdminTransactions(currentFilters)]);
      setSummary(summaryData);
      setTransactions(listData.transactions);
      setMeta(listData.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải giao dịch.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isHydrated && isAuthenticated && isAdmin) {
      void Promise.resolve().then(() => loadDashboard(appliedFilters));
    }
  }, [isHydrated, isAuthenticated, isAdmin, appliedFilters, loadDashboard]);

  const selectTransaction = async (id: string) => {
    setSelectedId(id); setDetailLoading(true); setPendingAction(null); setActionError(null);
    try { setDetail(await getAdminTransaction(id)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Không thể tải chi tiết giao dịch.'); }
    finally { setDetailLoading(false); }
  };

  const clearSelection = () => { setSelectedId(null); setDetail(null); setPendingAction(null); };
  const applyFilters = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); clearSelection(); setAppliedFilters({ ...filters, page: 1 }); setFilters((current) => ({ ...current, page: 1 })); };
  const resetFilters = () => { clearSelection(); setFilters(DEFAULT_FILTERS); setAppliedFilters(DEFAULT_FILTERS); };
  const changeFilter = (key: keyof AdminTransactionFilters, value: string | number) => setFilters((current) => ({ ...current, [key]: value }));
  const changePage = (page: number) => { clearSelection(); const next = { ...appliedFilters, page }; setAppliedFilters(next); setFilters((current) => ({ ...current, page })); };

  const submitAction = async () => {
    if (!detail || !pendingAction) return;
    setSubmitting(true); setActionError(null);
    try {
      const response = await runAdminTransactionAction(detail.id, {
        action: pendingAction,
        expectedOrderUpdatedAt: detail.order.updated_at,
        expectedPaymentVersion: detail.payment?.version ?? null,
        idempotencyKey: crypto.randomUUID(),
        reason: reason.trim() || null,
      });
      setDetail(response.transaction); setPendingAction(null); setReason('');
      await loadDashboard(appliedFilters);
    } catch (caught) {
      const apiError = caught as AdminTransactionApiError;
      if (apiError.code === 'ADMIN_REASON_REQUIRED') setActionError('Vui lòng nhập lý do trước khi xác nhận.');
      else if (apiError.code === 'TRANSACTION_STATE_CONFLICT') setActionError('Giao dịch đã thay đổi. Hãy tải lại chi tiết trước khi thao tác.');
      else setActionError(apiError.message || 'Không thể cập nhật giao dịch.');
    } finally { setSubmitting(false); }
  };

  if (!isHydrated) return <TransactionSkeleton />;
  if (!isAuthenticated) return <EmptyAccess />;
  if (!isAdmin) return <EmptyAccess adminOnly />;
  if (loading) return <TransactionSkeleton />;

  return (
    <AdminContainer className="py-8 sm:py-12">
      <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-neutral-500">Trung tâm điều hành</p>
          <h1 className="mt-3 font-display text-[32px] sm:text-[40px] font-black uppercase tracking-tight leading-tight text-neutral-900">Quản lý giao dịch</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">Theo dõi đối soát đơn hàng, trạng thái thanh toán và phân bổ cho người bán. Mỗi hàng đại diện cho một bản ghi đối soát đơn hàng. Thông tin thanh toán chỉ hiển thị khi hệ thống đã ghi nhận bản ghi thanh toán tương ứng.</p>
        </div>
        <Button type="button" variant="outline" className="min-h-12 px-6 text-sm font-semibold shrink-0" onClick={() => void loadDashboard(appliedFilters)}>Làm mới dữ liệu</Button>
      </header>

      {error && (
        <div className="mt-8 border border-red-200 bg-red-50 p-5 text-[14px] font-medium text-red-800 shadow-sm" role="alert" aria-live="assertive">{error}</div>
      )}

      {summary && (
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tổng quan giao dịch">
          <SummaryCard featured label="Tổng đơn đối soát" value={summary.total_transactions} note={`${summary.pending_orders} chờ xử lý · ${summary.processing_orders} đang xử lý`} />
          <SummaryCard label="Tiền đang tạm giữ" value={formatVND(summary.held_amount)} note={`${summary.held_payments} thanh toán`} />
          <SummaryCard label="Khoản đã giải ngân" value={summary.released_payments} note={`${summary.completed_orders} đơn hoàn tất`} />
          <SummaryCard label="Đơn đã hủy" value={summary.cancelled_orders} note={`${summary.failed_payments} thanh toán thất bại`} />
        </section>
      )}

      <section className="mt-8">
        <Filters values={filters} onChange={changeFilter} onSubmit={applyFilters} onReset={resetFilters} />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(360px,0.9fr)] items-start">
        <section className="flex flex-col min-w-0">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">Danh sách giao dịch</h2>
              <p className="mt-1.5 text-[13px] text-neutral-600 font-medium">{meta?.total || 0} kết quả tìm thấy</p>
            </div>
          </div>

          {transactions.length ? (
            <TransactionTable
              rows={transactions}
              selectedId={selectedId}
              onSelect={(id) => void selectTransaction(id)}
              meta={meta}
              onPageChange={changePage}
            />
          ) : (
            <div className="border border-dashed border-neutral-300 bg-neutral-50 p-16 text-center shadow-sm">
              <p className="font-display text-xl font-black uppercase tracking-tight text-neutral-900">Không tìm thấy giao dịch</p>
              <p className="mt-3 text-[14px] text-neutral-500">Thử thay đổi bộ lọc hoặc khoảng thời gian để xem kết quả.</p>
            </div>
          )}
        </section>

        <DetailPanel
          detail={detail}
          loading={detailLoading}
          action={pendingAction}
          reason={reason}
          submitting={submitting}
          actionError={actionError}
          onAction={(nextAction) => { setPendingAction(nextAction); setReason(''); setActionError(null); }}
          onReason={setReason}
          onCancel={() => { setPendingAction(null); setReason(''); setActionError(null); }}
          onSubmit={() => void submitAction()}
        />
      </div>
    </AdminContainer>
  );
};
