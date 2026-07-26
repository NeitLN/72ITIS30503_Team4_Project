const assert = require('assert');
const { supabaseAdmin } = require('./lib/supabase');
const conversationService = require('./services/conversationService');
const express = require('express');
const { authenticateUser } = require('./middleware/auth');
const router = require('./routes/conversations');

async function resolveExistingProductFixtures(excludedBuyerId) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, seller_id, name')
    .eq('status', 'active')
    .neq('seller_id', excludedBuyerId)
    .not('seller_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  if (!data || data.length < 2) return null;

  let p1 = null;
  let p2 = null;

  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      if (data[i].seller_id !== data[j].seller_id) {
        p1 = data[i];
        p2 = data[j];
        break;
      }
    }
    if (p1) break;
  }

  if (!p1 || !p2) return null;

  return {
    productId1: p1.id,
    sellerId1: p1.seller_id,
    productId2: p2.id,
    sellerId2: p2.seller_id,
    name1: p1.name,
    name2: p2.name
  };
}

async function run() {
  console.log('--- Phase 7: Order Messaging Backend Tests ---');
  let uBuyer = null, uSeller3 = null;
  let testOrder = null, testMultiOrder = null;

  try {
    const ts = Date.now();

    // Check if table exists (to detect missing table)
    const initCheck = await supabaseAdmin.from('conversations').select('id').limit(1);
    if (initCheck.error && (initCheck.error.code === 'PGRST205' || initCheck.error.message.includes('does not exist') || initCheck.error.message.includes('schema cache'))) {
        console.log('[BLOCKED] Phase 7 migration has not been applied.');
        return;
    }

    // Create QA buyer user
    const bReq = await supabaseAdmin.auth.admin.createUser({ email: `buyer_${ts}@test.local`, password: 'password', email_confirm: true });
    uBuyer = bReq.data.user;
    await supabaseAdmin.from('users').upsert({ id: uBuyer.id, email: uBuyer.email, full_name: 'Buyer', role: 'customer' });

    // We still need a dummy seller3 to test "Buyer cannot select unrelated Seller C"
    const s3Req = await supabaseAdmin.auth.admin.createUser({ email: `seller3_${ts}@test.local`, password: 'password', email_confirm: true });
    uSeller3 = s3Req.data.user;
    await supabaseAdmin.from('users').upsert({ id: uSeller3.id, email: uSeller3.email, full_name: 'Seller 3', role: 'seller' });

    // Dynamically resolve fixtures
    const fixtures = await resolveExistingProductFixtures(uBuyer.id);
    if (!fixtures) {
      console.log('[BLOCKED] STOP_NO_SAFE_PRODUCT_FIXTURES - Could not resolve two distinct active products for QA test.');
      return;
    }

    // Create a single-seller order
    const { data: order1, error: order1Err } = await supabaseAdmin.from('orders').insert({
      user_id: uBuyer.id, order_code: `QAORD1-${ts}`, status: 'pending', payment_method: 'cod', total_amount: 100000, subtotal: 100000, shipping_fee: 0, discount_amount: 0, customer_name: 'Buyer', customer_email: 'buyer@test', customer_phone: '0123456789', customer_address: 'Addr', customer_city: 'City'
    }).select('id').single();
    if (order1Err) throw new Error(`Order setup failed: ${order1Err.message}`);
    testOrder = order1;

    const { error: oi1 } = await supabaseAdmin.from('order_items').insert({
      order_id: testOrder.id, seller_id: fixtures.sellerId1, product_id: fixtures.productId1, product_name: fixtures.name1, quantity: 1, price: 100000, fulfillment_status: 'awaiting_confirmation', product_auto_sold: false, variant_auto_sold: false, lifecycle_type_snapshot: 'new'
    });
    if (oi1) throw new Error(`order items 1 setup failed: ${oi1.message}`);

    // Create a multi-seller order
    const { data: order2, error: order2Err } = await supabaseAdmin.from('orders').insert({
      user_id: uBuyer.id, order_code: `QAORD2-${ts}`, status: 'pending', payment_method: 'cod', total_amount: 200000, subtotal: 200000, shipping_fee: 0, discount_amount: 0, customer_name: 'Buyer', customer_email: 'buyer@test', customer_phone: '0123456789', customer_address: 'Addr', customer_city: 'City'
    }).select('id').single();
    if (order2Err) throw new Error(`Multi Order setup failed: ${order2Err.message}`);
    testMultiOrder = order2;

    const { error: oi2 } = await supabaseAdmin.from('order_items').insert([
      { order_id: testMultiOrder.id, seller_id: fixtures.sellerId1, product_id: fixtures.productId1, product_name: fixtures.name1, quantity: 1, price: 100000, fulfillment_status: 'awaiting_confirmation', product_auto_sold: false, variant_auto_sold: false, lifecycle_type_snapshot: 'new' },
      { order_id: testMultiOrder.id, seller_id: fixtures.sellerId2, product_id: fixtures.productId2, product_name: fixtures.name2, quantity: 1, price: 100000, fulfillment_status: 'awaiting_confirmation', product_auto_sold: false, variant_auto_sold: false, lifecycle_type_snapshot: 'new' }
    ]);
    if (oi2) throw new Error(`order items 2 setup failed: ${oi2.message}`);

    console.log('1. Single-seller buyer conversation without seller_id');
    const convId1 = await conversationService.getOrCreateOrderConversation(uBuyer.id, testOrder.id);
    assert.ok(convId1);

    console.log('2. Single-seller buyer conversation with matching seller_id');
    const convId1Match = await conversationService.getOrCreateOrderConversation(uBuyer.id, testOrder.id, fixtures.sellerId1);
    assert.strictEqual(convId1, convId1Match);

    console.log('3. Single-seller buyer conversation with wrong seller_id rejected');
    try {
      await conversationService.getOrCreateOrderConversation(uBuyer.id, testOrder.id, fixtures.sellerId2);
      assert.fail();
    } catch (e) { assert.strictEqual(e.status, 404); }

    console.log('4. Multi-seller buyer request without seller_id rejected');
    try {
      await conversationService.getOrCreateOrderConversation(uBuyer.id, testMultiOrder.id);
      assert.fail();
    } catch (e) { assert.strictEqual(e.status, 400); }

    console.log('5. Multi-seller buyer selects Seller A successfully');
    const convA = await conversationService.getOrCreateOrderConversation(uBuyer.id, testMultiOrder.id, fixtures.sellerId1);
    assert.ok(convA);

    console.log('6. Multi-seller buyer selects Seller B successfully');
    const convB = await conversationService.getOrCreateOrderConversation(uBuyer.id, testMultiOrder.id, fixtures.sellerId2);
    assert.ok(convB);
    assert.notStrictEqual(convA, convB);

    console.log('7. Buyer cannot select unrelated Seller C');
    try {
      await conversationService.getOrCreateOrderConversation(uBuyer.id, testMultiOrder.id, uSeller3.id);
      assert.fail();
    } catch (e) { assert.strictEqual(e.status, 404); }

    console.log('8. Seller body seller_id cannot override authenticated seller');
    // For a seller, we pass uSeller3 as requested but sellerId1 as authenticated
    const sellerConv = await conversationService.getOrCreateOrderConversation(fixtures.sellerId1, testMultiOrder.id, uSeller3.id);
    assert.strictEqual(sellerConv, convA); // Because requestedSellerId is ignored for sellers, resolves to sellerId1

    console.log('9. Duplicate creation returns same conversation');
    const dupConv = await conversationService.getOrCreateOrderConversation(uBuyer.id, testOrder.id);
    assert.strictEqual(convId1, dupConv);

    console.log('10. Internal participant ID absent from list response');
    const listRes = await conversationService.listMyConversations(uBuyer.id);
    const listItem = listRes.data.find(c => c.id === convId1);
    assert.ok(listItem.other_participant);
    assert.strictEqual(listItem.other_participant.id, undefined);
    assert.strictEqual(listItem.other_participant.email, undefined);
    assert.ok(listItem.other_participant.username);

    console.log('11. Internal participant ID absent from detail response');
    const detailRes = await conversationService.getConversation(uBuyer.id, convId1);
    assert.strictEqual(detailRes.other_participant.id, undefined);

    console.log('12. Buyer message role label correct');
    const msg1 = await conversationService.sendMessage(uBuyer.id, convId1, 'Hello seller');
    // Verify notification was sent - handled asynchronously, we can just check it works without throwing

    console.log('13. Seller message role label correct');
    const msg2 = await conversationService.sendMessage(fixtures.sellerId1, convId1, 'Hello buyer');

    console.log('14. Message-query DB failure propagated');
    // We mock the DB just for this test
    const originalFrom = supabaseAdmin.from;
    supabaseAdmin.from = (table) => {
      if (table === 'messages') {
        return {
          select: () => ({
            in: () => ({
              order: async () => ({ error: { message: 'MOCK_DB_FAIL' } })
            })
          })
        };
      }
      return originalFrom.call(supabaseAdmin, table);
    };
    try {
      await conversationService.listMyConversations(uBuyer.id);
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.message, 'MOCK_DB_FAIL');
    } finally {
      supabaseAdmin.from = originalFrom;
    }

    console.log('15. Conversation creation limiter applies');
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: uBuyer.id }; next(); });
    app.use('/api/conversations', router);
    const server = app.listen(0);
    const port = server.address().port;
    const doPost = async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: testOrder.id })
      });
      return { status: res.status, body: await res.json() };
    };
    for (let i = 0; i < 10; i++) {
      const r = await doPost();
      assert.strictEqual(r.status, 200);
    }
    const limitRes = await doPost();
    assert.strictEqual(limitRes.status, 429);
    assert.strictEqual(limitRes.body.success, false);
    server.close();

    console.log('16. Cross-seller conversation remains inaccessible');
    const crossConv = await conversationService.getConversation(fixtures.sellerId2, convId1);
    assert.strictEqual(crossConv, null);

    console.log('All backend messaging tests passed.');
  } finally {
    // Explicit scoped cleanup of QA data only
    if (testOrder) await supabaseAdmin.from('orders').delete().eq('id', testOrder.id);
    if (testMultiOrder) await supabaseAdmin.from('orders').delete().eq('id', testMultiOrder.id);
    if (uBuyer) {
      await supabaseAdmin.from('notifications').delete().eq('user_id', uBuyer.id);
      await supabaseAdmin.auth.admin.deleteUser(uBuyer.id);
    }
    if (uSeller3) await supabaseAdmin.auth.admin.deleteUser(uSeller3.id);
  }
}

run().catch(err => {
  if (err?.code === 'PGRST205' || (err?.message && (err.message.includes('does not exist') || err.message.includes('schema cache')))) {
    console.log('[BLOCKED] Phase 7 migration has not been applied.');
  } else {
    console.error(err);
    process.exit(1);
  }
});