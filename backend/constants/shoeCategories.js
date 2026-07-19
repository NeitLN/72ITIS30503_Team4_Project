// Category leaf slugs that require EU shoe sizing (or "One Size"), shared
// between listing creation (services/listingService.js) and seller listing
// edits (services/sellerListingService.js) so both enforce the identical
// rule. Mirrors the Shoes taxonomy added in
// supabase/migrations/20260720010000_add_shoes_taxonomy.sql.
const SHOE_LIKE_CATEGORIES = new Set(['shoes', 'slides', 'boots', 'loafers', 'other-shoes']);

module.exports = { SHOE_LIKE_CATEGORIES };
