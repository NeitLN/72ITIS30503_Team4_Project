const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { CIRCULAR_LIFECYCLE_TYPES, LIFECYCLE_TYPES } = require('../constants/sustainability');
const sellerService = require('./sellerService');

const METHODOLOGY_VERSION = '1.0';
const PAGE_SIZE = 1000;
const CIRCULAR_SET = new Set(CIRCULAR_LIFECYCLE_TYPES);
const LIFECYCLE_SET = new Set(LIFECYCLE_TYPES);

function checkDb() {
  if (!isSupabaseAdminConfigured()) throw new Error('DATABASE_NOT_CONFIGURED');
}

function emptyBreakdown() {
  return Object.fromEntries(CIRCULAR_LIFECYCLE_TYPES.map((type) => [type, 0]));
}

function normalizedLifecycle(value) {
  return LIFECYCLE_SET.has(value) ? value : 'not_specified';
}

function roundPercent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function summarizeActiveListings(products = [], sustainabilityRows = []) {
  const journeys = new Map(
    sustainabilityRows.map((row) => [String(row.product_id), normalizedLifecycle(row.lifecycle_type)]),
  );
  const breakdown = emptyBreakdown();
  let activeJourneyListings = 0;
  let activeCircularListings = 0;

  for (const product of products) {
    const lifecycle = journeys.get(String(product.id)) || 'not_specified';
    if (lifecycle !== 'not_specified') activeJourneyListings += 1;
    if (CIRCULAR_SET.has(lifecycle)) {
      activeCircularListings += 1;
      breakdown[lifecycle] += 1;
    }
  }

  const activeUserListings = products.length;
  return {
    activeUserListings,
    activeJourneyListings,
    journeyCoveragePercent: roundPercent(activeJourneyListings, activeUserListings),
    activeCircularListings,
    breakdown,
  };
}

function summarizeCompletedItems(items = []) {
  const breakdown = emptyBreakdown();
  let completedCircularUnits = 0;
  for (const item of items) {
    const lifecycle = normalizedLifecycle(item.lifecycle_type_snapshot);
    if (!CIRCULAR_SET.has(lifecycle)) continue;
    const quantity = Number(item.quantity);
    const units = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    completedCircularUnits += units;
    breakdown[lifecycle] += units;
  }
  return { completedCircularUnits, breakdown };
}

async function readAll(makeQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function readJourneys(productIds) {
  if (!productIds.length) return [];
  const rows = [];
  for (let index = 0; index < productIds.length; index += 500) {
    const ids = productIds.slice(index, index + 500);
    const { data, error } = await supabaseAdmin
      .from('product_sustainability')
      .select('product_id, lifecycle_type')
      .in('product_id', ids);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

async function readActiveListings(sellerId = null) {
  const products = await readAll(() => {
    let query = supabaseAdmin
      .from('products')
      .select('id')
      .eq('status', 'active')
      .eq('listing_source', 'user')
      .order('id', { ascending: true });
    if (sellerId) query = query.eq('seller_id', sellerId);
    return query;
  });
  const journeys = await readJourneys(products.map((row) => row.id));
  return summarizeActiveListings(products, journeys);
}

async function readCompletedItems({ sellerId = null, orderIds = null } = {}) {
  if (Array.isArray(orderIds) && orderIds.length === 0) return [];
  if (Array.isArray(orderIds) && orderIds.length > 500) {
    const rows = [];
    for (let index = 0; index < orderIds.length; index += 500) {
      rows.push(...await readCompletedItems({ sellerId, orderIds: orderIds.slice(index, index + 500) }));
    }
    return rows;
  }
  return readAll(() => {
    let query = supabaseAdmin
      .from('order_items')
      .select('id, quantity, lifecycle_type_snapshot')
      .eq('fulfillment_status', 'completed')
      .order('id', { ascending: true });
    if (sellerId) query = query.eq('seller_id', sellerId);
    if (Array.isArray(orderIds)) query = query.in('order_id', orderIds);
    return query;
  });
}

function responseBase(scope) {
  return {
    scope,
    methodologyVersion: METHODOLOGY_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

async function getPlatformImpact() {
  checkDb();
  const [active, completedItems] = await Promise.all([
    readActiveListings(),
    readCompletedItems(),
  ]);
  const completed = summarizeCompletedItems(completedItems);
  return {
    ...responseBase('platform'),
    metrics: {
      activeUserListings: active.activeUserListings,
      activeJourneyListings: active.activeJourneyListings,
      journeyCoveragePercent: active.journeyCoveragePercent,
      activeCircularListings: active.activeCircularListings,
      completedCircularUnits: completed.completedCircularUnits,
    },
    activeLifecycleBreakdown: active.breakdown,
    completedLifecycleBreakdown: completed.breakdown,
  };
}

async function getProfileImpact(userId) {
  checkDb();
  const [active, soldItems, orders] = await Promise.all([
    readActiveListings(userId),
    readCompletedItems({ sellerId: userId }),
    readAll(() => supabaseAdmin
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .order('id', { ascending: true })),
  ]);
  const purchasedItems = await readCompletedItems({ orderIds: orders.map((row) => row.id) });
  const sold = summarizeCompletedItems(soldItems);
  const purchased = summarizeCompletedItems(purchasedItems);
  return {
    ...responseBase('profile'),
    metrics: {
      activeUserListings: active.activeUserListings,
      activeJourneyListings: active.activeJourneyListings,
      journeyCoveragePercent: active.journeyCoveragePercent,
      activeCircularListings: active.activeCircularListings,
      circularUnitsSold: sold.completedCircularUnits,
      circularUnitsPurchased: purchased.completedCircularUnits,
    },
    activeLifecycleBreakdown: active.breakdown,
    soldLifecycleBreakdown: sold.breakdown,
    purchasedLifecycleBreakdown: purchased.breakdown,
  };
}

async function getPublicSellerImpact(username) {
  checkDb();
  const seller = await sellerService.getSellerByUsername(username);
  if (!seller) return null;
  const [active, soldItems] = await Promise.all([
    readActiveListings(seller.id),
    readCompletedItems({ sellerId: seller.id }),
  ]);
  const sold = summarizeCompletedItems(soldItems);
  return {
    ...responseBase('public_seller'),
    metrics: {
      activeCircularListings: active.activeCircularListings,
      completedCircularUnitsSold: sold.completedCircularUnits,
    },
    activeLifecycleBreakdown: active.breakdown,
  };
}

module.exports = {
  METHODOLOGY_VERSION,
  summarizeActiveListings,
  summarizeCompletedItems,
  getPlatformImpact,
  getProfileImpact,
  getPublicSellerImpact,
};
