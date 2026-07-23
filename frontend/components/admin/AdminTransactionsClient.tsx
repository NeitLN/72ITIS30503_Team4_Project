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
import { Container } from '../ui/Container';

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

const methodLabel = (value: string) => ({
  simulated_card: 'Thẻ mô phỏng',
  cod: 'Thanh toán khi nhận hàng',
  bank_transfer: 'Chuyển khoản',
}[value] || value.replaceAll('_', ' '));

const badgeClass = (value: string | null) => {
  if (['completed', 'released'].includes(value || '')) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (['cancelled', 'failed'].includes(value || '')) return 'border-red-200 bg-red-50 text-red-800';
  if (['processing', 'held'].includes(value || '')) return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
};

const StateBadge = ({ value }: { value: string | null }) => (
  <span className={`inline-flex border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${badgeClass(value)}`}>
    {statusLabel(value)}
  </span>
);

const TransactionSkeleton = () => (
  <Container className="py-10 sm:py-16" >
    <div data-state="skeleton" className="animate-pulse space-y-6" aria-label="Đang tải giao dịch">
      <div className="h-20 max-w-xl bg-neutral-100" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 bg-neutral-100" />)}
      </div>
      <div className="h-80 bg-neutral-100" />
    </div>
  </Container>
);

const EmptyAccess = ({ adminOnly = false }: { adminOnly?: boolean }) => (
  <Container className="max-w-lg py-20">
    <section data-state={adminOnly ? 'unauthorized' : 'login-required'} className="border border-neutral-200 bg-white p-8 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">Khu vực quản trị</p>
      <h1 className="mt-3 font-display text-2xl font-black uppercase tracking-tight">
        {adminOnly ? 'Truy cập bị từ chối' : 'Đăng nhập để tiếp tục'}
      </h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        {adminOnly ? 'Tài khoản hiện tại không có quyền quản trị giao dịch.' : 'Trang này chỉ dành cho quản trị viên StyleHub.'}
      </p>
      <Link href={adminOnly ? ROUTES.HOME : `${ROUTES.LOGIN}?redirect=${ROUTES.ADMIN_TRANSACTIONS}`} className="mt-7 inline-flex min-h-11 items-center justify-center bg-neutral-900 px-6 text-xs font-bold uppercase tracking-wider text-white">
        {adminOnly ? 'Về trang chủ' : 'Đăng nhập'}
      </Link>
    </section>
  </Container>
);

const SummaryCard = ({ label, value, note, featured = false }: { label: string; value: string | number; note: string; featured?: boolean }) => (
  <article className={`min-h-32 border p-5 ${featured ? 'border-neutral-900 bg-neutral-900 text-white md:col-span-2' : 'border-neutral-200 bg-white'}`}>
    <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${featured ? 'text-neutral-300' : 'text-neutral-500'}`}>{label}</p>
    <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
    <p className={`mt-2 text-xs ${featured ? 'text-neutral-300' : 'text-neutral-500'}`}>{note}</p>
  </article>
);

const Filters = ({ values, onChange, onSubmit, onReset }: {
  values: AdminTransactionFilters;
  onChange: (key: keyof AdminTransactionFilters, value: string | number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
}) => (
  <form onSubmit={onSubmit} className="border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="sm:col-span-2">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">Tìm kiếm</span>
        <input value={values.search || ''} onChange={(e) => onChange('search', e.target.value)} placeholder="Mã đơn, email hoặc UUID" className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900" />
      </label>
      <label>
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">Trạng thái đơn</span>
        <select value={values.orderStatus || ''} onChange={(e) => onChange('orderStatus', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900">
          <option value="">Tất cả</option><option value="pending">Chờ xử lý</option><option value="processing">Đang xử lý</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option>
        </select>
      </label>
      <label>
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">Trạng thái thanh toán</span>
        <select value={values.paymentState || ''} onChange={(e) => onChange('paymentState', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900">
          <option value="">Tất cả</option><option value="pending">Chờ xử lý</option><option value="held">Đang tạm giữ</option><option value="released">Đã giải ngân</option><option value="failed">Thất bại</option><option value={['re', 'funded'].join('')}>Đã hoàn lại</option><option value="disputed">Đang tranh chấp</option>
        </select>
      </label>
      <label>
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">Phương thức</span>
        <select value={values.paymentMethod || ''} onChange={(e) => onChange('paymentMethod', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900">
          <option value="">Tất cả</option><option value="simulated_card">Thẻ mô phỏng</option><option value="cod">Khi nhận hàng</option><option value="bank_transfer">Chuyển khoản</option>
        </select>
      </label>
      <label>
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">Từ ngày</span>
        <input type="date" value={values.dateFrom || ''} onChange={(e) => onChange('dateFrom', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900" />
      </label>
      <label>
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">Đến ngày</span>
        <input type="date" value={values.dateTo || ''} onChange={(e) => onChange('dateTo', e.target.value)} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900" />
      </label>
      <label>
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">Sắp xếp</span>
        <select value={`${values.sort}:${values.direction}`} onChange={(e) => { const [sort, direction] = e.target.value.split(':'); onChange('sort', sort); onChange('direction', direction); }} className="min-h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900">
          <option value="created_at:desc">Mới nhất</option><option value="created_at:asc">Cũ nhất</option><option value="total_amount:desc">Giá trị cao nhất</option><option value="total_amount:asc">Giá trị thấp nhất</option>
        </select>
      </label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="submit" size="sm" className="min-h-11">Áp dụng bộ lọc</Button>
      <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={onReset}>Đặt lại</Button>
    </div>
  </form>
);

const TransactionTable = ({ rows, selectedId, onSelect }: { rows: AdminTransactionRow[]; selectedId: string | null; onSelect: (id: string) => void }) => (
  <>
    <div className="hidden md:block overflow-x-auto border border-neutral-200 bg-white">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead className="border-b border-neutral-200 bg-neutral-50 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          <tr><th className="px-4 py-3">Giao dịch</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Giá trị</th><th className="px-4 py-3">Thanh toán</th><th className="px-4 py-3">Đơn hàng</th><th className="px-4 py-3">Thời gian</th></tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {rows.map((row) => (
            <tr key={row.id} onClick={() => onSelect(row.id)} className={`cursor-pointer text-sm transition-colors hover:bg-neutral-50 ${selectedId === row.id ? 'bg-neutral-100' : ''}`} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(row.id); }}>
              <td className="px-4 py-4"><p className="font-mono text-xs font-bold">{row.order_code}</p><p className="mt-1 max-w-44 truncate font-mono text-[10px] text-neutral-400">{row.payment_id || row.order_id}</p></td>
              <td className="px-4 py-4"><p className="font-semibold">{row.buyer?.full_name || 'Khách hàng'}</p><p className="mt-1 text-xs text-neutral-500">{row.buyer?.email || '—'}</p></td>
              <td className="px-4 py-4 font-mono font-bold">{formatVND(row.total_amount)}</td>
              <td className="px-4 py-4"><StateBadge value={row.payment_state} /><p className="mt-2 text-xs text-neutral-500">{methodLabel(row.payment_method)}</p></td>
              <td className="px-4 py-4"><StateBadge value={row.order_status} /></td>
              <td className="px-4 py-4 text-xs text-neutral-500">{formatVietnamDateTime(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="md:hidden space-y-3">
      {rows.map((row) => (
        <button key={row.id} type="button" onClick={() => onSelect(row.id)} className={`min-h-11 w-full border p-4 text-left ${selectedId === row.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-3"><span className="font-mono text-xs font-bold">{row.order_code}</span><span className="font-mono text-sm font-bold">{formatVND(row.total_amount)}</span></div>
          <p className="mt-2 text-sm font-semibold">{row.buyer?.full_name || row.buyer?.email || 'Khách hàng'}</p>
          <div className="mt-3 flex flex-wrap gap-2"><StateBadge value={row.order_status} /><StateBadge value={row.payment_state} /></div>
          <p className="mt-3 text-xs text-neutral-500">{methodLabel(row.payment_method)} · {formatVietnamDateTime(row.created_at)}</p>
        </button>
      ))}
    </div>
  </>
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
  if (loading) return <aside className="border border-neutral-200 bg-white p-6" aria-live="polite"><p className="font-mono text-xs uppercase tracking-wider text-neutral-500">Đang tải chi tiết…</p></aside>;
  if (!detail) return <aside className="border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">Chọn một giao dịch để xem đối soát và lịch sử.</aside>;
  const needsReason = action === 'completed' || action === 'cancelled';
  return (
    <aside className="border border-neutral-900 bg-white" aria-label="Chi tiết giao dịch">
      <div className="border-b border-neutral-200 bg-neutral-900 p-5 text-white"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-300">Chi tiết giao dịch</p><h2 className="mt-2 font-mono text-lg font-bold">{detail.order.order_code}</h2><p className="mt-1 break-all font-mono text-[10px] text-neutral-400">{detail.id}</p></div>
      <div className="space-y-6 p-5">
        <section><h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Tổng quan</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-neutral-500">Đơn hàng</dt><dd className="mt-1"><StateBadge value={detail.order.status} /></dd></div><div><dt className="text-xs text-neutral-500">Thanh toán</dt><dd className="mt-1"><StateBadge value={detail.payment?.state || null} /></dd></div><div><dt className="text-xs text-neutral-500">Khách hàng</dt><dd className="mt-1 font-semibold">{detail.buyer?.full_name || 'Khách hàng'}</dd></div><div><dt className="text-xs text-neutral-500">Tổng tiền</dt><dd className="mt-1 font-mono font-bold">{formatVND(detail.order.total_amount)}</dd></div></dl></section>
        {detail.payment && <section className="border-t border-neutral-200 pt-5"><h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Thanh toán an toàn</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-neutral-500">Phương thức</dt><dd className="mt-1">{methodLabel(detail.payment.method)}</dd></div><div><dt className="text-xs text-neutral-500">Thẻ</dt><dd className="mt-1 font-mono">{detail.payment.card_brand ? `${detail.payment.card_brand} •••• ${detail.payment.last_four}` : '—'}</dd></div><div><dt className="text-xs text-neutral-500">Phí nền tảng</dt><dd className="mt-1 font-mono">{formatVND(detail.payment.platform_fee_total)}</dd></div><div><dt className="text-xs text-neutral-500">Cho người bán</dt><dd className="mt-1 font-mono">{formatVND(detail.payment.seller_amount_total)}</dd></div></dl></section>}
        <section className="border-t border-neutral-200 pt-5"><h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Phân bổ người bán</h3>{detail.allocations.length ? <ul className="mt-3 space-y-3">{detail.allocations.map((item) => <li key={item.id} className="border border-neutral-200 p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-semibold">{item.seller.full_name || (item.seller.username ? `@${item.seller.username}` : 'Người bán')}</span><StateBadge value={item.state} /></div><div className="mt-2 flex justify-between text-xs text-neutral-500"><span>Thực nhận</span><span className="font-mono font-bold text-neutral-900">{formatVND(item.seller_net_amount)}</span></div></li>)}</ul> : <p className="mt-3 text-sm text-neutral-500">Không có phân bổ thanh toán.</p>}</section>
        <section className="border-t border-neutral-200 pt-5"><h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Lịch sử bất biến</h3>{detail.events.length ? <ol className="mt-3 space-y-3 border-l border-neutral-300 pl-4">{detail.events.map((event, index) => <li key={`${String(event.id)}-${index}`} className="text-xs"><p className="font-semibold">{statusLabel(String(event.action || event.event_type || event.new_state || 'Cập nhật'))}</p><p className="mt-1 text-neutral-500">{event.reason ? String(event.reason) : 'Cập nhật trạng thái hệ thống'} · {formatVietnamDateTime(String(event.created_at || ''))}</p></li>)}</ol> : <p className="mt-3 text-sm text-neutral-500">Chưa có sự kiện.</p>}</section>
        {detail.valid_actions.length > 0 && <section className="border-t border-neutral-200 pt-5"><h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Thao tác hợp lệ</h3>{!action ? <div className="mt-3 flex flex-wrap gap-2">{detail.valid_actions.map((item) => <Button key={item} type="button" size="sm" variant={item === 'cancelled' ? 'outline' : 'primary'} className="min-h-11" onClick={() => onAction(item)}>{item === 'processing' ? 'Chuyển sang xử lý' : item === 'completed' ? 'Xác nhận hoàn tất' : 'Hủy đơn'}</Button>)}</div> : <div className="mt-3 border border-neutral-300 bg-neutral-50 p-4"><p className="text-sm font-semibold">Xác nhận: {statusLabel(action)}</p>{needsReason && <label className="mt-3 block"><span className="mb-1.5 block text-xs text-neutral-600">Lý do <span aria-hidden="true">*</span></span><textarea value={reason} onChange={(e) => onReason(e.target.value)} maxLength={1000} rows={3} className="w-full border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-neutral-900" placeholder="Ghi rõ lý do để lưu vào nhật ký quản trị" /></label>}{actionError && <p className="mt-3 text-sm font-medium text-red-700" role="alert" aria-live="assertive">{actionError}</p>}<div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" className="min-h-11" disabled={submitting || (needsReason && !reason.trim())} onClick={onSubmit}>{submitting ? 'Đang cập nhật…' : 'Xác nhận thao tác'}</Button><Button type="button" size="sm" variant="outline" className="min-h-11" disabled={submitting} onClick={onCancel}>Quay lại</Button></div></div>}</section>}
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
    <Container className="py-10 sm:py-16">
      <header className="flex flex-col gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">Trung tâm điều hành / Phase 3</p><h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">Quản lý giao dịch</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">Theo dõi vòng đời đơn hàng, trạng thái thanh toán mô phỏng và phân bổ cho người bán từ một nguồn dữ liệu nhất quán.</p></div>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => void loadDashboard(appliedFilters)}>Làm mới dữ liệu</Button>
      </header>
      {error && <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800" role="alert" aria-live="assertive">{error}</div>}
      {summary && <section className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Tổng quan giao dịch"><SummaryCard featured label="Tổng giao dịch" value={summary.total_transactions} note={`${summary.pending_orders} chờ xử lý · ${summary.processing_orders} đang xử lý`} /><SummaryCard label="Tiền đang tạm giữ" value={formatVND(summary.held_amount)} note={`${summary.held_payments} thanh toán`} /><SummaryCard label="Đã giải ngân" value={summary.released_payments} note={`${summary.completed_orders} đơn hoàn tất`} /><SummaryCard label="Đã hủy" value={summary.cancelled_orders} note={`${summary.failed_payments} thanh toán thất bại`} /></section>}
      <section className="mt-7"><Filters values={filters} onChange={changeFilter} onSubmit={applyFilters} onReset={resetFilters} /></section>
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.8fr)]">
        <section><div className="mb-3 flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">Danh sách giao dịch</p><p className="mt-1 text-sm text-neutral-600">{meta?.total || 0} kết quả</p></div>{meta && meta.totalPages > 1 && <p className="font-mono text-xs text-neutral-500">Trang {meta.page}/{meta.totalPages}</p>}</div>
          {transactions.length ? <TransactionTable rows={transactions} selectedId={selectedId} onSelect={(id) => void selectTransaction(id)} /> : <div className="border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center"><p className="font-display text-lg font-bold uppercase">Không tìm thấy giao dịch</p><p className="mt-2 text-sm text-neutral-500">Thử thay đổi bộ lọc hoặc khoảng thời gian.</p></div>}
          {meta && meta.totalPages > 1 && <nav className="mt-4 flex items-center justify-between" aria-label="Phân trang giao dịch"><Button type="button" size="sm" variant="outline" className="min-h-11" disabled={meta.page <= 1} onClick={() => changePage(meta.page - 1)}>Trang trước</Button><Button type="button" size="sm" variant="outline" className="min-h-11" disabled={meta.page >= meta.totalPages} onClick={() => changePage(meta.page + 1)}>Trang sau</Button></nav>}
        </section>
        <DetailPanel detail={detail} loading={detailLoading} action={pendingAction} reason={reason} submitting={submitting} actionError={actionError} onAction={(nextAction) => { setPendingAction(nextAction); setReason(''); setActionError(null); }} onReason={setReason} onCancel={() => { setPendingAction(null); setReason(''); setActionError(null); }} onSubmit={() => void submitAction()} />
      </div>
    </Container>
  );
};
