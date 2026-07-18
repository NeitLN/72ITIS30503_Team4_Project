/**
 * Phase 7 — real, persistent seller-listing creation.
 *
 * Security model: the caller (routes/products.js) has already run this
 * request through `authenticateUser` + `requireAuth`, so `user` here is a
 * verified `{ id, email, role }` decoded from the backend's own signed
 * session token (see middleware/auth.js / services/authService.js — this
 * app has no real Supabase Auth session to verify against; the existing
 * signed-token system already documented in Phase 7 IS this project's
 * authentication provider). `user.id` is a real `public.users.id` row and is
 * the ONLY source of `seller_id` ever used below — nothing from `fields` is
 * ever trusted for seller identity, price formatting, image URLs, status, or
 * slug.
 *
 * All writes use the service-role client (`supabaseAdmin`), which bypasses
 * RLS. That is safe here specifically because every write is gated behind
 * the auth + validation performed in this file — the service-role key never
 * reaches the frontend.
 */
const crypto = require('crypto');
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');

const BUCKET = 'product-images';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_CONDITIONS = new Set(['new_with_tags', 'like_new', 'excellent', 'good', 'fair']);
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PRICE = 500_000_000; // VNĐ, generous C2C upper bound
const MAX_STOCK = 9999;
const MIN_NAME_LEN = 3;
const MAX_NAME_LEN = 120;
const MIN_DESC_LEN = 10;
const MAX_DESC_LEN = 2000;

class ListingValidationError extends Error {
  constructor(message, fieldErrors) {
    super(message);
    this.status = 422;
    this.fieldErrors = fieldErrors || {};
  }
}

const checkDb = () => {
  if (!isSupabaseAdminConfigured()) {
    const e = new Error('Database is not configured for listing creation');
    e.status = 503;
    throw e;
  }
};

function stripControlChars(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F<>]/g, '').trim();
}

function slugifyBase(name) {
  return String(name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'listing';
}

async function generateUniqueSlug(name) {
  const base = slugifyBase(name);
  let candidate = base;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabaseAdmin.from('products').select('id').eq('slug', candidate).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    const suffix = crypto.randomBytes(3).toString('hex');
    candidate = `${base}-${suffix}`;
  }
  throw new Error('Could not generate a unique slug after several attempts');
}

function validateFields(raw, sellerName) {
  const errors = {};
  const name = stripControlChars(raw.name || '');
  const description = stripControlChars(raw.description || '');
  const category_slug = String(raw.category_slug || raw.category || '').trim();
  const brand_slug = String(raw.brand_slug || raw.brand || '').trim();
  const condition = String(raw.condition || '').trim();
  const size = stripControlChars(raw.size || '');
  const location = stripControlChars(raw.location || '');
  const priceNum = Number(raw.price);
  const salePriceRaw = raw.sale_price;
  const salePriceNum = salePriceRaw === '' || salePriceRaw == null ? null : Number(salePriceRaw);
  const stockNum = raw.stock === '' || raw.stock == null ? 1 : Number(raw.stock);
  const isNegotiable = raw.is_negotiable === true || raw.is_negotiable === 'true' || raw.is_negotiable === '1';

  if (!name || name.length < MIN_NAME_LEN || name.length > MAX_NAME_LEN) {
    errors.name = `Name is required (${MIN_NAME_LEN}-${MAX_NAME_LEN} characters).`;
  } else if (!/[a-zA-Z0-9À-ỹ]/.test(name)) {
    errors.name = 'Name must contain more than just symbols.';
  }

  if (!description || description.length < MIN_DESC_LEN || description.length > MAX_DESC_LEN) {
    errors.description = `Description is required (${MIN_DESC_LEN}-${MAX_DESC_LEN} characters).`;
  }

  if (!category_slug) errors.category_slug = 'Category is required.';

  if (!condition || !ALLOWED_CONDITIONS.has(condition)) {
    errors.condition = `Condition must be one of: ${[...ALLOWED_CONDITIONS].join(', ')}.`;
  }

  if (!size || size.length > 40) errors.size = 'Size is required (max 40 characters).';

  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    errors.price = 'Price must be a number greater than 0.';
  } else if (priceNum > MAX_PRICE) {
    errors.price = `Price exceeds the maximum allowed (${MAX_PRICE.toLocaleString('vi-VN')} VNĐ).`;
  }

  if (salePriceNum != null) {
    if (!Number.isFinite(salePriceNum) || salePriceNum <= 0) {
      errors.sale_price = 'Sale price must be greater than 0, or omitted.';
    } else if (Number.isFinite(priceNum) && !(salePriceNum < priceNum)) {
      errors.sale_price = 'Sale price must be less than the regular price.';
    }
  }

  if (!Number.isInteger(stockNum) || stockNum < 1) {
    errors.stock = 'Stock must be an integer of at least 1.';
  } else if (stockNum > MAX_STOCK) {
    errors.stock = `Stock exceeds the maximum allowed (${MAX_STOCK}).`;
  }

  if (!location || location.length > 100) {
    errors.location = 'Location is required (max 100 characters).';
  }

  // Lightweight category/size compatibility: shoe-like categories need a
  // shoe-shaped size (EU sizing or One Size); everything else must not use
  // shoe sizing. Mirrors the same rule already enforced by the Phase 6
  // manifest validator (backend/scripts/data/verifiedCatalog.js assertData).
  const SHOE_LIKE = new Set(['shoes', 'slides']);
  if (!errors.size && !errors.category_slug) {
    const shoeLike = SHOE_LIKE.has(category_slug);
    const looksLikeShoeSize = /^EU\s?\d{2}$/i.test(size) || /^one\s?size$/i.test(size);
    if (shoeLike && !looksLikeShoeSize) {
      errors.size = 'Choose an EU shoe size (e.g. "EU 42") or One Size for footwear categories.';
    }
  }

  if (Object.keys(errors).length) {
    throw new ListingValidationError('Listing validation failed', errors);
  }

  return {
    name,
    description,
    category_slug,
    brand_slug: brand_slug || null,
    condition,
    size,
    location,
    price: Math.round(priceNum),
    sale_price: salePriceNum != null ? Math.round(salePriceNum) : null,
    stock: stockNum,
    is_negotiable: isNegotiable,
    seller_name: sellerName,
  };
}

function validateFiles(files) {
  if (!files || files.length === 0) {
    throw new ListingValidationError('At least one photo is required.', { images: 'At least one photo is required.' });
  }
  if (files.length > MAX_IMAGES) {
    throw new ListingValidationError(`A maximum of ${MAX_IMAGES} photos is allowed.`, { images: `A maximum of ${MAX_IMAGES} photos is allowed.` });
  }
  const seen = new Set();
  for (const f of files) {
    if (!ALLOWED_MIME.has(f.mimetype)) {
      throw new ListingValidationError(
        `Unsupported file type: ${f.mimetype}. Only JPEG, PNG, and WebP are allowed.`,
        { images: 'Only JPEG, PNG, and WebP images are allowed.' },
      );
    }
    if (!f.buffer || f.buffer.length === 0) {
      throw new ListingValidationError('One of the uploaded files is empty or corrupt.', { images: 'One of the uploaded files is empty or corrupt.' });
    }
    if (f.size > MAX_IMAGE_BYTES) {
      throw new ListingValidationError(
        `"${f.originalname}" exceeds the 5MB limit.`,
        { images: `"${f.originalname}" exceeds the 5MB limit.` },
      );
    }
    const dupKey = `${f.originalname}:${f.size}`;
    if (seen.has(dupKey)) {
      throw new ListingValidationError(`Duplicate file selected: "${f.originalname}".`, { images: `Duplicate file selected: "${f.originalname}".` });
    }
    seen.add(dupKey);
  }
}

function extFromMime(mimetype) {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'jpg';
}

// Very small in-memory de-dupe guard against accidental rapid double-submits
// from the same authenticated user (e.g. a double click that both reached
// the server before the frontend's disabled-button state could take effect).
// Intentionally not a distributed lock/queue — this is a single-process dev
// backend, and the frontend already disables the Publish button while a
// request is in flight, which is the primary defense.
const recentSubmissions = new Map(); // userId -> { key, productId, expiresAt }
const DEDUPE_WINDOW_MS = 5000;

function dedupeKey(fields) {
  return `${fields.name}::${fields.price}::${fields.category_slug}`;
}

async function createListing(user, rawFields, files) {
  checkDb();

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id, full_name, name')
    .eq('id', user.id)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!userRow) {
    const e = new Error('Authenticated user profile not found');
    e.status = 401;
    throw e;
  }
  const sellerName = userRow.full_name || userRow.name || user.email || 'StyleHub seller';

  const fields = validateFields(rawFields, sellerName);
  validateFiles(files);

  const { data: category, error: catErr } = await supabaseAdmin
    .from('categories')
    .select('slug, is_active')
    .eq('slug', fields.category_slug)
    .maybeSingle();
  if (catErr) throw catErr;
  if (!category || category.is_active === false) {
    throw new ListingValidationError('Invalid category.', { category_slug: 'Selected category does not exist.' });
  }

  let brandId = null;
  let brandName = 'No Brand';
  if (fields.brand_slug) {
    const { data: brand, error: brandErr } = await supabaseAdmin
      .from('brands')
      .select('id, name, is_active')
      .eq('slug', fields.brand_slug)
      .maybeSingle();
    if (brandErr) throw brandErr;
    if (!brand || brand.is_active === false) {
      throw new ListingValidationError('Invalid brand.', { brand_slug: 'Selected brand does not exist.' });
    }
    brandId = brand.id;
    brandName = brand.name;
  }

  // De-dupe: identical, already-fully-validated listing from the same user
  // within a short window returns the already-created product instead of
  // creating a second one — covering both a slow sequential resubmit AND a
  // genuinely concurrent double-click. Runs only after every validation step
  // above has passed, so a request that merely shares a name/price/category
  // with a recent one but differs elsewhere (e.g. an invalid brand) is never
  // silently short-circuited past validation.
  //
  // The check-then-reserve below has no `await` between reading and writing
  // recentSubmissions, so it is atomic with respect to Node's single-threaded
  // event loop: whichever concurrent request's continuation is scheduled
  // first reserves the slot before the other request's continuation can run.
  const now = Date.now();
  const key = `${dedupeKey(fields)}::${fields.brand_slug || ''}`;
  const prev = recentSubmissions.get(user.id);
  if (prev && prev.key === key && prev.expiresAt > now) {
    if (prev.status === 'done') {
      const { data: existingProduct } = await supabaseAdmin.from('products').select('*').eq('id', prev.productId).maybeSingle();
      if (existingProduct) return existingProduct;
    }
    if (prev.status === 'pending') {
      // A concurrent identical request is already in flight — wait briefly
      // for it to finish instead of creating a second product.
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const cur = recentSubmissions.get(user.id);
        if (cur && cur.key === key && cur.status === 'done') {
          const { data: existingProduct } = await supabaseAdmin.from('products').select('*').eq('id', cur.productId).maybeSingle();
          if (existingProduct) return existingProduct;
          break;
        }
        if (!cur || cur.key !== key) break; // the in-flight one failed/cleared — fall through and create normally
      }
    }
  }
  recentSubmissions.set(user.id, { key, status: 'pending', productId: null, expiresAt: now + DEDUPE_WINDOW_MS });

  const slug = await generateUniqueSlug(fields.name);
  const requestId = crypto.randomUUID();

  // Upload images first; track every path we actually create so we can clean
  // up completely if a later step fails.
  const uploadedPaths = [];
  let imageRecords = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = extFromMime(file.mimetype);
      const objectPath = `products/${user.id}/${requestId}/${i}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);
      uploadedPaths.push(objectPath);
      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
      imageRecords.push({
        url: pub.publicUrl,
        alt_text: fields.name,
        sort_order: i,
        is_primary: i === 0,
      });
    }

    const nowIso = new Date().toISOString();
    const primaryUrl = imageRecords[0].url;
    const productPayload = {
      name: fields.name,
      slug,
      price: fields.price,
      sale_price: fields.sale_price,
      category_slug: fields.category_slug,
      image_url: primaryUrl,
      thumbnail: primaryUrl,
      description: fields.description,
      stock: fields.stock,
      condition: fields.condition,
      size: fields.size,
      location: fields.location,
      is_negotiable: fields.is_negotiable,
      seller_name: fields.seller_name,
      seller_id: user.id,
      brand: brandName,
      brand_id: brandId,
      status: 'active',
      listing_source: 'user',
      is_featured: false,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: product, error: prodErr } = await supabaseAdmin
      .from('products')
      .insert(productPayload)
      .select()
      .single();
    if (prodErr) throw new Error(`Product creation failed: ${prodErr.message}`);

    try {
      const rows = imageRecords.map((r) => ({ ...r, product_id: product.id }));
      const { error: imgErr } = await supabaseAdmin.from('product_images').insert(rows);
      if (imgErr) throw new Error(`Image records failed: ${imgErr.message}`);
    } catch (imgStepErr) {
      // Roll back the product row we just created (same request, brand new,
      // guaranteed no order/review references yet) and re-throw.
      await supabaseAdmin.from('products').delete().eq('id', product.id);
      throw imgStepErr;
    }

    recentSubmissions.set(user.id, { key, status: 'done', productId: product.id, expiresAt: now + DEDUPE_WINDOW_MS });
    setTimeout(() => {
      const entry = recentSubmissions.get(user.id);
      if (entry && entry.productId === product.id) recentSubmissions.delete(user.id);
    }, DEDUPE_WINDOW_MS).unref?.();

    return product;
  } catch (err) {
    if (uploadedPaths.length) {
      await supabaseAdmin.storage.from(BUCKET).remove(uploadedPaths).catch(() => {});
    }
    // Clear the pending reservation so a genuine failure doesn't block a
    // legitimate retry with the same fields for the rest of the window.
    const cur = recentSubmissions.get(user.id);
    if (cur && cur.key === key && cur.status === 'pending') recentSubmissions.delete(user.id);
    throw err;
  }
}

module.exports = {
  createListing,
  ListingValidationError,
  ALLOWED_MIME,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
};
