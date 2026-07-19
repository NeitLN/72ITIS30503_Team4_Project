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

async function getSellerByUsername(rawUsername) {
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

  const { count: activeListingCount } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', user.id)
    .eq('status', 'active');

  const { data: sellerProductIds } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('seller_id', user.id);
  const productIds = (sellerProductIds || []).map((p) => p.id);

  // Real sold count uses the immutable seller snapshot on order_items, so a
  // later product edit cannot rewrite historical seller attribution.
  let soldCount = 0;
  const { count: completedItemCount } = await supabaseAdmin
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', user.id)
    .eq('fulfillment_status', 'completed');
  soldCount = completedItemCount || 0;

  // Real rating/review count: published reviews on this seller's products.
  let averageRating = null;
  let reviewCount = 0;
  if (productIds.length) {
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .in('product_id', productIds)
      .eq('status', 'published');
    reviewCount = (reviews || []).length;
    if (reviewCount > 0) {
      averageRating = Math.round((reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviewCount) * 10) / 10;
    }
  }

  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    avatar_url: user.avatar_url || null,
    bio: user.bio || null,
    location: user.location || null,
    created_at: user.created_at,
    is_verified_seller: false, // no real verification field/process exists yet — never fabricated
    active_listing_count: activeListingCount || 0,
    sold_count: soldCount,
    seller_rating: averageRating,
    review_count: reviewCount,
  };
}

module.exports = {
  getSellerByUsername,
};
