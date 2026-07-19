// Phase 9 — canonical seller-listing status model.
//
// Matches the live `products_status_check` constraint exactly
// (draft | active | hidden | sold | archived — see
// supabase/migrations/20260721000000_add_hidden_product_status.sql).
// Never invent a status string here without also migrating the DB
// constraint, and never accept a status transition the map below doesn't
// explicitly allow.
const LISTING_STATUSES = ['draft', 'active', 'hidden', 'sold', 'archived'];

// key = current status, value = set of statuses it may move to.
// Terminal states (sold, archived) have no forward transitions here;
// re-listing a sold/archived item means creating a new listing, not
// resurrecting the old one — this deliberately blocks reactivating a
// genuinely sold product.
const ALLOWED_TRANSITIONS = {
  draft: ['active', 'archived'],
  active: ['hidden', 'sold', 'archived'],
  hidden: ['active', 'archived'],
  sold: ['archived'],
  archived: [],
};

function isValidTransition(from, to) {
  return Array.isArray(ALLOWED_TRANSITIONS[from]) && ALLOWED_TRANSITIONS[from].includes(to);
}

// Fulfillment status for a single order_item, independent of the parent
// order's own `orders.status`. A seller only ever moves their own items
// along this chain — see supabase/migrations/20260721000001_*.sql.
const FULFILLMENT_STATUSES = ['awaiting_confirmation', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'];

const FULFILLMENT_TRANSITIONS = {
  awaiting_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
};

function isValidFulfillmentTransition(from, to) {
  return Array.isArray(FULFILLMENT_TRANSITIONS[from]) && FULFILLMENT_TRANSITIONS[from].includes(to);
}

module.exports = {
  LISTING_STATUSES,
  ALLOWED_TRANSITIONS,
  isValidTransition,
  FULFILLMENT_STATUSES,
  FULFILLMENT_TRANSITIONS,
  isValidFulfillmentTransition,
};
