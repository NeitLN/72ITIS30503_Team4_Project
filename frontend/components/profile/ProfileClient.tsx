'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useAuth } from '../../hooks/useAuth';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';
import { getMyProfile, updateMyProfile, uploadAvatar, MyProfile } from '../../lib/profile';
import { Combobox } from '../ui/Combobox';
import { searchVnLocations, displayVnLocation } from '../../lib/vnLocations';
import { getMyImpact, ProfileImpact } from '../../lib/impact';
import { PersonalImpactCard } from '../sustainability/PersonalImpactCard';
import { listMyOrders } from '../../lib/orders';
import { formatVND, formatVietnamDateTime } from '../../lib/format';

type FormState = {
  display_name: string;
  username: string;
  bio: string;
  location: string;
};

function toForm(p: MyProfile): FormState {
  return {
    display_name: p.full_name || '',
    username: p.username || '',
    bio: p.bio || '',
    location: p.location ? displayVnLocation(p.location) : '',
  };
}

type RecentOrder = {
  id: string;
  order_code: string;
  created_at: string;
  total_amount: number;
  status: string;
};

export const ProfileClient = () => {
  const { cartCount, isHydrated: isCartHydrated } = useCart();
  const { wishlistCount, isHydrated: isWishlistHydrated } = useWishlist();
  const { isAuthenticated, isHydrated: isAuthHydrated } = useAuth();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[] | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const saveLockRef = useRef(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [impact, setImpact] = useState<ProfileImpact | null>(null);

  const isHydrated = isCartHydrated && isWishlistHydrated;

  useEffect(() => {
    if (!isAuthHydrated || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const profRes = await getMyProfile();
        if (cancelled) return;
        if (profRes.success) {
          setProfile(profRes.data);
          setForm(toForm(profRes.data));
        } else {
          setProfileError(profRes.error.message || 'Không thể tải hồ sơ.');
        }
      } catch {
        if (!cancelled) setProfileError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthHydrated, isAuthenticated]);

  useEffect(() => {
    if (!isAuthHydrated || !isAuthenticated) return;
    let cancelled = false;
    getMyImpact().then((data) => { if (!cancelled) setImpact(data); }).catch(() => undefined);
    
    // Fetch recent orders
    listMyOrders().then((res) => {
      if (!cancelled && res.data) {
        setRecentOrders(res.data.slice(0, 3));
      }
    }).catch(() => {
      if (!cancelled) setRecentOrders([]);
    });

    return () => { cancelled = true; };
  }, [isAuthHydrated, isAuthenticated]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (f: FormState): Record<string, string> => {
    const e: Record<string, string> = {};
    const name = f.display_name.trim();
    if (!name || name.length < 2) e.display_name = 'Tên hiển thị phải có ít nhất 2 ký tự.';
    else if (name.length > 60) e.display_name = 'Tên hiển thị tối đa 60 ký tự.';
    else if (!/[a-zA-Z0-9À-ỹ]/.test(name)) e.display_name = 'Tên hiển thị phải chứa chữ hoặc số, không chỉ có ký hiệu.';

    const username = f.username.trim().toLowerCase();
    if (!username) e.username = 'Chọn tên người dùng để người mua có thể tìm thấy gian hàng của bạn.';
    else if (username.length < 3 || username.length > 30) e.username = 'Tên người dùng phải có từ 3 đến 30 ký tự.';
    else if (!/^[a-z0-9_-]+$/.test(username)) e.username = 'Tên người dùng chỉ được chứa chữ thường, số, gạch dưới và gạch ngang.';

    if (f.bio.length > 500) e.bio = 'Tiểu sử tối đa 500 ký tự.';
    if (f.location.length > 100) e.location = 'Tỉnh/thành phố tối đa 100 ký tự.';
    return e;
  };

  const focusFirstError = (fieldErrors: Record<string, string>) => {
    const first = Object.keys(fieldErrors)[0];
    if (first) document.getElementById(`profile-${first}`)?.focus();
  };

  const handleSave = async () => {
    if (saveLockRef.current || !form) return;
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      return;
    }

    saveLockRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    setStatusMessage('Đang lưu hồ sơ…');

    try {
      const res = await updateMyProfile({
        display_name: form.display_name.trim(),
        username: form.username.trim().toLowerCase(),
        bio: form.bio.trim(),
        location: form.location.trim(),
      });
      if (res.success) {
        setProfile(res.data);
        setForm(toForm(res.data));
        setIsEditing(false);
        setStatusMessage('Lưu hồ sơ thành công.');
      } else {
        setSaveError(res.error.message || 'Không thể lưu hồ sơ.');
        if (res.error.details) setErrors((prev) => ({ ...prev, ...res.error.details }));
        setStatusMessage('Lưu hồ sơ không thành công. Vui lòng kiểm tra lại các lỗi bên dưới.');
      }
    } catch {
      setSaveError('Lỗi kết nối — hệ thống có thể đang tạm ngưng. Thông tin của bạn chưa bị mất.');
      setStatusMessage('Lưu hồ sơ không thành công do lỗi kết nối.');
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Ảnh vượt quá giới hạn 5MB.');
      return;
    }

    setAvatarUploading(true);
    try {
      const res = await uploadAvatar(file);
      if (res.success) {
        setProfile(res.data);
      } else {
        setAvatarError(res.error.message || 'Không thể tải lên ảnh đại diện.');
      }
    } catch {
      setAvatarError('Lỗi kết nối — hệ thống có thể đang tạm ngưng.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // ---- Auth gate ----
  if (!isAuthHydrated) {
    return <Container className="py-16 text-center animate-pulse">Đang tải tài khoản của bạn…</Container>;
  }
  if (!isAuthenticated) {
    return (
      <Container className="py-16 sm:py-24 max-w-md">
        <div className="border border-neutral-200 bg-white p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔒</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
            Đăng nhập để xem hồ sơ
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Đăng nhập hoặc tạo tài khoản để quản lý hồ sơ của bạn — bạn sẽ được đưa trở lại đây ngay sau đó.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.PROFILE}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">Đăng nhập</Button>
            </Link>
            <Link href={`${ROUTES.REGISTER}?redirect=${ROUTES.PROFILE}`}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider">Tạo tài khoản</Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }
  if (profileLoading) {
    return <Container className="py-16 text-center animate-pulse">Đang tải hồ sơ của bạn…</Container>;
  }
  if (profileError || !profile || !form) {
    return (
      <Container className="py-16 max-w-md text-center">
        <p role="alert" className="text-sm text-red-600 mb-4">{profileError || 'Không thể tải hồ sơ của bạn.'}</p>
        <Button onClick={() => window.location.reload()} className="font-mono text-xs uppercase tracking-wider">Thử lại</Button>
      </Container>
    );
  }

  const initial = (profile.full_name || profile.email || 'U').charAt(0).toUpperCase();

  const ordersProcessingCount = recentOrders ? recentOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length : 0;
  const ordersCompletedCount = recentOrders ? recentOrders.filter(o => o.status === 'completed').length : 0;

  return (
    <div className="bg-neutral-50 min-h-screen pb-16">
      <div aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Hero Redesign */}
      <section className="border-b border-neutral-200 bg-white pt-8 pb-10 sm:pt-12 sm:pb-12 shadow-sm">
        <Container>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            
            <div className="flex items-center gap-5 min-w-0">
              {/* Avatar */}
              <div className="relative shrink-0 group">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={`Ảnh đại diện của ${profile.full_name}`}
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border border-neutral-200 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-900 font-display text-3xl font-extrabold text-white">
                    {initial}
                  </div>
                )}
                <label
                  htmlFor="avatar-input"
                  className="absolute bottom-0 right-0 flex h-7 w-7 sm:h-8 sm:w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 text-neutral-600 focus-within:ring-2 focus-within:ring-neutral-900 focus-within:ring-offset-2"
                  aria-label={avatarUploading ? 'Đang tải lên' : 'Đổi ảnh đại diện'}
                >
                  {avatarUploading ? (
                    <span className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
                  ) : (
                    <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </label>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                  className="sr-only"
                  title="Đổi ảnh đại diện"
                />
                {avatarError && <p role="alert" className="mt-1 text-[11px] text-red-600 w-[100px] text-center absolute -bottom-6 left-1/2 -translate-x-1/2">{avatarError}</p>}
              </div>

              {/* Information Hierarchy */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl truncate leading-none">{profile.full_name}</h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mb-2">
                  {profile.username && (
                    <span className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 text-neutral-700">@{profile.username}</span>
                  )}
                  {profile.location && (
                    <span className="flex items-center gap-1">📍 {displayVnLocation(profile.location)}</span>
                  )}
                  <span className="flex items-center gap-1">• Tham gia {new Date(profile.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit' })}</span>
                </div>
                
                {profile.bio && <p className="text-sm text-neutral-600 line-clamp-2">&ldquo;{profile.bio}&rdquo;</p>}
              </div>
            </div>

            {/* Compact Primary Actions */}
            <div className="flex flex-wrap gap-2 shrink-0 sm:w-auto">
              <Button data-testid="profile-edit-toggle" onClick={() => setIsEditing((v) => !v)} variant={isEditing ? 'outline' : 'primary'} size="sm" className="font-mono text-[11px] uppercase tracking-wider">
                {isEditing ? 'Hủy' : 'Chỉnh sửa hồ sơ'}
              </Button>
            </div>

          </div>
        </Container>
      </section>

      <Container className="mt-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          
          {/* Conditional Profile Editing Form */}
          {isEditing && (
            <section className="border border-neutral-200 bg-white p-6 sm:p-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-6">
                Chỉnh sửa hồ sơ
              </h2>
              {saveError && (
                <div role="alert" className="mb-6 border border-red-300 bg-red-50 p-4 text-sm text-red-700">{saveError}</div>
              )}
              <div className="space-y-6">
                <div>
                  <label htmlFor="profile-display_name" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tên hiển thị *</label>
                  <input
                    id="profile-display_name" type="text" value={form.display_name}
                    onChange={(e) => setField('display_name', e.target.value)}
                    aria-invalid={!!errors.display_name} aria-describedby={errors.display_name ? 'profile-display_name-error' : undefined}
                    className={`w-full border ${errors.display_name ? 'border-red-500' : 'border-neutral-300'} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors.display_name && <p id="profile-display_name-error" className="text-red-500 text-xs mt-1">{errors.display_name}</p>}
                </div>
                <div>
                  <label htmlFor="profile-username" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tên người dùng *</label>
                  <input
                    id="profile-username" type="text" value={form.username}
                    onChange={(e) => setField('username', e.target.value)}
                    placeholder="chữ-thường-số-và-gạch-ngang"
                    aria-invalid={!!errors.username} aria-describedby={errors.username ? 'profile-username-error' : undefined}
                    className={`w-full border ${errors.username ? 'border-red-500' : 'border-neutral-300'} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors.username && <p id="profile-username-error" className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>
                <div>
                  <label htmlFor="profile-bio" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tiểu sử</label>
                  <textarea
                    id="profile-bio" value={form.bio} onChange={(e) => setField('bio', e.target.value)}
                    rows={4} aria-invalid={!!errors.bio} aria-describedby={errors.bio ? 'profile-bio-error' : undefined}
                    className={`w-full border ${errors.bio ? 'border-red-500' : 'border-neutral-300'} px-3.5 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none`}
                  />
                  {errors.bio && <p id="profile-bio-error" className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                </div>
                <div>
                  <label htmlFor="profile-location" className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Tỉnh/Thành phố</label>
                  <Combobox
                    id="profile-location"
                    value={form.location}
                    onChange={(v) => setField('location', v)}
                    getOptions={searchVnLocations}
                    placeholder="Tìm tỉnh/thành phố..."
                    ariaInvalid={!!errors.location}
                    ariaDescribedBy={errors.location ? 'profile-location-error' : undefined}
                    emptyMessage="Không tìm thấy tỉnh/thành phố phù hợp."
                  />
                  {errors.location && <p id="profile-location-error" className="text-red-500 text-xs mt-1">{errors.location}</p>}
                </div>
                <div className="pt-4 border-t border-neutral-100 flex justify-end">
                  <Button data-testid="profile-save" onClick={handleSave} disabled={isSaving} aria-busy={isSaving} className="font-mono text-xs uppercase tracking-wider">
                    {isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* 1. Shopping Overview */}
          <section>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">Tổng quan mua sắm</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Link href={ROUTES.ORDERS} className="border border-neutral-200 bg-white p-4 hover:border-neutral-900 transition-colors block">
                <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Đơn đang xử lý</p>
                <p className="font-display text-2xl font-bold">{recentOrders !== null ? ordersProcessingCount : '-'}</p>
              </Link>
              <Link href={ROUTES.ORDERS} className="border border-neutral-200 bg-white p-4 hover:border-neutral-900 transition-colors block">
                <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Đơn đã hoàn tất</p>
                <p className="font-display text-2xl font-bold">{recentOrders !== null ? ordersCompletedCount : '-'}</p>
              </Link>
              <Link href={ROUTES.WISHLIST} className="border border-neutral-200 bg-white p-4 hover:border-neutral-900 transition-colors block">
                <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Sản phẩm yêu thích</p>
                <p className="font-display text-2xl font-bold">{isHydrated ? wishlistCount : '-'}</p>
              </Link>
              <Link href={ROUTES.CART} className="border border-neutral-200 bg-white p-4 hover:border-neutral-900 transition-colors block">
                <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Đang trong giỏ</p>
                <p className="font-display text-2xl font-bold">{isHydrated ? cartCount : '-'}</p>
              </Link>
            </div>
          </section>

          {/* 2. Recent Orders */}
          <section className="border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-900 font-bold">Đơn hàng gần đây</h2>
              <Link href={ROUTES.ORDERS} className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-900 underline">Xem tất cả</Link>
            </div>
            
            {recentOrders === null ? (
              <p className="text-sm text-neutral-500 animate-pulse py-4">Đang tải đơn hàng…</p>
            ) : recentOrders.length === 0 ? (
              <div className="py-6 text-center text-sm text-neutral-500">
                <p className="mb-3">Bạn chưa có đơn hàng nào.</p>
                <Link href={ROUTES.SHOP}>
                  <Button variant="outline" size="sm" className="font-mono text-[11px] uppercase tracking-wider">Bắt đầu mua sắm</Button>
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {recentOrders.map((order) => (
                  <li key={order.id} className="flex gap-4 p-3 bg-neutral-50 border border-neutral-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 text-sm line-clamp-1 mb-1">Đơn hàng {order.order_code}</p>
                      <p className="text-xs text-neutral-500 mb-2">
                        {formatVietnamDateTime(order.created_at)} · {formatVND(order.total_amount)}
                      </p>
                      <span className="inline-block font-mono text-[10px] uppercase tracking-wider bg-white border border-neutral-200 px-2 py-0.5">
                        {order.status}
                      </span>
                    </div>
                    <Link href={`${ROUTES.ORDERS}/${order.id}`} className="shrink-0 flex items-center">
                      <Button variant="outline" size="sm" className="font-mono text-[10px] uppercase tracking-wider">Chi tiết</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          
          {/* 3. Circular Impact */}
          {impact ? <PersonalImpactCard impact={impact} /> : null}

        </div>
      </Container>
    </div>
  );
};
