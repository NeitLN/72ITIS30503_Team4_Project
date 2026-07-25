/**
 * Phase 8 — authenticated profile CRUD + avatar upload.
 *
 * Security model: the caller (routes/profile.js) has already run every
 * request through `authenticateUser` + `requireAuth`, so `userId` here is
 * always the verified `req.user.id` from the backend's own signed session
 * token — never anything from the request body. All writes use the
 * service-role client (bypasses RLS), same trusted pattern as Phase 7's
 * listing creation; the key never reaches the frontend.
 */
const crypto = require('crypto');
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { isKnownLocation } = require('../constants/vnLocations');

const AVATAR_BUCKET = 'avatars';
const ALLOWED_AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_RE = /^[a-z0-9_-]+$/;
const DISPLAY_NAME_MIN = 2;
const DISPLAY_NAME_MAX = 60;
const BIO_MAX = 500;
const LOCATION_MAX = 100;

// Adapted to this app's actual top-level routes (frontend/app/*) plus a few
// generic reservations for safety.
const RESERVED_USERNAMES = new Set([
  'about', 'admin', 'api', 'auth', 'cart', 'category', 'checkout', 'contact',
  'delivery-terms', 'login', 'logout', 'orders', 'privacy-policy', 'products',
  'profile', 'register', 'sell', 'seller', 'sellers', 'shop', 'wishlist',
  'settings', 'help', 'terms', 'static', '_next', 'favicon', 'robots',
  'sitemap', 'www', 'support', 'null', 'undefined', 'me', 'admin-orders',
  'dashboard',
]);

class ProfileValidationError extends Error {
  constructor(message, fieldErrors) {
    super(message);
    this.status = 422;
    this.fieldErrors = fieldErrors || {};
  }
}

function checkDb() {
  if (!isSupabaseAdminConfigured()) {
    const e = new Error('Hệ thống chưa được cấu hình.');
    e.status = 503;
    throw e;
  }
}

function normalizeUsername(input) {
  return String(input || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, USERNAME_MAX);
}

function isValidUsernameFormat(u) {
  return typeof u === 'string' && u.length >= USERNAME_MIN && u.length <= USERNAME_MAX && USERNAME_RE.test(u);
}

// Strict validation for USER-SUPPLIED usernames: only case-folds and trims
// surrounding whitespace — never strips/replaces bad characters or
// truncates, unlike `normalizeUsername` (which is a generator for the
// backfill script, sanitizing arbitrary display names into candidates).
// Bad input here must be rejected, not silently "fixed".
function validateUsername(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return { error: 'Vui lòng nhập tên người dùng.' };
  if (value.length < USERNAME_MIN) return { error: `Tên người dùng phải có ít nhất ${USERNAME_MIN} ký tự.` };
  if (value.length > USERNAME_MAX) return { error: `Tên người dùng tối đa ${USERNAME_MAX} ký tự.` };
  if (!USERNAME_RE.test(value)) return { error: 'Tên người dùng chỉ được chứa chữ thường, số, gạch dưới và gạch ngang.' };
  if (RESERVED_USERNAMES.has(value)) return { error: 'Tên người dùng này đã được hệ thống dùng riêng.' };
  return { value };
}

const SAFE_ME_FIELDS = ['id', 'email', 'full_name', 'username', 'bio', 'location', 'avatar_url', 'role', 'created_at', 'updated_at'];

function projectMe(row) {
  const out = {};
  for (const f of SAFE_ME_FIELDS) out[f] = row[f] ?? null;
  return out;
}

async function getMyProfile(userId) {
  checkDb();
  const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const e = new Error('Không tìm thấy người dùng.');
    e.status = 404;
    throw e;
  }
  return projectMe(data);
}

async function updateMyProfile(userId, rawFields) {
  checkDb();
  const errors = {};
  const updates = { updated_at: new Date().toISOString() };

  // Only these fields are ever considered — role/is_verified/rating/email/
  // password/created_at/id supplied in the body are silently ignored, never
  // read into `updates`.
  if (rawFields.display_name !== undefined) {
    const name = String(rawFields.display_name || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F<>]/g, '').trim();
    if (!name || name.length < DISPLAY_NAME_MIN) errors.display_name = `Tên hiển thị phải có ít nhất ${DISPLAY_NAME_MIN} ký tự.`;
    else if (name.length > DISPLAY_NAME_MAX) errors.display_name = `Tên hiển thị tối đa ${DISPLAY_NAME_MAX} ký tự.`;
    else if (!/[a-zA-Z0-9À-ỹ]/.test(name)) errors.display_name = 'Tên hiển thị phải chứa chữ hoặc số, không chỉ có ký hiệu.';
    else updates.full_name = name;
  }

  let normalizedUsername = null;
  if (rawFields.username !== undefined) {
    const { value, error } = validateUsername(rawFields.username);
    if (error) errors.username = error;
    else normalizedUsername = value;
  }

  if (rawFields.bio !== undefined) {
    const bio = String(rawFields.bio || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F<>]/g, '').trim();
    if (bio.length > BIO_MAX) errors.bio = `Tiểu sử tối đa ${BIO_MAX} ký tự.`;
    else updates.bio = bio || null;
  }

  if (rawFields.location !== undefined) {
    const location = String(rawFields.location || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F<>]/g, '').trim();
    if (location.length > LOCATION_MAX) errors.location = `Tỉnh/thành phố tối đa ${LOCATION_MAX} ký tự.`;
    else if (location && !isKnownLocation(location)) errors.location = 'Vui lòng chọn một tỉnh/thành phố hợp lệ trong danh sách.';
    else updates.location = location || null;
  }

  if (Object.keys(errors).length) throw new ProfileValidationError('Vui lòng kiểm tra lại thông tin hồ sơ.', errors);

  if (normalizedUsername) {
    const { data: conflict, error: cErr } = await supabaseAdmin
      .from('users').select('id').eq('username', normalizedUsername).neq('id', userId).maybeSingle();
    if (cErr) throw cErr;
    if (conflict) {
      const e = new Error('Tên người dùng đã được sử dụng.');
      e.status = 409;
      e.fieldErrors = { username: 'Tên người dùng này đã được sử dụng.' };
      throw e;
    }
    updates.username = normalizedUsername;
  }

  const { data, error } = await supabaseAdmin.from('users').update(updates).eq('id', userId).select().maybeSingle();
  if (error) {
    if (error.code === '23505') {
      const e = new Error('Tên người dùng đã được sử dụng.');
      e.status = 409;
      e.fieldErrors = { username: 'Tên người dùng này đã được sử dụng.' };
      throw e;
    }
    throw error;
  }
  return projectMe(data);
}

function extFromMime(mimetype) {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'jpg';
}

async function uploadAvatar(userId, file) {
  checkDb();
  if (!file) {
    const e = new Error('Vui lòng chọn một ảnh đại diện.');
    e.status = 422; e.fieldErrors = { avatar: 'Vui lòng chọn một ảnh đại diện.' };
    throw e;
  }
  if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
    const e = new Error('Định dạng ảnh không được hỗ trợ.');
    e.status = 422; e.fieldErrors = { avatar: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.' };
    throw e;
  }
  if (!file.buffer || file.buffer.length === 0) {
    const e = new Error('Ảnh bị trống hoặc lỗi.');
    e.status = 422; e.fieldErrors = { avatar: 'Ảnh bị trống hoặc lỗi.' };
    throw e;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    const e = new Error('Ảnh quá lớn.');
    e.status = 422; e.fieldErrors = { avatar: 'Ảnh vượt quá giới hạn 5MB.' };
    throw e;
  }

  const { data: userRow, error: userErr } = await supabaseAdmin.from('users').select('avatar_url').eq('id', userId).maybeSingle();
  if (userErr) throw userErr;

  const ext = extFromMime(file.mimetype);
  const objectPath = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (upErr) {
    // Never propagate the raw Storage error message to the client.
    console.error('Avatar upload failed:', upErr.message);
    const e = new Error('Không thể tải lên ảnh đại diện. Vui lòng thử lại.');
    e.status = 500;
    throw e;
  }

  const { data: pub } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
  const newUrl = pub.publicUrl;

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('users')
    .update({ avatar_url: newUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (updErr) {
    // DB update failed — remove the object we just uploaded (never leave an
    // orphaned Storage object with no corresponding profile reference).
    await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([objectPath]).catch(() => {});
    throw updErr;
  }

  // Delete the previous avatar object, but ONLY if it's confirmed to belong
  // to this same user in this same bucket — never a default/shared asset,
  // never another user's object.
  const prevUrl = userRow && userRow.avatar_url;
  if (prevUrl) {
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const idx = prevUrl.indexOf(marker);
    if (idx !== -1) {
      const prevPath = prevUrl.slice(idx + marker.length);
      if (prevPath.startsWith(`avatars/${userId}/`) && prevPath !== objectPath) {
        await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([prevPath]).catch(() => {});
      }
    }
  }

  return projectMe(updated);
}

async function getMyReadiness(userId) {
  checkDb();
  const profile = await getMyProfile(userId);

  const { count: draftCount, error: draftErr } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', userId)
    .eq('status', 'draft')
    .eq('listing_source', 'user');
  if (draftErr) throw draftErr;

  const { count: activeCount, error: activeErr } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', userId)
    .eq('status', 'active')
    .eq('listing_source', 'user');
  if (activeErr) throw activeErr;

  const steps = [
    {
      key: 'username',
      label: 'Đặt tên gian hàng',
      completed: !!profile.username,
      actionLabel: 'Cập nhật',
      actionHref: '/profile',
    },
    {
      key: 'avatar',
      label: 'Thêm ảnh đại diện',
      completed: !!profile.avatar_url,
      actionLabel: 'Cập nhật',
      actionHref: '/profile',
    },
    {
      key: 'bio',
      label: 'Viết giới thiệu gian hàng',
      completed: !!profile.bio,
      actionLabel: 'Cập nhật',
      actionHref: '/profile',
    },
    {
      key: 'location',
      label: 'Thêm vị trí',
      completed: !!profile.location,
      actionLabel: 'Cập nhật',
      actionHref: '/profile',
    },
    {
      key: 'first_listing',
      label: 'Đăng sản phẩm đầu tiên',
      completed: (activeCount || 0) > 0 || (draftCount || 0) > 0,
      actionLabel: 'Đăng bán',
      actionHref: '/sell',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSupportedSteps = steps.length;
  const completionPercentage = Math.round((completedCount / totalSupportedSteps) * 100);

  return {
    completionPercentage,
    completedCount,
    totalSupportedSteps,
    isStorefrontAvailable: !!profile.username,
    hasDraftListing: (draftCount || 0) > 0,
    hasActiveListing: (activeCount || 0) > 0,
    steps,
  };
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  getMyReadiness,
  ProfileValidationError,
  RESERVED_USERNAMES,
  normalizeUsername,
  isValidUsernameFormat,
  validateUsername,
  ALLOWED_AVATAR_MIME,
  MAX_AVATAR_BYTES,
};
