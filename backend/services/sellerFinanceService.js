const { supabaseAdmin, checkDb } = require('../lib/supabase');
const { ServiceError } = require('../utils/serviceError');

class SellerFinanceError extends ServiceError {}

async function getFinanceSummary(userId) {
  checkDb();

  const { data: allocations, error } = await supabaseAdmin
    .from('payment_allocations')
    .select('state, gross_amount, platform_fee, seller_net_amount')
    .eq('seller_id', userId);

  if (error) throw error;

  let grossRevenue = 0;
  let escrowAmount = 0;
  let availableAmount = 0;
  let paidOutAmount = 0; // Requires payout ledger, defaulting to 0 for now as 'released' means available to payout or paid. Let's treat 'released' as available.
  let platformFees = 0;
  let pendingOrders = 0;

  for (const a of allocations || []) {
    if (a.state === 'escrow') {
      escrowAmount += Number(a.seller_net_amount || 0);
      pendingOrders++;
    } else if (a.state === 'released') {
      availableAmount += Number(a.seller_net_amount || 0);
    }
    // Gross revenue only counts completed/released or escrow, basically anything not refunded/cancelled
    if (a.state === 'escrow' || a.state === 'released') {
      grossRevenue += Number(a.gross_amount || 0);
      platformFees += Number(a.platform_fee || 0);
    }
  }

  return {
    gross_revenue: grossRevenue,
    escrow_amount: escrowAmount,
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

async function getFinanceLedger(userId, { page = 1, limit = 20 } = {}) {
  checkDb();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
    .from('payment_allocations')
    .select(`
      id,
      state,
      gross_amount,
      platform_fee,
      seller_net_amount,
      created_at,
      released_at,
      order_id,
      order:orders (
        order_code,
        payment_method
      ),
      order_item:order_items (
        id,
        quantity,
        product:products (
          name
        )
      )
    `, { count: 'exact' })
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const formattedData = (data || []).map(a => ({
    id: a.id,
    order_code: a.order?.order_code,
    item_name: a.order_item?.product?.name,
    quantity: a.order_item?.quantity,
    gross_amount: a.gross_amount,
    platform_fee: a.platform_fee,
    net_amount: a.seller_net_amount,
    state: a.state, // 'escrow', 'released', 'refunded', 'cancelled'
    payment_method: a.order?.payment_method,
    created_at: a.created_at,
    released_at: a.released_at
  }));

  return {
    data: formattedData,
    meta: { page, limit, count: count || 0 }
  };
}

module.exports = {
  SellerFinanceError,
  getFinanceSummary,
  getFinanceLedger
};
