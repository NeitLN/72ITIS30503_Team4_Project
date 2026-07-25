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
import { EN } from '../../lib/i18n';
import { getMyImpact, ProfileImpact } from '../../lib/impact';
import { PersonalImpactCard } from '../sustainability/PersonalImpactCard';
import { SellerReadinessWidget } from '../seller/SellerReadinessWidget';

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

export const ProfileClient = () => {
  const { cartCount, isHydrated: isCartHydrated } = useCart();
  const { wishlistCount, isHydrated: isWishlistHydrated } = useWishlist();
  const { isAuthenticated, isHydrated: isAuthHydrated } = useAuth();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

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
        const res = await getMyProfile();
        if (cancelled) return;
        if (res.success) {
          setProfile(res.data);
          setForm(toForm(res.data));
        } else {
          setProfileError(res.error.message || 'Failed to load your profile.');
        }
      } catch {
        if (!cancelled) setProfileError('Network error — the backend may be offline.');
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

  return (
    <div className="bg-neutral-50 min-h-screen pb-16">
      <div aria-live="polite" className="sr-only">{statusMessage}</div>

      <section className="border-b border-neutral-200 bg-white pt-10 pb-12 sm:pt-16 sm:pb-16 shadow-sm">
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            <div className="relative shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={`Ảnh đại diện của ${profile.full_name}`}
                  className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-neutral-950 object-cover shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center border-2 border-neutral-950 bg-neutral-950 font-display text-4xl font-extrabold text-white sm:h-28 sm:w-28 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {initial}
                </div>
              )}
              <label
                htmlFor="avatar-input"
                className="mt-2 block cursor-pointer text-center font-mono text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
              >
                {avatarUploading ? 'Đang tải lên…' : 'Đổi ảnh'}
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
                className="sr-only"
              />
              {avatarError && <p role="alert" className="mt-1 text-[11px] text-red-600 max-w-[7rem] text-center">{avatarError}</p>}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl truncate">{profile.full_name}</h1>
                {profile.username && (
                  <span className="font-mono text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5">@{profile.username}</span>
                )}
              </div>
              {profile.bio && <p className="mt-3 max-w-2xl text-sm text-neutral-600 leading-relaxed italic">&ldquo;{profile.bio}&rdquo;</p>}
              <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-neutral-500 border-t border-neutral-100 pt-4">
                {profile.location && (
                  <span className="flex items-center gap-1.5">📍 <strong className="text-neutral-900 font-semibold">{displayVnLocation(profile.location)}</strong></span>
                )}
                <span className="flex items-center gap-1.5 text-neutral-500">
                  Tham gia từ {new Date(profile.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', timeZone: 'Asia/Ho_Chi_Minh' })}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0 sm:w-48">
              <Button data-testid="profile-edit-toggle" onClick={() => setIsEditing((v) => !v)} variant={isEditing ? 'outline' : 'primary'} className="w-full font-mono text-xs uppercase tracking-wider">
                {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
              </Button>
              {profile.username ? (
                <>
                  <Link href={`/seller/${profile.username}`} className="w-full" data-testid="profile-view-storefront">
                    <Button variant="outline" className="w-full font-mono text-xs uppercase tracking-wider">Xem gian hàng công khai</Button>
                  </Link>
                  <Link href={ROUTES.SELLER_DASHBOARD} className="w-full">
                    <Button variant="outline" className="w-full font-mono text-xs uppercase tracking-wider text-neutral-600">Vào kênh người bán</Button>
                  </Link>
                </>
              ) : (
                <p className="text-[11px] text-neutral-500 text-center">Đặt tên người dùng để mở gian hàng công khai.</p>
              )}
              <Link href={ROUTES.SELL} className="w-full">
                <Button variant="outline" className="w-full font-mono text-xs uppercase tracking-wider">Bắt đầu bán hàng</Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Container className="mt-10 sm:mt-14">
        {impact ? <PersonalImpactCard impact={impact} /> : null}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 flex flex-col gap-8">
            <SellerReadinessWidget />
            {isEditing ? (
              <section className="border border-neutral-200 bg-white p-6 sm:p-8">
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
            ) : (
              <section>
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">Tổng quan</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="border border-neutral-200 bg-white p-4">
                    <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Sản phẩm yêu thích</p>
                    <p className="font-display text-2xl font-bold">{isHydrated ? wishlistCount : '-'}</p>
                  </div>
                  <div className="border border-neutral-200 bg-white p-4">
                    <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Sản phẩm trong giỏ</p>
                    <p className="font-display text-2xl font-bold">{isHydrated ? cartCount : '-'}</p>
                  </div>
                  <div className="border border-neutral-200 bg-white p-4">
                    <p className="font-mono text-[10px] uppercase text-neutral-500 mb-1">Tin đăng đang bán</p>
                    <p className="font-display text-2xl font-bold">{impact?.metrics.activeUserListings ?? '-'}</p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <section className="border border-neutral-200 bg-white p-6">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-900 font-bold mb-4">Hoạt động mua sắm</h2>
              <ul className="space-y-3 mb-6 font-medium text-sm">
                <li><Link href={ROUTES.CART} className="text-neutral-600 hover:text-neutral-900">→ Xem giỏ hàng</Link></li>
                <li><Link href={ROUTES.WISHLIST} className="text-neutral-600 hover:text-neutral-900">→ Xem danh sách yêu thích</Link></li>
                <li><Link href={ROUTES.SHOP} className="text-neutral-600 hover:text-neutral-900">→ Khám phá sàn mua bán</Link></li>
              </ul>
              <div className="bg-neutral-50 p-3 text-xs text-neutral-500 leading-relaxed border border-neutral-100">
                <p className="mb-2">Xem lịch sử đặt hàng và trạng thái đơn hàng thực tế trong Đơn hàng của tôi.</p>
                <Link href={ROUTES.ORDERS}>
                  <Button variant="outline" size="sm" className="font-mono text-[10px] uppercase tracking-wider">Đơn hàng của tôi</Button>
                </Link>
              </div>
            </section>

            <section className="border border-neutral-950 bg-neutral-950 text-white p-6 shadow-[4px_4px_0px_0px_rgba(200,200,200,1)]">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] font-bold mb-2">{EN.sell.hubEyebrow}</h2>
              <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                Biến những món đồ thời trang mới hoặc đã qua sử dụng — thuộc mọi thương hiệu, mọi phong cách — thành thu nhập. Chỉ mất vài phút để đăng bán tới cộng đồng.
              </p>
              <Link href={ROUTES.SELL} className="block w-full">
                <button className="w-full bg-white text-neutral-900 px-4 py-2 font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-200 transition-colors">
                  ĐĂNG SẢN PHẨM
                </button>
              </Link>
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
};
