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
    const e = new Error('Database is not configured');
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
  if (!value) return { error: 'Username is required.' };
  if (value.length < USERNAME_MIN) return { error: `Username must be at least ${USERNAME_MIN} characters.` };
  if (value.length > USERNAME_MAX) return { error: `Username must be at most ${USERNAME_MAX} characters.` };
  if (!USERNAME_RE.test(value)) return { error: 'Username may only contain lowercase letters, numbers, underscores, and hyphens.' };
  if (RESERVED_USERNAMES.has(value)) return { error: 'This username is reserved.' };
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
    const e = new Error('User not found');
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
    if (!name || name.length < DISPLAY_NAME_MIN) errors.display_name = `Display name must be at least ${DISPLAY_NAME_MIN} characters.`;
    else if (name.length > DISPLAY_NAME_MAX) errors.display_name = `Display name must be under ${DISPLAY_NAME_MAX} characters.`;
    else if (!/[a-zA-Z0-9À-ỹ]/.test(name)) errors.display_name = 'Display name must contain more than just symbols.';
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
    if (bio.length > BIO_MAX) errors.bio = `Bio must be under ${BIO_MAX} characters.`;
    else updates.bio = bio || null;
  }

  if (rawFields.location !== undefined) {
    const location = String(rawFields.location || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F<>]/g, '').trim();
    if (location.length > LOCATION_MAX) errors.location = `Location must be under ${LOCATION_MAX} characters.`;
    else updates.location = location || null;
  }

  if (Object.keys(errors).length) throw new ProfileValidationError('Profile validation failed', errors);

  if (normalizedUsername) {
    const { data: conflict, error: cErr } = await supabaseAdmin
      .from('users').select('id').eq('username', normalizedUsername).neq('id', userId).maybeSingle();
    if (cErr) throw cErr;
    if (conflict) {
      const e = new Error('Username is already taken.');
      e.status = 409;
      e.fieldErrors = { username: 'This username is already taken.' };
      throw e;
    }
    updates.username = normalizedUsername;
  }

  const { data, error } = await supabaseAdmin.from('users').update(updates).eq('id', userId).select().maybeSingle();
  if (error) {
    if (error.code === '23505') {
      const e = new Error('Username is already taken.');
      e.status = 409;
      e.fieldErrors = { username: 'This username is already taken.' };
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
    const e = new Error('An image file is required.');
    e.status = 422; e.fieldErrors = { avatar: 'An image file is required.' };
    throw e;
  }
  if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
    const e = new Error('Unsupported file type.');
    e.status = 422; e.fieldErrors = { avatar: 'Only JPEG, PNG, and WebP images are allowed.' };
    throw e;
  }
  if (!file.buffer || file.buffer.length === 0) {
    const e = new Error('Empty file.');
    e.status = 422; e.fieldErrors = { avatar: 'The uploaded file is empty or corrupt.' };
    throw e;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    const e = new Error('File too large.');
    e.status = 422; e.fieldErrors = { avatar: 'Image exceeds the 5MB limit.' };
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
    const e = new Error('Avatar upload failed: ' + upErr.message);
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

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  ProfileValidationError,
  RESERVED_USERNAMES,
  normalizeUsername,
  isValidUsernameFormat,
  validateUsername,
  ALLOWED_AVATAR_MIME,
  MAX_AVATAR_BYTES,
};
