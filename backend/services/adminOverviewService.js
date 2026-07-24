const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { ServiceError } = require('../utils/serviceError');

function checkDb() {
  if (!isSupabaseAdminConfigured()) {
    throw new ServiceError('DATABASE_NOT_CONFIGURED', 'Hệ thống chưa được cấu hình.', 503);
  }
}

async function verifyAdminActor(user) {
  checkDb();
  if (!user?.id) {
    throw new ServiceError('ADMIN_REQUIRED', 'Yêu cầu quyền quản trị viên.', 403);
  }
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,role')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data || data.role !== 'admin') {
    throw new ServiceError('ADMIN_REQUIRED', 'Yêu cầu quyền quản trị viên.', 403);
  }
  return data;
}

function getSevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

async function getOverview(user) {
  await verifyAdminActor(user);

  const sevenDaysAgo = getSevenDaysAgo();

  // 1. Transaction Summary RPC
  const { data: txSummary, error: txError } = await supabaseAdmin.rpc('stylehub_admin_transaction_summary', {
    p_actor_id: user.id
  });
  if (txError) throw new ServiceError('ADMIN_OVERVIEW_FAILED', 'Không thể tải tổng quan giao dịch.', 500);

  // 2. Fetch counts concurrently
  const queries = [
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'seller').gte('created_at', sevenDaysAgo),

    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'hidden'),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', sevenDaysAgo),

    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', sevenDaysAgo),

    // Sum calculation for completed orders
    supabaseAdmin.from('orders').select('total_amount').eq('status', 'completed')
  ];

  const results = await Promise.all(queries);

  // Extract counts
  const totalUsers = results[0].count || 0;
  const activeSellers = results[1].count || 0;
  const newSellers7d = results[2].count || 0;

  const activeProducts = results[3].count || 0;
  const soldProducts = results[4].count || 0;
  const hiddenProducts = results[5].count || 0;
  const newProducts7d = results[6].count || 0;

  const totalOrders = results[7].count || 0;
  const completedOrders7d = results[8].count || 0;

  // Calculate GMV
  const completedAmounts = results[9].data || [];
  const transactionValue = completedAmounts.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // 3. Fetch Recent Orders (limit 10)
  const { data: recentOrdersData, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id, order_code, user_id, status, payment_method, total_amount, created_at, users!orders_user_id_fkey(full_name), order_items(seller_id)')
    .order('created_at', { ascending: false })
    .limit(5);

  // 4. Fetch Recent Transactions (limit 10)
  // Payments table doesn't have direct FK relation cached nicely sometimes, so we fetch payments, then orders
  const { data: recentPaymentsData } = await supabaseAdmin
    .from('payments')
    .select('id, order_id, state, payment_method, gross_amount, created_at')
    .not('state', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  let recentTransactions = [];
  if (recentPaymentsData && recentPaymentsData.length > 0) {
    const orderIds = recentPaymentsData.map(p => p.order_id).filter(Boolean);
    const { data: relatedOrders } = await supabaseAdmin
      .from('orders')
      .select('id, order_code')
      .in('id', orderIds);

    const orderMap = {};
    if (relatedOrders) {
      relatedOrders.forEach(o => orderMap[o.id] = o.order_code);
    }

    recentTransactions = recentPaymentsData.map(p => ({
      id: p.id,
      order_id: p.order_id,
      order_code: orderMap[p.order_id] || 'N/A',
      state: p.state,
      payment_method: p.payment_method,
      amount: p.gross_amount,
      created_at: p.created_at
    }));
  }

  // Format orders to extract seller info gracefully
  let recentOrders = [];
  if (recentOrdersData) {
    recentOrders = recentOrdersData.map(o => {
      const sellerIds = new Set(o.order_items?.map(i => i.seller_id).filter(Boolean) || []);

      return {
        id: o.id,
        order_code: o.order_code,
        buyer_name: o.users?.full_name || 'Khách hàng',
        seller_count: sellerIds.size,
        status: o.status,
        payment_method: o.payment_method,
        total_amount: o.total_amount,
        created_at: o.created_at
      };
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      totalUsers,
      activeSellers,
      activeProducts,
      totalOrders,
      totalTransactions: txSummary?.totalTransactions || 0,
      transactionValue
    },
    attention: {
      pendingTransactions: txSummary?.heldPayments || 0,
      processingOrders: txSummary?.processingOrders || 0,
      failedPayments: txSummary?.failedPayments || 0,
      cancellationRequests: txSummary?.cancelledOrders || 0
    },
    transactionStatuses: {
      pending: txSummary?.pendingOrders || 0,
      processing: txSummary?.processingOrders || 0,
      completed: txSummary?.completedOrders || 0,
      cancelled: txSummary?.cancelledOrders || 0
    },
    recentOrders,
    recentTransactions,
    marketplaceActivity: {
      activeProducts,
      newProducts7d,
      soldProducts,
      hiddenProducts,
      newSellers7d,
      completedOrders7d
    }
  };
}

module.exports = {
  getOverview
};
