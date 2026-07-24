const test = require('node:test');
const assert = require('node:assert/strict');
const proxyquire = require('proxyquire');

// Mock setup for testing independent sourcing of totalOrders and totalPayments
function setupMockService(ordersCount, paymentsCount, mockPaymentsError = null) {
  const mockSupabaseAdmin = {
    rpc: (fn, params) => {
      return Promise.resolve({ data: {}, error: null });
    },
    from: (table) => ({
      select: (columns, options) => {
        const mockChain = {
          eq: () => mockChain,
          gte: () => mockChain,
          not: () => mockChain,
          order: () => mockChain,
          limit: () => mockChain,
          in: () => mockChain,
          maybeSingle: () => {
            if (table === 'users') return Promise.resolve({ data: { id: 'test-id', role: 'admin' }, error: null });
            return Promise.resolve({ data: null, error: null });
          },
          then: (resolve, reject) => {
            // Simulate the aggregate sum query for transactionValue
            if (table === 'orders' && columns === 'total_amount') {
              return resolve({ data: [], error: null });
            }

            // Handle independent counting logic
            if (table === 'orders') {
              return resolve({ count: ordersCount, error: null });
            }

            if (table === 'payments') {
              if (mockPaymentsError) {
                return resolve({ count: null, error: mockPaymentsError });
              }
              return resolve({ count: paymentsCount, error: null });
            }

            // Default fallback for users, products
            return resolve({ count: 0, error: null });
          }
        };
        return mockChain;
      }
    })
  };

  return proxyquire('./services/adminOverviewService', {
    '../lib/supabase': {
      supabaseAdmin: mockSupabaseAdmin,
      isSupabaseAdminConfigured: () => true
    }
  });
}

test('Admin Overview Metrics - Semantics Verification', async (t) => {
  const mockUser = { id: 'test-id', role: 'admin' };

  await t.test('Case A: Orders count = 34, Payments count = 0 (Empty payments table)', async () => {
    const adminOverviewService = setupMockService(34, 0);
    const overview = await adminOverviewService.getOverview(mockUser);

    assert.equal(overview.metrics.totalOrders, 34);
    assert.equal(overview.metrics.totalPayments, 0, 'Should gracefully return 0 when payments table is empty');
  });

  await t.test('Case B: Orders count = 34, Payments count = 3 (Multiple payment rows)', async () => {
    const adminOverviewService = setupMockService(34, 3);
    const overview = await adminOverviewService.getOverview(mockUser);

    assert.equal(overview.metrics.totalOrders, 34);
    assert.equal(overview.metrics.totalPayments, 3, 'Should source totalPayments completely independently from totalOrders');
  });

  await t.test('Case C: Payments query returns a database error', async () => {
    const mockError = { message: 'Database connection failed', code: '57P01' };
    const adminOverviewService = setupMockService(34, null, mockError);

    // According to the existing service convention in getOverview, errors on individual count queries
    // inside the Promise.all array do not throw; they silently yield undefined/null results
    // which fall back to `|| 0`. We assert this established convention.
    const overview = await adminOverviewService.getOverview(mockUser);
    assert.equal(overview.metrics.totalPayments, 0, 'Should gracefully fall back to 0 on DB error according to existing service convention');
  });

  await t.test('Case E: Confirm totalTransactions is not used as totalPayments', async () => {
    const adminOverviewService = setupMockService(34, 5);
    const overview = await adminOverviewService.getOverview(mockUser);

    assert.equal(overview.metrics.totalPayments, 5);
    assert.equal(overview.metrics.totalTransactions, undefined, 'totalTransactions should no longer exist on the top level overview payload');
  });
});
