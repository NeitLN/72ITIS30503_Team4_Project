const { supabase, isSupabaseConfigured } = require('../lib/supabase');
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');

const checkDb = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

const getBrands = async () => {
  checkDb();

  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, logo_url, is_active, source, verification_status')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Brand options for the customer-facing Shop filter — active brands that
 * actually have at least one active product, so the dropdown never offers
 * an option with zero results. Uses the public (anon) client: both
 * `products` (status='active') and `brands` (is_active=true) already have
 * public-read RLS policies, so this needs no service-role access.
 */
const getShopFilterBrands = async () => {
  checkDb();

  const { data: activeProducts, error: prodErr } = await supabase
    .from('products')
    .select('brand_id')
    .eq('status', 'active')
    .not('brand_id', 'is', null);
  if (prodErr) throw prodErr;

  const brandIds = [...new Set((activeProducts || []).map((p) => p.brand_id))];
  if (!brandIds.length) return [];

  const { data: brands, error: brandErr } = await supabase
    .from('brands')
    .select('id, name, slug, source, verification_status')
    .eq('is_active', true)
    .in('id', brandIds)
    .order('name', { ascending: true });
  if (brandErr) throw brandErr;
  return brands || [];
};

// ---------------------------------------------------------------------------
// Phase 8.1 — free-text seller brand input with race-safe dedupe.
//
// The live `brands` table has plain case-sensitive unique constraints on
// both `name` and `slug` (no citext, no lower() functional index) — so
// "Nike"/"NIKE"/" nike " would otherwise create three distinct rows.
// Case-insensitive matching therefore happens in application code, and the
// actual create-if-missing step uses `.upsert(..., { onConflict: 'slug',
// ignoreDuplicates: true })`, which is a single atomic
// `INSERT ... ON CONFLICT (slug) DO NOTHING` at the database level — race-
// safe without any application-level locking. Whichever concurrent request
// wins the race has its casing preserved forever; every other request
// (including differently-cased retries of the same name) resolves to that
// same row via the fallback SELECT below.
// ---------------------------------------------------------------------------

const BRAND_NAME_MAX = 60;
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const HTML_TAG_RE = /<[^>]*>/;
const UNBRANDED_VALUES = new Set(['', 'không có thương hiệu', 'khong co thuong hieu', 'no brand', 'unbranded']);

function normalizeForCompare(name) {
  // NFC normalization first so a Vietnamese name typed with combining marks
  // (e.g. a decomposed "ệ") compares equal to the same name typed with
  // precomposed characters — pure Unicode-form safety, not accent-folding:
  // distinct accented brand names (e.g. "Đế" vs "De") still compare
  // different here, exactly as before. Case-folding and whitespace
  // collapsing are the only other normalizations applied.
  return String(name || '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Validates raw seller-typed brand text. Returns { value } where value is
 * the cleaned display name to resolve/create, or `null` for the explicit
 * "unbranded" choice — or { error } with a safe Vietnamese message. */
function validateBrandInput(raw) {
  if (raw == null) return { value: null };
  const original = String(raw);
  if (CONTROL_CHAR_RE.test(original)) {
    return { error: 'Tên thương hiệu chứa ký tự không hợp lệ.' };
  }
  if (HTML_TAG_RE.test(original)) {
    return { error: 'Tên thương hiệu không được chứa mã HTML.' };
  }
  const cleaned = original.trim().replace(/\s+/g, ' ');
  if (UNBRANDED_VALUES.has(normalizeForCompare(cleaned))) return { value: null };
  if (!cleaned) return { value: null };
  if (cleaned.length > BRAND_NAME_MAX) {
    return { error: `Tên thương hiệu tối đa ${BRAND_NAME_MAX} ký tự.` };
  }
  if (!/[a-zA-Z0-9À-ỹ]/.test(cleaned)) {
    return { error: 'Tên thương hiệu phải chứa ký tự chữ hoặc số.' };
  }
  return { value: cleaned };
}

function slugifyBrand(name) {
  return String(name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'brand';
}

function projectBrand(row) {
  return {
    brandId: row.id,
    brandName: row.name,
    brandSource: row.source || 'catalog',
    brandVerificationStatus: row.verification_status || 'verified',
  };
}

/**
 * Resolves seller-typed brand text to a real brand row, creating one
 * race-safely if it's genuinely new. Returns
 * `{ brandId, brandName, brandSource, brandVerificationStatus }` —
 * `brandId` is null for the explicit unbranded choice.
 *
 * `createdBy` must always come from the caller's own verified
 * `req.user.id` (never from request body/query) — it is the only source of
 * `brands.created_by` for a newly-created row. A brand this function
 * CREATES is always stamped `source: 'seller_declared'`,
 * `verification_status: 'pending'` — never anything the client supplies,
 * and never `verified`. There is no code path here through which a caller
 * can request a verified brand or spoof a different creator.
 */
async function resolveOrCreateBrand(rawInput, { createdBy = null } = {}) {
  if (!isSupabaseAdminConfigured()) {
    const e = new Error('Database is not configured');
    e.status = 503;
    throw e;
  }

  const { value: cleaned, error: validationError } = validateBrandInput(rawInput);
  if (validationError) {
    const e = new Error(validationError);
    e.status = 422;
    e.fieldErrors = { brand: validationError };
    throw e;
  }
  if (cleaned === null) {
    return { brandId: null, brandName: 'Không có thương hiệu', brandSource: null, brandVerificationStatus: null };
  }

  const { data: allBrands, error: listErr } = await supabaseAdmin
    .from('brands')
    .select('id, name, is_active, source, verification_status');
  if (listErr) throw listErr;

  const target = normalizeForCompare(cleaned);
  const existing = (allBrands || []).find(
    (b) => b.is_active !== false && normalizeForCompare(b.name) === target,
  );
  if (existing) return projectBrand(existing);

  const slug = slugifyBrand(cleaned);
  const { data: inserted, error: upsertErr } = await supabaseAdmin
    .from('brands')
    .upsert({
      name: cleaned,
      slug,
      is_active: true,
      source: 'seller_declared',
      verification_status: 'pending',
      created_by: createdBy,
    }, { onConflict: 'slug', ignoreDuplicates: true })
    .select('id, name, source, verification_status');
  if (upsertErr) throw upsertErr;

  if (inserted && inserted.length) {
    return projectBrand(inserted[0]);
  }

  // A concurrent request won the race on this exact slug — fetch its row
  // (preserving whichever casing/provenance it created first) instead of
  // erroring or creating a second row.
  const { data: winner, error: winnerErr } = await supabaseAdmin
    .from('brands')
    .select('id, name, source, verification_status')
    .eq('slug', slug)
    .maybeSingle();
  if (winnerErr) throw winnerErr;
  if (winner) return projectBrand(winner);

  const e = new Error('Không thể tạo thương hiệu. Vui lòng thử lại.');
  e.status = 500;
  throw e;
}

module.exports = {
  getBrands,
  getShopFilterBrands,
  resolveOrCreateBrand,
  validateBrandInput,
  normalizeForCompare,
  BRAND_NAME_MAX,
};
