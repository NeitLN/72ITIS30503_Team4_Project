const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');

// Matches SellerListingError/SellerOrderError exactly (plain Error, not
// utils/serviceError's ServiceError — that class expects a leading `code`
// argument, which the sibling services never pass either).
class SellerFinanceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status || 422;
  }
}

// lib/supabase.js does not export a `checkDb` helper — every other seller
// service (sellerListingService.js, sellerOrderService.js) defines its own
// local copy for exactly this reason. Matching that pattern.
const checkDb = () => {
  if (!isSupabaseAdminConfigured()) {
    throw new SellerFinanceError('Hệ thống chưa được cấu hình.', 503);
  }
};

// The only allocation states that actually exist — see
// payment_allocations' CHECK constraint in
// supabase/migrations/20260725000000_simulated_payment_escrow.sql.
// 'escrow' was never a real state; the held-in-escrow state is called 'held'.
const ALLOCATION_STATES = Object.freeze(['held', 'released', 'refunded', 'disputed']);

/**
 * Financial contract (mirrors the Admin transaction summary's use of
 * `held`/`released` in stylehub_admin_transaction_summary — see
 * supabase/migrations/20260726000000_admin_transaction_management.sql):
 *
 *   gross_revenue     = sum(gross_amount)      where state in (held, released)
 *                        Recognized sale value: money the buyer actually paid
 *                        for an order that didn't fail/refund/get disputed.
 *                        Chosen as held+released (not released-only) because
 *                        an order the Seller is still fulfilling is already
 *                        real revenue — it just hasn't been released yet.
 *   platform_fees     = sum(platform_fee)      where state in (held, released)
 *                        Fees tied 1:1 to the revenue counted above.
 *   escrow_amount     = sum(seller_net_amount) where state = held
 *                        The Seller's own take that is currently locked up,
 *                        not yet released.
 *   released_amount   = sum(seller_net_amount) where state = released
 *                        The Seller's own take that has been released.
 *   available_balance = released_amount - paid_out_amount
 *                        Until a real payout ledger exists, paid_out_amount
 *                        is always 0, so available_balance mirrors
 *                        released_amount exactly. This is intentional, not a
 *                        bug — see paid_out_amount below.
 *   paid_out_amount   = 0 (hard-coded; there is no payout ledger yet — do not
 *                        fabricate a value here).
 *   refunded_amount   = sum(seller_net_amount) where state = refunded
 *                        Never counted as revenue or as available.
 *   disputed_amount   = sum(seller_net_amount) where state = disputed
 *                        Not freely available while a dispute is open.
 *   pending_orders    = count(*)                where state = held
 *                        Number of held allocations for this Seller.
 *
 * Any allocation state outside ALLOCATION_STATES (should never happen given
 * the DB CHECK constraint, but handled defensively) contributes to none of
 * the above buckets — unknown states never count as revenue or available.
 */
/**
 * Pure calculation — takes already-fetched allocation rows and returns the
 * summary shape. Kept separate from the Supabase fetch so the formulas above
 * can be unit-tested without a database.
 */
function computeFinanceSummary(allocations) {
  let grossRevenue = 0;
  let platformFees = 0;
  let escrowAmount = 0;
  let releasedAmount = 0;
  let refundedAmount = 0;
  let disputedAmount = 0;
  let pendingOrders = 0;

  for (const a of allocations || []) {
    if (!ALLOCATION_STATES.includes(a.state)) continue; // unknown state: never counted

    if (a.state === 'held') {
      escrowAmount += Number(a.seller_net_amount || 0);
      pendingOrders++;
    } else if (a.state === 'released') {
      releasedAmount += Number(a.seller_net_amount || 0);
    } else if (a.state === 'refunded') {
      refundedAmount += Number(a.seller_net_amount || 0);
    } else if (a.state === 'disputed') {
      disputedAmount += Number(a.seller_net_amount || 0);
    }

    if (a.state === 'held' || a.state === 'released') {
      grossRevenue += Number(a.gross_amount || 0);
      platformFees += Number(a.platform_fee || 0);
    }
  }

  const paidOutAmount = 0; // No payout ledger exists yet — never fabricate this.
  const availableAmount = releasedAmount - paidOutAmount;

  return {
    gross_revenue: grossRevenue,
    escrow_amount: escrowAmount,
    released_amount: releasedAmount,
    refunded_amount: refundedAmount,
    disputed_amount: disputedAmount,
    available_balance: availableAmount,
    paid_out_amount: paidOutAmount,
    platform_fees: platformFees,
    pending_orders: pendingOrders,
    payout_method: {
      status: 'not_connected',
      label: 'Chưa liên kết tài khoản (Hệ thống thanh toán đang được phát triển)'
    }
  };
}

async function getFinanceSummary(userId) {
  checkDb();

  // Seller isolation: userId comes only from the authenticated caller
  // (req.user.id in routes/sellerFinance.js) — there is no code path here or
  // in the route that reads a client-supplied seller_id, so a request body
  // or query string cannot override whose allocations are returned.
  const { data: allocations, error } = await supabaseAdmin
    .from('payment_allocations')
    .select('state, gross_amount, platform_fee, seller_net_amount')
    .eq('seller_id', userId);

  if (error) throw error;

  return computeFinanceSummary(allocations || []);
}

async function getFinanceLedger(userId, { page = 1, limit = 20 } = {}) {
  checkDb();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // payment_allocations has no order_item_id column — it is one row per
  // (payment, seller), not per line item, so it cannot be embedded with
  // order_items (a prior attempt to do so failed at query time with a
  // PostgREST "no relationship found" error). order_code/payment_method
  // come from the real orders FK below.
  const { data, error, count } = await supabaseAdmin
    .from('payment_allocations')
    .select(`
      id,
      state,
      gross_amount,
      platform_fee,
      seller_net_amount,
      created_at,
      updated_at,
      order_id,
      order:orders (
        order_code,
        payment_method
      )
    `, { count: 'exact' })
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const formattedData = (data || []).map(a => ({
    id: a.id,
    order_code: a.order?.order_code,
    gross_amount: a.gross_amount,
    platform_fee: a.platform_fee,
    net_amount: a.seller_net_amount,
    state: a.state, // 'held', 'released', 'refunded', or 'disputed' — see ALLOCATION_STATES
    payment_method: a.order?.payment_method,
    created_at: a.created_at,
    // payment_allocations has no released_at column (only `payments` does);
    // updated_at is the closest real timestamp for "when this state last changed".
    released_at: a.state === 'released' ? a.updated_at : null
  }));

  return {
    data: formattedData,
    meta: { page, limit, count: count || 0 }
  };
}

module.exports = {
  SellerFinanceError,
  getFinanceSummary,
  getFinanceLedger,
  computeFinanceSummary,
  ALLOCATION_STATES
};
