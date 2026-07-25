/**
 * Phase 9 — authenticated seller listing management (dashboard).
 *
 * Security model: identical trust boundary to services/listingService.js —
 * the caller (routes/sellerListings.js) has already run every request
 * through `authenticateUser` + `requireAuth`, so `userId` here is always the
 * verified `req.user.id` from the backend's own signed session token, never
 * anything from the request body or URL. Every single query in this file
 * filters on `seller_id = userId AND listing_source = 'user'` — that one
 * combined filter is both the ownership check AND the seed-product
 * protection, so a Phase 6 seed product or another seller's listing simply
 * never matches a row and callers get a uniform 404, never a 403 that would
 * leak "this ID exists but isn't yours".
 */
const crypto = require('crypto');
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const brandService = require('./brandService');
const listingService = require('./listingService');
const { isKnownLocation } = require('../constants/vnLocations');
const { SHOE_LIKE_CATEGORIES } = require('../constants/shoeCategories');
const { isValidTransition, LISTING_STATUSES } = require('../constants/listingStatus');
const sustainability = require('../constants/sustainability');

const {
  ALLOWED_MIME,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  ALLOWED_CONDITIONS,
  MAX_PRICE,
  MAX_STOCK,
  MIN_NAME_LEN,
  MAX_NAME_LEN,
  MIN_DESC_LEN,
  MAX_DESC_LEN,
  stripControlChars,
  extFromMime,
  BUCKET,
} = listingService;

class SellerListingError extends Error {
  constructor(message, status, fieldErrors) {
    super(message);
    this.status = status || 422;
    this.fieldErrors = fieldErrors || {};
  }
}

const checkDb = () => {
  if (!isSupabaseAdminConfigured()) {
    throw new SellerListingError('Hệ thống chưa được cấu hình.', 503);
  }
};

// Never select('*') here — this file only ever returns rows already scoped
// to the authenticated seller, but keeping an explicit allowlist means a
// future column (e.g. an internal moderation note) can't leak by accident.
const LISTING_COLUMNS = [
  'id', 'name', 'slug', 'description', 'category_slug', 'brand', 'brand_id',
  'condition', 'size', 'price', 'sale_price', 'stock', 'location',
  'is_negotiable', 'status', 'image_url', 'thumbnail', 'is_featured',
  'listing_source', 'seller_id', 'created_at', 'updated_at', 'inventory_mode'
];

async function attachImages(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p.id);
  const brandIds = [...new Set(products.map((p) => p.brand_id).filter(Boolean))];
  const [{ data: images }, { data: sustainabilityRows }, { data: brandRows }, { data: variantsRows }] = await Promise.all([
    supabaseAdmin
      .from('product_images')
      .select('id, product_id, url, alt_text, sort_order, is_primary')
      .in('product_id', ids)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('product_sustainability')
      .select('product_id, lifecycle_type, material, repair_history, upcycle_details, product_story, reuse_packaging, claim_source')
      .in('product_id', ids),
    brandIds.length
      ? supabaseAdmin.from('brands').select('id, source, verification_status').in('id', brandIds)
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from('product_variants')
      .select('id, product_id, sku, title, price, stock, status')
      .in('product_id', ids),
  ]);
  return products.map((p) => {
    const brandRow = (brandRows || []).find((b) => b.id === p.brand_id);
    return {
      ...p,
      images: (images || []).filter((img) => img.product_id === p.id),
      variants: (variantsRows || []).filter((v) => v.product_id === p.id),
      sustainability: sustainability.toPublicSustainability(
        (sustainabilityRows || []).find((row) => row.product_id === p.id),
      ),
      brand_source: brandRow ? brandRow.source : null,
      brand_verification_status: brandRow ? brandRow.verification_status : null,
    };
  });
}

/** Ownership + seed-protection base query — every read/write starts here. */
function ownedListingQuery(userId) {
  return supabaseAdmin
    .from('products')
    .select(LISTING_COLUMNS.join(','))
    .eq('seller_id', userId)
    .eq('listing_source', 'user');
}

function applyListingFilters(query, filters) {
  let q = query;
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.category) q = q.eq('category_slug', String(filters.category));
  if (filters.search) q = q.ilike('name', `%${String(filters.search).slice(0, 100)}%`);
  return q;
}

async function listMyListings(userId, query = {}) {
  checkDb();

  if (query.status && !LISTING_STATUSES.includes(query.status)) {
    throw new SellerListingError('Trạng thái lọc không hợp lệ.', 400);
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || 20;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 50) limit = 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Two independent queries (count vs. page of data), same filters applied
  // to each — matches the existing pattern in services/sellerService.js
  // rather than re-invoking `.select()` mid-chain on one builder.
  const countQuery = applyListingFilters(
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', userId).eq('listing_source', 'user'),
    query,
  );
  const { count, error: countErr } = await countQuery;
  if (countErr) throw countErr;

  const dataQuery = applyListingFilters(ownedListingQuery(userId), query);
  
  let q = dataQuery;
  const sort = query.sort || 'newest';
  if (sort === 'oldest') q = q.order('updated_at', { ascending: true });
  else if (sort === 'price_asc') q = q.order('price', { ascending: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false });
  else q = q.order('updated_at', { ascending: false });

  const { data, error } = await q.range(from, to);
  if (error) throw error;

  const withImages = await attachImages(data || []);
  return { data: withImages, meta: { page, limit, count: count || 0 } };
}

async function getMyListingById(userId, id) {
  checkDb();
  const { data, error } = await ownedListingQuery(userId).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new SellerListingError('Không tìm thấy sản phẩm.', 404);
  const [withImages] = await attachImages([data]);
  return withImages;
}

/** Validates whatever fields are present (partial update) using the exact
 * same rules as listing creation — never a second, drifting copy. */
function validatePartialFields(raw) {
  const errors = {};
  const updates = {};

  if (raw.name !== undefined) {
    const name = stripControlChars(raw.name);
    if (!name || name.length < MIN_NAME_LEN || name.length > MAX_NAME_LEN) {
      errors.name = `Tên sản phẩm phải có từ ${MIN_NAME_LEN} đến ${MAX_NAME_LEN} ký tự.`;
    } else if (!/[a-zA-Z0-9À-ỹ]/.test(name)) {
      errors.name = 'Tên sản phẩm phải chứa chữ hoặc số, không chỉ có ký hiệu.';
    } else {
      updates.name = name;
    }
  }

  if (raw.description !== undefined) {
    const description = stripControlChars(raw.description);
    if (!description || description.length < MIN_DESC_LEN || description.length > MAX_DESC_LEN) {
      errors.description = `Mô tả phải có từ ${MIN_DESC_LEN} đến ${MAX_DESC_LEN} ký tự.`;
    } else {
      updates.description = description;
    }
  }

  let categorySlug = null;
  if (raw.category_slug !== undefined) {
    categorySlug = String(raw.category_slug || '').trim();
    if (!categorySlug) errors.category_slug = 'Vui lòng chọn danh mục.';
    else updates.category_slug = categorySlug;
  }

  if (raw.condition !== undefined) {
    const condition = String(raw.condition || '').trim();
    if (!condition || !ALLOWED_CONDITIONS.has(condition)) {
      errors.condition = 'Vui lòng chọn tình trạng sản phẩm hợp lệ.';
    } else {
      updates.condition = condition;
    }
  }

  let size = null;
  if (raw.size !== undefined) {
    size = stripControlChars(raw.size);
    if (!size || size.length > 40) errors.size = 'Vui lòng nhập kích thước (tối đa 40 ký tự).';
    else updates.size = size;
  }

  let priceNum = null;
  if (raw.price !== undefined) {
    priceNum = Number(raw.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      errors.price = 'Giá bán phải là một số lớn hơn 0.';
    } else if (priceNum > MAX_PRICE) {
      errors.price = `Giá bán vượt quá mức cho phép (${MAX_PRICE.toLocaleString('vi-VN')} VNĐ).`;
    } else {
      updates.price = Math.round(priceNum);
    }
  }

  if (raw.sale_price !== undefined) {
    const salePriceRaw = raw.sale_price;
    const salePriceNum = salePriceRaw === '' || salePriceRaw == null ? null : Number(salePriceRaw);
    const comparePrice = priceNum != null ? priceNum : undefined;
    if (salePriceNum != null) {
      if (!Number.isFinite(salePriceNum) || salePriceNum <= 0) {
        errors.sale_price = 'Giá giảm phải lớn hơn 0, hoặc để trống.';
      } else if (comparePrice !== undefined && !(salePriceNum < comparePrice)) {
        errors.sale_price = 'Giá giảm phải thấp hơn giá gốc.';
      } else {
        updates.sale_price = Math.round(salePriceNum);
      }
    } else {
      updates.sale_price = null;
    }
  }

  if (raw.stock !== undefined) {
    const stockNum = Number(raw.stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      errors.stock = 'Số lượng phải là số nguyên và không âm.';
    } else if (stockNum > MAX_STOCK) {
      errors.stock = `Số lượng vượt quá mức cho phép (${MAX_STOCK}).`;
    } else {
      updates.stock = stockNum;
    }
  }

  if (raw.location !== undefined) {
    const location = stripControlChars(raw.location);
    if (!location) errors.location = 'Vui lòng chọn tỉnh/thành phố.';
    else if (location.length > 100) errors.location = 'Tỉnh/thành phố tối đa 100 ký tự.';
    else if (!isKnownLocation(location)) errors.location = 'Vui lòng chọn một tỉnh/thành phố hợp lệ trong danh sách.';
    else updates.location = location;
  }

  if (raw.is_negotiable !== undefined) {
    updates.is_negotiable = raw.is_negotiable === true || raw.is_negotiable === 'true' || raw.is_negotiable === '1';
  }

  if (raw.inventory_mode !== undefined) {
    updates.inventory_mode = raw.inventory_mode === 'variant' ? 'variant' : 'simple';
  }

  let parsedVariants = null;
  if (raw.variants !== undefined) {
    try {
      parsedVariants = typeof raw.variants === 'string' ? JSON.parse(raw.variants || '[]') : (raw.variants || []);
      if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
        errors.variants = 'Cần ít nhất một phân loại (size/màu).';
      } else {
        let hasStock = false;
        parsedVariants.forEach((v, idx) => {
          if (!v.title?.trim()) errors[`variants[${idx}].title`] = 'Tên phân loại không được trống.';
          const vPrice = Number(v.price);
          if (!Number.isFinite(vPrice) || vPrice < 0) errors[`variants[${idx}].price`] = 'Giá không hợp lệ.';
          const vStock = Number(v.stock);
          if (!Number.isInteger(vStock) || vStock < 0) errors[`variants[${idx}].stock`] = 'Kho không hợp lệ.';
          else if (vStock > 0) hasStock = true;
          if (v.sku && v.sku.length > 50) errors[`variants[${idx}].sku`] = 'SKU quá dài (tối đa 50 ký tự).';
        });
        if (!hasStock) errors.variants = 'Ít nhất một phân loại phải có số lượng > 0 để đăng bán.';
      }
    } catch (err) {
      errors.variants = 'Dữ liệu phân loại không hợp lệ.';
    }
  }

  // Shoe-size compatibility only checked when BOTH pieces are known for this
  // request — either just-submitted or already on the row (caller passes
  // the effective category/size in via `context` below).
  return { updates, errors, categorySlug, size, parsedVariants };
}

async function updateMyListing(userId, id, rawFields) {
  checkDb();

  const existing = await getMyListingById(userId, id); // throws 404 if not owned/seed

  const { updates, errors, categorySlug, size, parsedVariants } = validatePartialFields(rawFields);
  const productJourney = sustainability.validateSustainability(rawFields);

  // Cross-field shoe-size rule, evaluated against the EFFECTIVE (post-update)
  // category/size so a category-only or size-only edit is still checked
  // against whichever value isn't changing.
  const effectiveCategory = categorySlug ?? existing.category_slug;
  const effectiveSize = size ?? existing.size;
  if (!errors.category_slug && !errors.size) {
    const shoeLike = SHOE_LIKE_CATEGORIES.has(effectiveCategory);
    const looksLikeShoeSize = /^EU\s?\d{2}$/i.test(effectiveSize || '') || /^one\s?size$/i.test(effectiveSize || '');
    if (shoeLike && !looksLikeShoeSize) {
      errors.size = 'Chọn kích thước giày theo chuẩn EU (ví dụ "EU 42") hoặc Một cỡ cho danh mục giày dép.';
    }
  }

  if (Object.keys(errors).length) {
    throw new SellerListingError('Vui lòng kiểm tra lại thông tin sản phẩm.', 422, errors);
  }

  if (updates.category_slug) {
    const { data: category } = await supabaseAdmin
      .from('categories').select('slug, is_active').eq('slug', updates.category_slug).maybeSingle();
    if (!category || category.is_active === false) {
      throw new SellerListingError('Danh mục không hợp lệ.', 422, { category_slug: 'Danh mục đã chọn không tồn tại.' });
    }
  }

  if (
    rawFields.brand_id !== undefined || rawFields.new_brand_name !== undefined
    || rawFields.brand_slug !== undefined || rawFields.brand !== undefined
  ) {
    const { brandId, brandName } = await brandService.resolveBrandSelection(rawFields, { createdBy: userId });
    updates.brand = brandName;
    updates.brand_id = brandId;
  }

  if (Object.keys(updates).length === 0 && !productJourney.provided && !parsedVariants) {
    return existing; // nothing to change — not an error, just a no-op
  }

  let finalProductId = id;

  if (productJourney.provided) {
    const { error: rpcError } = await supabaseAdmin.rpc('stylehub_update_listing_with_sustainability', {
      p_seller_id: userId,
      p_product_id: id,
      p_expected_updated_at: rawFields.expected_updated_at || null,
      p_product_updates: updates,
      p_sustainability: sustainability.toDatabasePayload(productJourney.value),
    });

    if (rpcError) {
      const message = String(rpcError.message || '');
      if (message.includes('LISTING_STALE')) {
        throw new SellerListingError('Sản phẩm đã được cập nhật ở một nơi khác. Vui lòng tải lại trang.', 409);
      }
      if (message.includes('LISTING_NOT_FOUND')) {
        throw new SellerListingError('Không tìm thấy sản phẩm.', 404);
      }
      throw rpcError;
    }
  } else if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();

    // Optimistic concurrency: the client sends back the `updated_at` it last
    // saw when it loaded the editor. Require the row's CURRENT `updated_at`
    // to still equal that client-supplied value before writing — if another
    // tab/session saved a change in between, the row's real `updated_at` has
    // since moved on and this equality fails, so the stale write is rejected
    // as a conflict instead of silently overwriting the newer edit.
    let query = supabaseAdmin.from('products').update(updates).eq('id', id).eq('seller_id', userId).eq('listing_source', 'user');
    if (rawFields.expected_updated_at) {
      query = query.eq('updated_at', rawFields.expected_updated_at);
    }

    const { data: updated, error } = await query.select('id').maybeSingle();
    if (error) throw error;
    if (!updated) {
      if (rawFields.expected_updated_at) {
        throw new SellerListingError('Sản phẩm đã được cập nhật ở một nơi khác. Vui lòng tải lại trang.', 409);
      }
      throw new SellerListingError('Không tìm thấy sản phẩm.', 404);
    }
  }

  if (parsedVariants) {
    // Determine target state
    const isVariantMode = updates.inventory_mode === 'variant' || (!updates.inventory_mode && existing.inventory_mode === 'variant');
    
    // Fetch existing variants to know what to update, delete, or deactivate
    const { data: currentVariants, error: fetchErr } = await supabaseAdmin.from('product_variants').select('id, title').eq('product_id', id);
    if (!fetchErr && currentVariants) {
      if (!isVariantMode || parsedVariants.length === 0) {
        // We are switching to simple mode.
        // We cannot blindly delete variants because active order_items might reference them via `on delete set null`.
        // We must deactivate them safely. If they have no orders, we could delete, but deactivating is universally safe.
        // To be thorough, we can try to delete, but fallback to deactivate. For simplicity and absolute safety against constraint breakage or snapshot loss, we will set them to out_of_stock and inactive.
        await supabaseAdmin.from('product_variants').update({ status: 'inactive', stock: 0 }).eq('product_id', id);
      } else {
        // We are updating variant mode.
        // We should try to update existing variants by title/id if they match, insert new ones, and deactivate missing ones.
        const currentVariantTitles = new Set(currentVariants.map(v => v.title));
        const newVariantTitles = new Set(parsedVariants.map(v => v.title.trim()));
        
        // Deactivate removed variants
        const titlesToDeactivate = [...currentVariantTitles].filter(title => !newVariantTitles.has(title));
        if (titlesToDeactivate.length > 0) {
          await supabaseAdmin.from('product_variants').update({ status: 'inactive', stock: 0 }).eq('product_id', id).in('title', titlesToDeactivate);
        }
        
        // Upsert variants
        for (const v of parsedVariants) {
          const title = v.title.trim();
          const stock = Number(v.stock);
          const variantPayload = {
            product_id: id,
            sku: v.sku || null,
            title: title,
            price: Number(v.price),
            sale_price: null,
            stock: stock,
            status: stock > 0 ? 'active' : 'out_of_stock'
          };
          
          const existingVariant = currentVariants.find(curr => curr.title === title);
          if (existingVariant) {
            await supabaseAdmin.from('product_variants').update(variantPayload).eq('id', existingVariant.id);
          } else {
            await supabaseAdmin.from('product_variants').insert(variantPayload);
          }
        }
      }
    }
  }

  return getMyListingById(userId, id);
}

async function transitionStatus(userId, id, action) {
  checkDb();
  const existing = await getMyListingById(userId, id);

  const target = String(action || '').trim();
  if (!LISTING_STATUSES.includes(target)) {
    throw new SellerListingError('Trạng thái không hợp lệ.', 400);
  }
  if (!isValidTransition(existing.status, target)) {
    throw new SellerListingError(
      `Không thể chuyển trạng thái từ '${existing.status}' sang '${target}'.`,
      409,
    );
  }
  if (target === 'active' && (!existing.images || existing.images.length === 0)) {
    throw new SellerListingError('Vui lòng thêm ít nhất một ảnh trước khi đăng bán.', 422, { images: 'Cần có ít nhất một ảnh.' });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('products')
    .update({ status: target, updated_at: new Date().toISOString() })
    .eq('id', id).eq('seller_id', userId).eq('listing_source', 'user')
    .select(LISTING_COLUMNS.join(','))
    .maybeSingle();
  if (error) throw error;
  if (!updated) throw new SellerListingError('Không tìm thấy sản phẩm.', 404);

  const [withImages] = await attachImages([updated]);
  return withImages;
}

function validateNewImageFiles(existingCount, files) {
  if (!files || files.length === 0) {
    throw new SellerListingError('Vui lòng chọn ít nhất một ảnh.', 422, { images: 'Vui lòng chọn ít nhất một ảnh.' });
  }
  if (existingCount + files.length > MAX_IMAGES) {
    throw new SellerListingError(`Chỉ được có tối đa ${MAX_IMAGES} ảnh cho mỗi sản phẩm.`, 422, { images: `Tối đa ${MAX_IMAGES} ảnh.` });
  }
  for (const f of files) {
    if (!ALLOWED_MIME.has(f.mimetype)) {
      throw new SellerListingError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.', 422, { images: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.' });
    }
    if (!f.buffer || f.buffer.length === 0) {
      throw new SellerListingError('Một trong các ảnh bị trống hoặc lỗi.', 422, { images: 'Một trong các ảnh bị trống hoặc lỗi.' });
    }
    if (f.size > MAX_IMAGE_BYTES) {
      throw new SellerListingError(`"${f.originalname}" vượt quá giới hạn 5MB.`, 422, { images: `"${f.originalname}" vượt quá giới hạn 5MB.` });
    }
  }
}

async function addImages(userId, id, files) {
  checkDb();
  const existing = await getMyListingById(userId, id);
  validateNewImageFiles(existing.images.length, files);

  const requestId = crypto.randomUUID();
  const uploadedPaths = [];
  try {
    const startOrder = existing.images.length;
    const newRecords = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = extFromMime(file.mimetype);
      // Storage path is ALWAYS generated here, server-side, from the
      // verified owner id — the client never supplies or influences it.
      const objectPath = `products/${userId}/${requestId}/${i}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET).upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);
      uploadedPaths.push(objectPath);
      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
      newRecords.push({
        product_id: id,
        url: pub.publicUrl,
        alt_text: existing.name,
        sort_order: startOrder + i,
        is_primary: existing.images.length === 0 && i === 0,
      });
    }

    const { error: imgErr } = await supabaseAdmin.from('product_images').insert(newRecords);
    if (imgErr) throw new Error(`Image records failed: ${imgErr.message}`);

    // If this listing had no images before, the first new one becomes the
    // product's primary image reference too.
    if (existing.images.length === 0) {
      await supabaseAdmin.from('products')
        .update({ image_url: newRecords[0].url, thumbnail: newRecords[0].url, updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    return getMyListingById(userId, id);
  } catch (err) {
    if (uploadedPaths.length) {
      await supabaseAdmin.storage.from(BUCKET).remove(uploadedPaths).catch(() => {});
    }
    throw err;
  }
}

/** Extracts the `products/<sellerId>/...` storage path from a public URL,
 * and returns null if it doesn't match — used to refuse to touch any
 * object outside this exact pattern (never another seller's, never a seed
 * catalog asset, which live under a different path/bucket entirely). */
function extractOwnedStoragePath(url, userId) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = String(url || '').indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length);
  return path.startsWith(`products/${userId}/`) ? path : null;
}

async function removeImage(userId, id, imageId) {
  checkDb();
  const existing = await getMyListingById(userId, id);
  const target = existing.images.find((img) => String(img.id) === String(imageId));
  if (!target) throw new SellerListingError('Không tìm thấy ảnh.', 404);
  if (existing.images.length <= 1) {
    throw new SellerListingError('Sản phẩm phải có ít nhất một ảnh.', 422, { images: 'Không thể xóa ảnh cuối cùng.' });
  }

  const { error: delErr } = await supabaseAdmin.from('product_images').delete().eq('id', imageId).eq('product_id', id);
  if (delErr) throw delErr;

  const ownedPath = extractOwnedStoragePath(target.url, userId);
  if (ownedPath) {
    await supabaseAdmin.storage.from(BUCKET).remove([ownedPath]).catch(() => {});
  }

  // If the removed image was primary, promote the next-lowest sort_order
  // image and keep `products.image_url`/`thumbnail` in sync.
  if (target.is_primary) {
    const remaining = existing.images.filter((img) => String(img.id) !== String(imageId)).sort((a, b) => a.sort_order - b.sort_order);
    const next = remaining[0];
    if (next) {
      await supabaseAdmin.from('product_images').update({ is_primary: true }).eq('id', next.id);
      await supabaseAdmin.from('products')
        .update({ image_url: next.url, thumbnail: next.url, updated_at: new Date().toISOString() })
        .eq('id', id);
    }
  }

  return getMyListingById(userId, id);
}

async function reorderImages(userId, id, orderedImageIds) {
  checkDb();
  const existing = await getMyListingById(userId, id);
  const existingIds = new Set(existing.images.map((img) => String(img.id)));
  const requested = (orderedImageIds || []).map(String);

  if (requested.length !== existing.images.length || !requested.every((rid) => existingIds.has(rid))) {
    throw new SellerListingError('Danh sách ảnh không hợp lệ.', 422, { images: 'Danh sách ảnh không khớp với sản phẩm.' });
  }

  await Promise.all(requested.map((imgId, index) =>
    supabaseAdmin.from('product_images').update({ sort_order: index, is_primary: index === 0 }).eq('id', imgId)
  ));

  const primary = existing.images.find((img) => String(img.id) === requested[0]);
  if (primary) {
    await supabaseAdmin.from('products')
      .update({ image_url: primary.url, thumbnail: primary.url, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  return getMyListingById(userId, id);
}

/** Honest, derivable-only seller stats — see backend/services/sellerService.js
 * for the same completed-order-items pattern already used for public
 * storefronts; this mirrors it, scoped to the authenticated seller. */
async function getMyListingStats(userId) {
  checkDb();

  const { data: myProducts } = await supabaseAdmin
    .from('products').select('id, status').eq('seller_id', userId).eq('listing_source', 'user');
  const products = myProducts || [];
  const productIds = products.map((p) => p.id);

  const activeListings = products.filter((p) => p.status === 'active').length;
  const hiddenOrDraftListings = products.filter((p) => p.status === 'hidden' || p.status === 'draft').length;

  let soldUnits = 0;
  let grossMerchandiseValue = 0;
  let ordersRequiringAction = 0;

  if (productIds.length) {
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('id, quantity, line_total, unit_price, price, fulfillment_status, product_id, order_id')
      .eq('seller_id', userId);

    for (const item of items || []) {
      if (item.fulfillment_status === 'completed') {
        soldUnits += item.quantity || 1;
        const lineTotal = item.line_total ?? (Number(item.unit_price ?? item.price ?? 0) * (item.quantity || 1));
        grossMerchandiseValue += Number(lineTotal) || 0;
      }
      if (item.fulfillment_status !== 'completed' && item.fulfillment_status !== 'cancelled') {
        ordersRequiringAction += 1;
      }
    }
  }

  return {
    activeListings,
    hiddenOrDraftListings,
    soldUnits,
    ordersRequiringAction,
    grossMerchandiseValue,
  };
}

async function deleteDraftListing(userId, id) {
  checkDb();
  // 1-2. Authentication happens in routes/sellerListings.js; ownership is
  // verified here — getMyListingById throws 404 for anything not owned by
  // this seller (and never matches seed/catalog rows — see ownedListingQuery).
  const existing = await getMyListingById(userId, id);
  // 3. Only drafts are eligible for hard deletion.
  if (existing.status !== 'draft') {
    throw new SellerListingError('Chỉ có thể xóa sản phẩm nháp.', 409);
  }

  // 4. Capture candidate owned Storage paths BEFORE mutating anything.
  const candidateImages = existing.images || [];

  // 5. Delete the database listing FIRST. product_images/product_sustainability
  // cascade-delete with it (on delete cascade) — Storage is never touched
  // before this database deletion has actually succeeded, so a failure here
  // can never leave a listing with broken image URLs.
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id).eq('seller_id', userId);
  if (error) throw error;

  // 6-7. Best-effort Storage cleanup, only now that the DB row is
  // confirmed gone, and only for files no *other* surviving product_images
  // row still references — a listing duplicated before this fix may still
  // share a physical file with another (possibly active) listing, and that
  // file must never be removed out from under it.
  if (candidateImages.length) {
    try {
      const { data: stillUsedRows, error: lookupErr } = await supabaseAdmin
        .from('product_images')
        .select('url')
        .in('url', candidateImages.map((img) => img.url));
      if (lookupErr) throw lookupErr;

      const stillReferenced = new Set((stillUsedRows || []).map((row) => row.url));
      const pathsSafeToDelete = candidateImages
        .filter((img) => !stillReferenced.has(img.url))
        .map((img) => extractOwnedStoragePath(img.url, userId))
        .filter(Boolean);

      if (pathsSafeToDelete.length) {
        const { error: removeErr } = await supabaseAdmin.storage.from(BUCKET).remove(pathsSafeToDelete);
        if (removeErr) throw removeErr;
      }
    } catch (cleanupErr) {
      // 8. Non-fatal: the listing is already deleted successfully. Never
      // expose the provider's raw error payload to the caller, and never
      // attempt to "undo" the already-successful database deletion.
      console.error(`Storage cleanup warning for deleted draft ${id}:`, cleanupErr?.message || cleanupErr);
    }
  }

  return { success: true };
}

async function duplicateListing(userId, id) {
  checkDb();
  // Ownership verified before any Storage or database mutation — throws
  // 404 for anything not owned by this seller (never a seed/catalog row).
  const existing = await getMyListingById(userId, id);

  // seller_name is NOT NULL on products but deliberately isn't part of the
  // shared LISTING_COLUMNS allowlist (kept narrow everywhere else to avoid
  // leaking it into responses that don't need it) — fetched separately,
  // scoped to this already-ownership-verified row only.
  const { data: sellerNameRow, error: sellerNameErr } = await supabaseAdmin
    .from('products').select('seller_name').eq('id', id).single();
  if (sellerNameErr) throw sellerNameErr;

  const newProduct = {
    seller_id: userId,
    seller_name: sellerNameRow.seller_name,
    name: `${existing.name} (Bản sao)`,
    slug: `${existing.slug}-copy-${crypto.randomBytes(4).toString('hex')}`,
    description: existing.description,
    price: existing.price,
    sale_price: existing.sale_price,
    category_slug: existing.category_slug,
    brand_id: existing.brand_id,
    brand: existing.brand,
    condition: existing.condition,
    size: existing.size,
    stock: existing.stock,
    location: existing.location,
    is_negotiable: existing.is_negotiable,
    status: 'draft',
    listing_source: 'user',
    // Placeholder — image_url/thumbnail are NOT NULL columns. Overwritten
    // below with the copied primary image's own URL once that's known; for
    // the rare listing with zero images, the original's value is kept as-is
    // (there's no product_images row backing it either way in that case).
    image_url: existing.image_url,
    thumbnail: existing.thumbnail,
  };

  const { data: inserted, error } = await supabaseAdmin.from('products').insert(newProduct).select(LISTING_COLUMNS.join(',')).single();
  if (error) throw error;

  // Any owned Storage object copied for this attempt — rolled back if
  // anything below fails, so a partial copy never lingers.
  const copiedPaths = [];

  try {
    if (existing.images && existing.images.length > 0) {
      const newImageRecords = [];
      for (let i = 0; i < existing.images.length; i++) {
        const img = existing.images[i];
        const sourcePath = extractOwnedStoragePath(img.url, userId);

        if (!sourcePath) {
          // Not one of our own Storage objects (e.g. a seed/catalog or
          // otherwise external URL) — reference it as-is. We never "own"
          // (and therefore never later delete) a path we didn't create.
          newImageRecords.push({
            product_id: inserted.id, url: img.url, alt_text: img.alt_text,
            sort_order: img.sort_order, is_primary: img.is_primary,
          });
          continue;
        }

        // Deep copy into a brand-new, listing-specific path — the
        // duplicate never shares a physical file with the original, so
        // deleting either listing later can never break the other's photos.
        // The extension is read straight off the source path (it was
        // written by addImages()/createListing() using extFromMime at
        // upload time) rather than re-derived from a MIME type we don't have.
        const ext = sourcePath.includes('.') ? sourcePath.split('.').pop() : 'jpg';
        const destPath = `products/${userId}/${inserted.id}/${i}-${crypto.randomUUID()}.${ext}`;
        const { error: copyErr } = await supabaseAdmin.storage.from(BUCKET).copy(sourcePath, destPath);
        if (copyErr) throw new Error(`Không thể sao chép ảnh "${sourcePath}": ${copyErr.message}`);
        copiedPaths.push(destPath);

        const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(destPath);
        newImageRecords.push({
          product_id: inserted.id, url: pub.publicUrl, alt_text: img.alt_text,
          sort_order: img.sort_order, is_primary: img.is_primary,
        });
      }

      const { error: imgErr } = await supabaseAdmin.from('product_images').insert(newImageRecords);
      if (imgErr) throw imgErr;

      const primary = newImageRecords.find((r) => r.is_primary) || newImageRecords[0];
      if (primary) {
        const { error: updateErr } = await supabaseAdmin.from('products')
          .update({ image_url: primary.url, thumbnail: primary.url, updated_at: new Date().toISOString() })
          .eq('id', inserted.id);
        if (updateErr) throw updateErr;
      }
    }

    if (existing.sustainability && existing.sustainability.lifecycle_type) {
      const { data: row } = await supabaseAdmin.from('product_sustainability').select('*').eq('product_id', existing.id).maybeSingle();
      if (row) {
        const { product_id, created_at, updated_at, ...susFields } = row;
        await supabaseAdmin.from('product_sustainability').insert({ ...susFields, product_id: inserted.id });
      }
    }

    return getMyListingById(userId, inserted.id);
  } catch (err) {
    // Compensate for a partial failure — never leave a half-created
    // duplicate. Roll back any Storage objects already copied for this
    // attempt, then remove the product row itself (product_images and
    // product_sustainability cascade-delete with it).
    try {
      if (copiedPaths.length) {
        await supabaseAdmin.storage.from(BUCKET).remove(copiedPaths);
      }
    } catch (rollbackErr) {
      console.error(`Rollback warning: failed to remove copied images for aborted duplicate of ${id}:`, rollbackErr?.message || rollbackErr);
    }
    try {
      await supabaseAdmin.from('products').delete().eq('id', inserted.id);
    } catch (rollbackErr) {
      console.error(`Rollback warning: failed to remove the half-created duplicate row for ${id}:`, rollbackErr?.message || rollbackErr);
    }
    throw err;
  }
}

module.exports = {
  SellerListingError,
  listMyListings,
  getMyListingById,
  updateMyListing,
  transitionStatus,
  addImages,
  removeImage,
  reorderImages,
  getMyListingStats,
  deleteDraftListing,
  duplicateListing,
};
