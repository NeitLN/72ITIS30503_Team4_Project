const { test } = require('node:test');
const assert = require('node:assert');
const supabaseModule = require('./lib/supabase');

// Capture original
const originalSupabaseAdmin = supabaseModule.supabaseAdmin;

// Helper to reload sellerListingService to pick up the mocked supabaseAdmin
function reloadService() {
  delete require.cache[require.resolve('./services/sellerListingService')];
  return require('./services/sellerListingService');
}

test('Phase 4: Inventory Service Rollback Injection', async (t) => {
  t.after(() => {
    supabaseModule.supabaseAdmin = originalSupabaseAdmin;
    reloadService();
  });

  await t.test('Variant fetch error causes failure and throws 500', async () => {
    supabaseModule.supabaseAdmin = {
      from: (table) => {
        if (table === 'products') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { id: 'p1', inventory_mode: 'simple', listing_source: 'user', seller_id: 'u1' }
                    })
                  })
                })
              })
            })
          };
        }
        if (table === 'product_variants') {
          return {
            select: () => ({
              eq: async () => ({ data: null, error: new Error('DB fetch failed') }),
              in: async () => ({ data: [] })
            })
          };
        }
        return { select: () => ({ in: () => ({ order: async () => ({ data: [] }), then: (cb) => cb({ data: [] }) }), then: (cb) => cb({ data: [] }) }) };
      },
      storage: {
        from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) })
      }
    };

    const sellerListingService = reloadService();

    try {
      await sellerListingService.updateMyListing('u1', 'p1', {
        inventory_mode: 'variant',
        variants: JSON.stringify([{ title: 'L', price: 100, stock: 1 }])
      });
      assert.fail('Should have thrown fetch error');
    } catch (e) {
      if (!e.message.includes('Could not fetch variants for safety snapshot')) {
        console.error('Actual error 1:', e.message, e.stack);
      }
      assert.ok(e.message.includes('Could not fetch variants for safety snapshot'));
    }
  });

  await t.test('Variant insert error triggers rollback', async () => {
    supabaseModule.supabaseAdmin = {
      from: (table) => {
        if (table === 'products') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { id: 'p1', inventory_mode: 'simple', listing_source: 'user', seller_id: 'u1', price: 100 }
                    })
                  })
                })
              })
            }),
            update: () => {
              return {
                eq: () => {
                  return {
                    eq: () => {
                      return {
                        eq: () => {
                          return { select: () => ({ maybeSingle: async () => ({ data: { id: 'p1' } }) }) };
                        }
                      }
                    },
                    select: () => ({ maybeSingle: async () => ({ data: { id: 'p1' } }) })
                  };
                }
              };
            }
          };
        }
        if (table === 'product_variants') {
          return {
            select: () => ({
              eq: async () => ({ data: [{ id: 'v1', title: 'Old', price: 100, stock: 1 }], error: null }),
              in: async () => ({ data: [] })
            }),
            update: () => ({ eq: () => ({ in: async () => ({ error: null }) }) }),
            insert: async () => ({ error: new Error('Simulated Insert Failure') }),
            delete: () => ({ eq: () => ({ not: async () => ({ error: null }) }) }),
            upsert: async () => {
              return { error: null };
            }
          };
        }
        return { select: () => ({ in: () => ({ order: async () => ({ data: [] }), then: (cb) => cb({ data: [] }) }), then: (cb) => cb({ data: [] }) }) };
      },
      storage: {
        from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) })
      }
    };

    const sellerListingService = reloadService();

    try {
      await sellerListingService.updateMyListing('u1', 'p1', {
        price: 200,
        inventory_mode: 'variant',
        variants: JSON.stringify([{ title: 'New', price: 100, stock: 1 }])
      });
      assert.fail('Should have thrown rollback integrity error');
    } catch (e) {
      if (e.status !== 500) {
        console.error('Actual error 2:', e.message, e.stack);
      }
      assert.strictEqual(e.status, 500);
      assert.ok(e.message.includes('Lỗi cập nhật. Vui lòng thử lại. (Mã lỗi: Insert variant failed'));
    }
  });
});
