/**
 * Phase 8 — real public seller storefronts.
 *
 * Replaces the previous implementation, which never returned null and
 * fabricated a plausible-looking profile (rating, sold count, bio) for ANY
 * username string, including gibberish. This version returns only real
 * data derived from the actual schema, or null for an unknown seller —
 * callers (routes/sellers.js) turn that into a real 404.
 *
 * Only a safe, explicit column allowlist is ever selected from `users` —
 * never `select('*')` — so email/password_hash/phone/role never even enter
 * server memory for a public request.
 */
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { normalizeUsername, isValidUsernameFormat } = require('./profileService');

const checkDb = () => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
};

const PUBLIC_SELLER_COLUMNS = 'id, username, full_name, avatar_url, bio, location, created_at';

async function resolveSellerByUsername(rawUsername) {
  checkDb();

  const normalized = normalizeUsername(decodeURIComponent(String(rawUsername || '')));
  if (!isValidUsernameFormat(normalized)) return null;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(PUBLIC_SELLER_COLUMNS)
    .eq('username', normalized)
    .maybeSingle();
  if (error) throw error;
  if (!user) return null;

  return user;
}

function buildPublicSellerDto(internalSeller, metrics) {
  return {
    username: internalSeller.username,
    full_name: internalSeller.full_name,
    avatar_url: internalSeller.avatar_url || null,
    bio: internalSeller.bio || null,
    location: internalSeller.location || null,
    created_at: internalSeller.created_at,
    active_listing_count: metrics.activeListingCount || 0,
    sold_count: metrics.soldCount || 0,
    seller_rating: metrics.averageRating || null,
    review_count: metrics.reviewCount || 0,
  };
}

async function getSellerByUsername(rawUsername) {
  const internalSeller = await resolveSellerByUsername(rawUsername);
  if (!internalSeller) return null;

  const { count: activeListingCount, error: activeCountError } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', internalSeller.id)
    .eq('listing_source', 'user')
    .eq('status', 'active');
  if (activeCountError) throw activeCountError;

  const { data: sellerProductIds, error: prodIdsError } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('seller_id', internalSeller.id);
  if (prodIdsError) throw prodIdsError;
  const productIds = (sellerProductIds || []).map((p) => p.id);

  // Real sold count uses the immutable seller snapshot on order_items, so a
  // later product edit cannot rewrite historical seller attribution.
  let soldCount = 0;
  const { data: completedItems, error: completedItemsError } = await supabaseAdmin
    .from('order_items')
    .select('quantity')
    .eq('seller_id', internalSeller.id)
    .eq('fulfillment_status', 'completed');
  if (completedItemsError) throw completedItemsError;

  soldCount = (completedItems || []).reduce((sum, item) => {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return sum;
    return sum + Math.floor(quantity);
  }, 0);

  // Real rating/review count: published reviews on this seller's products.
  let averageRating = null;
  let reviewCount = 0;
  if (productIds.length > 0) {
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .in('product_id', productIds)
      .eq('status', 'published');
    if (reviewsError) throw reviewsError;

    // Filter to valid ratings
    const validReviews = (reviews || []).filter(r => {
      const val = Number(r.rating);
      return Number.isFinite(val) && val >= 1 && val <= 5;
    });

    reviewCount = validReviews.length;
    if (reviewCount > 0) {
      averageRating = Math.round((validReviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviewCount) * 10) / 10;
    }
  }

  const dto = buildPublicSellerDto(internalSeller, {
    activeListingCount,
    soldCount,
    averageRating,
    reviewCount
  });

  // Attach the internal id to the dto so that the router can pass it to productService
  // We will configure the router to explicitly extract it out.
  // We attach it as a non-enumerable property so it doesn't show up in Object.keys() / JSON.stringify() by default,
  // but it's better to just return the internal ID separately or return an object with both.
  // Wait, let's just make getSellerByUsername return the dto, but how does routes/sellers.js know the internal ID?
  // routes/sellers.js uses `sellerService.getSellerByUsername(username)` and then uses `seller.id` for products.
  // Let's return the internal id on the dto explicitly and strip it in the route, as we already do.
  dto.id = internalSeller.id;

  return dto;
}

module.exports = {
  getSellerByUsername,
  resolveSellerByUsername,
  buildPublicSellerDto,
};
