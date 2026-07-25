'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../hooks/useAuth';
import { formatVND, formatVietnamDateTime, formatCondition } from '../../lib/format';
import { LISTING_STATUS_LABELS, FULFILLMENT_STATUS_LABELS } from '../../lib/listingOptions';
import {
  SellerListing, SellerListingStats, SellerOrderItem,
  getMyListingStats, getMyListings, transitionListingStatus,
  getMyOrderItems, updateFulfillmentStatus,
} from '../../lib/sellerDashboard';
import { ListingEditForm } from './ListingEditForm';
import { ConfirmDialog } from './ConfirmDialog';
import { LifecycleBadge } from '../sustainability/LifecycleBadge';
import { getMyImpact, ProfileImpact } from '../../lib/impact';
import { PersonalImpactCard } from '../sustainability/PersonalImpactCard';

type Tab = 'overview' | 'listings' | 'orders';

const LISTING_STATUS_FILTERS = ['', 'draft', 'active', 'hidden', 'sold', 'archived'];
const FULFILLMENT_FILTERS = ['', 'awaiting_confirmation', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'];

// Only actions valid FROM the listing's current status — mirrors
// backend/constants/listingStatus.js's ALLOWED_TRANSITIONS exactly so the
// UI never offers a button the server would reject.
const LISTING_ACTIONS: Record<string, { action: string; label: string; danger?: boolean }[]> = {
  draft: [{ action: 'active', label: 'Đăng bán' }, { action: 'archived', label: 'Lưu trữ' }],
  active: [{ action: 'hidden', label: 'Tạm ẩn' }, { action: 'sold', label: 'Đánh dấu đã bán' }, { action: 'archived', label: 'Lưu trữ', danger: true }],
  hidden: [{ action: 'active', label: 'Đăng bán lại' }, { action: 'archived', label: 'Lưu trữ', danger: true }],
  sold: [{ action: 'archived', label: 'Lưu trữ' }],
  archived: [],
};

const FULFILLMENT_ACTIONS: Record<string, { action: string; label: string; danger?: boolean }[]> = {
  awaiting_confirmation: [{ action: 'confirmed', label: 'Xác nhận' }, { action: 'cancelled', label: 'Hủy', danger: true }],
  confirmed: [{ action: 'preparing', label: 'Chuẩn bị hàng' }, { action: 'cancelled', label: 'Hủy', danger: true }],
  preparing: [{ action: 'shipped', label: 'Đã giao vận chuyển' }, { action: 'cancelled', label: 'Hủy', danger: true }],
  shipped: [{ action: 'completed', label: 'Hoàn tất' }],
  completed: [],
  cancelled: [],
};

export const SellerDashboardClient = () => {
  const { isAuthenticated, isHydrated, user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  // ---------- Overview ----------
  const [stats, setStats] = useState<SellerListingStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [impact, setImpact] = useState<ProfileImpact | null>(null);

  const loadStats = useCallback(async () => {
    setStatsError(null);
    try {
      const res = await getMyListingStats();
      if (res.success) setStats(res.data);
      else setStatsError(res.error.message || 'Không thể tải thống kê.');
    } catch {
      setStatsError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
    }
  }, []);

  // ---------- Listings ----------
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [listingCount, setListingCount] = useState(0);
  const [listingPage, setListingPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: string; label: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const LISTINGS_PER_PAGE = 10;
  // Search/filter/page changes can each fire their own fetch in quick
  // succession (tab switch, then a keystroke). Without a sequence guard,
  // an EARLIER (e.g. unfiltered) request that happens to resolve LATER
  // would overwrite the correct, more recent filtered result. Only the
  // response matching the most-recently-STARTED request is ever applied.
  const listingsRequestRef = useRef(0);

  const loadListings = useCallback(async () => {
    const requestId = ++listingsRequestRef.current;
    setListingsLoading(true);
    setListingsError(null);
    try {
      const res = await getMyListings({ page: listingPage, limit: LISTINGS_PER_PAGE, status: statusFilter || undefined, search: search || undefined });
      if (requestId !== listingsRequestRef.current) return; // superseded by a newer request
      if (res.success) {
        setListings(res.data);
        setListingCount(res.meta?.count ?? res.data.length);
      } else {
        setListingsError(res.error.message || 'Không thể tải danh sách sản phẩm.');
      }
    } catch {
      if (requestId !== listingsRequestRef.current) return;
      setListingsError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
    } finally {
      if (requestId === listingsRequestRef.current) setListingsLoading(false);
    }
  }, [listingPage, statusFilter, search]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      await Promise.all([
        loadStats(),
        getMyImpact().then(setImpact).catch(() => undefined),
      ]);
    })();
  }, [isAuthenticated, loadStats]);

  useEffect(() => {
    if (!isAuthenticated || tab !== 'listings') return;
    void (async () => { await loadListings(); })();
  }, [isAuthenticated, tab, loadListings]);

  const handleTransition = async (id: string, action: string) => {
    setActionError(null);
    setStatusMessage('Đang cập nhật…');
    try {
      const res = await transitionListingStatus(id, action);
      if (res.success) {
        setListings((prev) => prev.map((l) => (l.id === id ? res.data : l)));
        setStatusMessage('Đã cập nhật trạng thái sản phẩm.');
        loadStats();
      } else {
        setActionError(res.error.message || 'Không thể cập nhật trạng thái.');
        setStatusMessage('Cập nhật trạng thái không thành công.');
      }
    } catch {
      setActionError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
      setStatusMessage('Cập nhật trạng thái không thành công do lỗi kết nối.');
    } finally {
      setPendingAction(null);
    }
  };

  const requestAction = (id: string, action: string, label: string) => {
    // Destructive/state-changing actions (hide, mark sold, archive) always
    // go through the confirmation dialog; reactivating never needs one.
    if (action === 'active') {
      handleTransition(id, action);
    } else {
      setPendingAction({ id, action, label });
    }
  };

  // ---------- Orders ----------
  const [orderItems, setOrderItems] = useState<SellerOrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [fulfillmentBusyId, setFulfillmentBusyId] = useState<string | null>(null);
  const ORDERS_PER_PAGE = 10;
  const ordersRequestRef = useRef(0); // same out-of-order-response guard as loadListings

  const loadOrders = useCallback(async () => {
    const requestId = ++ordersRequestRef.current;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const res = await getMyOrderItems({ page: orderPage, limit: ORDERS_PER_PAGE, status: fulfillmentFilter || undefined });
      if (requestId !== ordersRequestRef.current) return;
      if (res.success) {
        setOrderItems(res.data);
        setOrderCount(res.meta?.count ?? res.data.length);
      } else {
        setOrdersError(res.error.message || 'Không thể tải danh sách đơn bán.');
      }
    } catch {
      if (requestId !== ordersRequestRef.current) return;
      setOrdersError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
    } finally {
      if (requestId === ordersRequestRef.current) setOrdersLoading(false);
    }
  }, [orderPage, fulfillmentFilter]);

  useEffect(() => {
    if (!isAuthenticated || tab !== 'orders') return;
    void (async () => { await loadOrders(); })();
  }, [isAuthenticated, tab, loadOrders]);

  const handleFulfillmentAction = async (itemId: string, action: string) => {
    setFulfillmentBusyId(itemId);
    try {
      const res = await updateFulfillmentStatus(itemId, action);
      if (res.success) {
        setOrderItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, fulfillment_status: res.data.fulfillment_status } : i)));
        loadStats();
      } else {
        setOrdersError(res.error.message || 'Không thể cập nhật trạng thái xử lý.');
      }
    } catch {
      setOrdersError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
    } finally {
      setFulfillmentBusyId(null);
    }
  };

  // ---------- Auth gate ----------
  if (!isHydrated) {
    return <Container className="py-16 text-center animate-pulse">Đang tải kênh người bán…</Container>;
  }
  if (!isAuthenticated) {
    return (
      <Container className="py-16 sm:py-24 max-w-md">
        <div className="border border-neutral-200 bg-white p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔒</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
            Đăng nhập để vào kênh người bán
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Bạn cần đăng nhập để quản lý sản phẩm và đơn bán trên StyleHub.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.SELLER_DASHBOARD}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider" data-testid="dashboard-login-link">
                Đăng nhập
              </Button>
            </Link>
            <Link href={`${ROUTES.REGISTER}?redirect=${ROUTES.SELLER_DASHBOARD}`}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                Tạo tài khoản
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  const totalListingPages = Math.max(1, Math.ceil(listingCount / LISTINGS_PER_PAGE));
  const totalOrderPages = Math.max(1, Math.ceil(orderCount / ORDERS_PER_PAGE));

  return (
    <Container className="py-10 sm:py-16">
      <div aria-live="polite" className="sr-only">{statusMessage}</div>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">Kênh người bán</p>
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-neutral-900">
            TỔNG QUAN BÁN HÀNG
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
          {user?.username ? (
            <Link href={ROUTES.SELLER_PROFILE(user.username)} data-testid="dashboard-public-profile-link">
              <Button variant="outline" className="font-mono text-xs uppercase tracking-wider">Hồ sơ công khai</Button>
            </Link>
          ) : (
            <Link
              href={ROUTES.PROFILE}
              data-testid="dashboard-set-username-hint"
              className="text-right text-[11px] text-neutral-500 underline hover:text-neutral-900 sm:text-left"
            >
              Đặt tên người dùng để mở gian hàng công khai
            </Link>
          )}
          <Link href={ROUTES.SELL} data-testid="dashboard-sell-link">
            <Button className="font-mono text-xs uppercase tracking-wider bg-neutral-900 text-white">Đăng sản phẩm</Button>
          </Link>
        </div>
      </div>

      {/* Tab nav */}
      <div className="mb-8 flex gap-1 border-b border-neutral-200 overflow-x-auto" role="tablist">
        {([
          ['overview', 'Tổng quan'],
          ['listings', 'Sản phẩm'],
          ['orders', 'Đơn bán'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => { setTab(key); setEditingId(null); }}
            data-testid={`dashboard-tab-${key}`}
            className={`whitespace-nowrap px-4 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-colors ${
              tab === key ? 'border-neutral-900 text-neutral-900 font-bold' : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---------- Overview ---------- */}
      {tab === 'overview' && (
        <div data-testid="dashboard-overview">
          {statsError && <p role="alert" className="text-sm text-red-600 mb-4">{statsError}</p>}
          {!stats && !statsError && <p className="text-sm text-neutral-500 animate-pulse">Đang tải thống kê…</p>}
          {stats && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="border border-neutral-200 bg-white p-4">
                <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Đang bán</p>
                <p className="font-display text-2xl font-bold" data-testid="stat-active">{stats.activeListings}</p>
              </div>
              <div className="border border-neutral-200 bg-white p-4">
                <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Bản nháp / Tạm ẩn</p>
                <p className="font-display text-2xl font-bold" data-testid="stat-hidden-draft">{stats.hiddenOrDraftListings}</p>
              </div>
              <div className="border border-neutral-200 bg-white p-4">
                <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Đã bán (sản phẩm)</p>
                <p className="font-display text-2xl font-bold" data-testid="stat-sold">{stats.soldUnits}</p>
              </div>
              <div className="border border-neutral-200 bg-white p-4">
                <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Đơn cần xử lý</p>
                <p className="font-display text-2xl font-bold" data-testid="stat-action">{stats.ordersRequiringAction}</p>
              </div>
              <div className="border border-neutral-200 bg-white p-4">
                <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Doanh thu gộp</p>
                <p className="font-display text-xl font-bold" data-testid="stat-gmv">{formatVND(stats.grossMerchandiseValue)}</p>
              </div>
            </div>
          )}
          <p className="mt-6 text-xs text-neutral-400 max-w-xl">
            Doanh thu gộp được tính từ các mục đơn hàng đã hoàn tất chứa sản phẩm của bạn, chưa trừ phí hoặc chi phí vận chuyển.
          </p>
          {impact ? <PersonalImpactCard impact={impact} dashboard /> : null}
        </div>
      )}

      {/* ---------- Listings ---------- */}
      {tab === 'listings' && (
        <div data-testid="dashboard-listings">
          {editingId ? (
            <div className="border border-neutral-200 bg-white p-6 sm:p-8">
              <ListingEditForm
                listingId={editingId}
                onCancel={() => setEditingId(null)}
                onSaved={(updated) => {
                  setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
                  setEditingId(null);
                  setStatusMessage('Đã lưu thay đổi sản phẩm.');
                }}
              />
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <input
                  type="search" value={search} onChange={(e) => { setSearch(e.target.value); setListingPage(1); }}
                  placeholder="Tìm theo tên sản phẩm…" data-testid="listings-search"
                  className="flex-1 border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                />
                <select
                  value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setListingPage(1); }}
                  data-testid="listings-status-filter"
                  className="border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                >
                  {LISTING_STATUS_FILTERS.map((s) => (
                    <option key={s} value={s}>{s ? LISTING_STATUS_LABELS[s] : 'Tất cả trạng thái'}</option>
                  ))}
                </select>
              </div>

              {actionError && <p role="alert" className="text-sm text-red-600 mb-4">{actionError}</p>}
              {listingsError && (
                <div className="border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-sm text-red-700 mb-3">{listingsError}</p>
                  <Button variant="outline" size="sm" onClick={loadListings} className="font-mono text-xs uppercase tracking-wider">Thử lại</Button>
                </div>
              )}
              {listingsLoading && <p className="text-sm text-neutral-500 animate-pulse py-8 text-center">Đang tải sản phẩm…</p>}

              {!listingsLoading && !listingsError && listings.length === 0 && (
                <div className="border border-dashed border-neutral-300 py-16 px-4 text-center">
                  <p className="text-sm text-neutral-500 mb-4">Chưa có sản phẩm nào phù hợp.</p>
                  <Link href={ROUTES.SELL}><Button variant="outline" className="font-mono text-xs uppercase tracking-wider">Đăng sản phẩm đầu tiên</Button></Link>
                </div>
              )}

              {!listingsLoading && listings.length > 0 && (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto border border-neutral-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 bg-neutral-50 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                          <th className="px-4 py-3">Sản phẩm</th>
                          <th className="px-4 py-3">Giá</th>
                          <th className="px-4 py-3">Kho</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Cập nhật</th>
                          <th className="px-4 py-3">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listings.map((listing) => (
                          <tr key={listing.id} className="border-b border-neutral-100 last:border-0" data-testid="listing-row">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={listing.thumbnail || listing.image_url || ''} alt={listing.name} className="h-12 w-12 object-cover border border-neutral-200 shrink-0" />
                                <div className="min-w-0">
                                  <span className="block font-medium text-neutral-900 line-clamp-2">{listing.name}</span>
                                  <LifecycleBadge lifecycle={listing.sustainability?.lifecycle_type} showNotSpecified testId="listing-lifecycle" className="mt-1" />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{formatVND(listing.sale_price ?? listing.price)}</td>
                            <td className="px-4 py-3">{listing.stock}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-[10px] uppercase tracking-wider border border-neutral-300 px-2 py-0.5" data-testid="listing-status">
                                {LISTING_STATUS_LABELS[listing.status] || listing.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{formatVietnamDateTime(listing.updated_at)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => setEditingId(listing.id)} className="font-mono text-[10px] uppercase tracking-wider text-neutral-700 hover:text-neutral-900 underline" data-testid="listing-action-edit">
                                  Chỉnh sửa
                                </button>
                                {(LISTING_ACTIONS[listing.status] || []).map((a) => (
                                  <button
                                    key={a.action}
                                    onClick={() => requestAction(listing.id, a.action, a.label)}
                                    className={`font-mono text-[10px] uppercase tracking-wider underline ${a.danger ? 'text-red-600 hover:text-red-800' : 'text-neutral-700 hover:text-neutral-900'}`}
                                    data-testid={`listing-action-${a.action}`}
                                  >
                                    {a.label}
                                  </button>
                                ))}
                                <Link href={ROUTES.PRODUCT(listing.slug)} target="_blank" className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-900 underline">
                                  Xem trang sản phẩm
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <ul className="md:hidden flex flex-col gap-4">
                    {listings.map((listing) => (
                      <li key={listing.id} className="border border-neutral-200 bg-white p-4" data-testid="listing-row">
                        <div className="flex gap-3 mb-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={listing.thumbnail || listing.image_url || ''} alt={listing.name} className="h-16 w-16 object-cover border border-neutral-200 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-900 line-clamp-2">{listing.name}</p>
                            <p className="text-sm text-neutral-600">{formatVND(listing.sale_price ?? listing.price)}</p>
                            <LifecycleBadge lifecycle={listing.sustainability?.lifecycle_type} showNotSpecified testId="listing-lifecycle" className="mt-1" />
                            <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-wider border border-neutral-300 px-2 py-0.5" data-testid="listing-status">
                              {LISTING_STATUS_LABELS[listing.status] || listing.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 border-t border-neutral-100 pt-3">
                          <button onClick={() => setEditingId(listing.id)} className="font-mono text-[10px] uppercase tracking-wider text-neutral-700 underline" data-testid="listing-action-edit">
                            Chỉnh sửa
                          </button>
                          {(LISTING_ACTIONS[listing.status] || []).map((a) => (
                            <button
                              key={a.action}
                              onClick={() => requestAction(listing.id, a.action, a.label)}
                              className={`font-mono text-[10px] uppercase tracking-wider underline ${a.danger ? 'text-red-600' : 'text-neutral-700'}`}
                              data-testid={`listing-action-${a.action}`}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Pagination */}
                  <div className="mt-6 flex items-center justify-between font-mono text-xs">
                    <Button variant="outline" size="sm" disabled={listingPage <= 1} onClick={() => setListingPage((p) => p - 1)} className="uppercase tracking-wider" data-testid="listings-prev-page">
                      &larr; Trước
                    </Button>
                    <span className="text-neutral-500">Trang {listingPage} / {totalListingPages}</span>
                    <Button variant="outline" size="sm" disabled={listingPage >= totalListingPages} onClick={() => setListingPage((p) => p + 1)} className="uppercase tracking-wider" data-testid="listings-next-page">
                      Sau &rarr;
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------- Orders ---------- */}
      {tab === 'orders' && (
        <div data-testid="dashboard-orders">
          <div className="mb-6">
            <select
              value={fulfillmentFilter} onChange={(e) => { setFulfillmentFilter(e.target.value); setOrderPage(1); }}
              data-testid="orders-status-filter"
              className="border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            >
              {FULFILLMENT_FILTERS.map((s) => (
                <option key={s} value={s}>{s ? FULFILLMENT_STATUS_LABELS[s] : 'Tất cả trạng thái xử lý'}</option>
              ))}
            </select>
          </div>

          {ordersError && <p role="alert" className="text-sm text-red-600 mb-4">{ordersError}</p>}
          {ordersLoading && <p className="text-sm text-neutral-500 animate-pulse py-8 text-center">Đang tải đơn bán…</p>}

          {!ordersLoading && !ordersError && orderItems.length === 0 && (
            <div className="border border-dashed border-neutral-300 py-16 px-4 text-center">
              <p className="text-sm text-neutral-500">Chưa có đơn bán nào phù hợp.</p>
            </div>
          )}

          {!ordersLoading && orderItems.length > 0 && (
            <>
              <ul className="flex flex-col gap-4">
                {orderItems.map((item) => (
                  <li key={item.id} className="border border-neutral-200 bg-white p-4 sm:p-5" data-testid="order-item-row">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex gap-3 min-w-0">
                        {item.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.product_name} className="h-14 w-14 object-cover border border-neutral-200 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 line-clamp-1">{item.product_name}</p>
                          <p className="text-xs text-neutral-500">
                            {item.order?.order_code} · SL {item.quantity}
                            {item.size ? ` · ${item.size}` : ''}
                            {item.condition ? ` · ${formatCondition(item.condition)}` : ''}
                          </p>
                          <p className="text-xs text-neutral-500">{formatVietnamDateTime(item.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[10px] uppercase tracking-wider border border-neutral-300 px-2 py-0.5" data-testid="order-item-fulfillment-status">
                          {FULFILLMENT_STATUS_LABELS[item.fulfillment_status] || item.fulfillment_status}
                        </span>
                        {(FULFILLMENT_ACTIONS[item.fulfillment_status] || []).map((a) => (
                          <button
                            key={a.action}
                            disabled={fulfillmentBusyId === item.id}
                            onClick={() => handleFulfillmentAction(item.id, a.action)}
                            className={`font-mono text-[10px] uppercase tracking-wider underline disabled:opacity-40 ${a.danger ? 'text-red-600' : 'text-neutral-700 hover:text-neutral-900'}`}
                            data-testid={`fulfillment-action-${a.action}`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {item.order && (
                      <div className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                        Giao đến: {item.order.customer_name} · {item.order.customer_phone} · {item.order.shipping_address}, {item.order.city}
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between font-mono text-xs">
                <Button variant="outline" size="sm" disabled={orderPage <= 1} onClick={() => setOrderPage((p) => p - 1)} className="uppercase tracking-wider">
                  &larr; Trước
                </Button>
                <span className="text-neutral-500">Trang {orderPage} / {totalOrderPages}</span>
                <Button variant="outline" size="sm" disabled={orderPage >= totalOrderPages} onClick={() => setOrderPage((p) => p + 1)} className="uppercase tracking-wider">
                  Sau &rarr;
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingAction}
        title={pendingAction ? `${pendingAction.label}?` : ''}
        body={
          pendingAction?.action === 'archived'
            ? 'Sản phẩm sẽ được lưu trữ và không còn hiển thị công khai. Bạn có thể xem lại trong lịch sử nhưng không thể đăng bán lại tin này — bạn vẫn có thể tạo tin đăng mới sau này.'
            : pendingAction?.action === 'sold'
              ? 'Sản phẩm sẽ được đánh dấu đã bán và không thể đăng bán lại. Chỉ dùng khi sản phẩm đã thực sự được bán.'
              : 'Sản phẩm sẽ tạm ẩn khỏi sàn mua bán và có thể đăng bán lại bất cứ lúc nào.'
        }
        confirmLabel={pendingAction?.label || 'Xác nhận'}
        danger={pendingAction?.action === 'sold' || pendingAction?.action === 'archived'}
        onConfirm={() => pendingAction && handleTransition(pendingAction.id, pendingAction.action)}
        onCancel={() => setPendingAction(null)}
      />
    </Container>
  );
};
