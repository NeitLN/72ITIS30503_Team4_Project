const assert = require('assert');
const { supabaseAdmin } = require('./lib/supabase');
const conversationService = require('./services/conversationService');

async function run() {
  console.log('--- Phase 7: Order Messaging Backend Tests ---');
  let uBuyer = null, uSeller1 = null, uSeller2 = null;
  let testOrder = null, testOrder2 = null;

  try {
    const ts = Date.now();
    
    // Create users
    const bReq = await supabaseAdmin.auth.admin.createUser({ email: `buyer_${ts}@test.local`, password: 'password', email_confirm: true });
    uBuyer = bReq.data.user;
    await supabaseAdmin.from('users').upsert({ id: uBuyer.id, email: uBuyer.email, full_name: 'Buyer', role: 'customer' });

    const s1Req = await supabaseAdmin.auth.admin.createUser({ email: `seller1_${ts}@test.local`, password: 'password', email_confirm: true });
    uSeller1 = s1Req.data.user;
    await supabaseAdmin.from('users').upsert({ id: uSeller1.id, email: uSeller1.email, full_name: 'Seller 1', role: 'seller' });

    const s2Req = await supabaseAdmin.auth.admin.createUser({ email: `seller2_${ts}@test.local`, password: 'password', email_confirm: true });
    uSeller2 = s2Req.data.user;
    await supabaseAdmin.from('users').upsert({ id: uSeller2.id, email: uSeller2.email, full_name: 'Seller 2', role: 'seller' });

    // Create an order
    const { data: order } = await supabaseAdmin.from('orders').insert({
      user_id: uBuyer.id, buyer_id: uBuyer.id, order_code: `ORD-${ts}`, status: 'pending', payment_method: 'cod', total_amount: 100000, subtotal: 100000, shipping_fee: 0, customer_name: 'Buyer', customer_email: 'buyer@test', customer_phone: '0123456789', shipping_address: 'Addr', city: 'City'
    }).select('id').single();
    testOrder = order;

    // Create order items for Seller 1
    await supabaseAdmin.from('order_items').insert({
      order_id: testOrder.id, seller_id: uSeller1.id, product_id: '00000000-0000-0000-0000-000000000000', product_name: 'Test', product_slug: `test-${ts}`, quantity: 1, unit_price: 100000, price: 100000, line_total: 100000, sku: 'TEST'
    });

    console.log('1. Buyer can create conversation for their own order');
    const convId = await conversationService.getOrCreateOrderConversation(uBuyer.id, testOrder.id);
    assert.ok(convId);

    console.log('2. Duplicate conversation creation returns same conversation');
    const convId2 = await conversationService.getOrCreateOrderConversation(uBuyer.id, testOrder.id);
    assert.strictEqual(convId, convId2);

    console.log('3. Seller participant can access conversation');
    const s1Conv = await conversationService.getConversation(uSeller1.id, convId);
    assert.ok(s1Conv);

    console.log('4. Unrelated user cannot access conversation');
    const s2Conv = await conversationService.getConversation(uSeller2.id, convId);
    assert.strictEqual(s2Conv, null);

    console.log('5. Participant can send valid text');
    const msg = await conversationService.sendMessage(uBuyer.id, convId, 'Hello seller!');
    assert.ok(msg);
    assert.strictEqual(msg.sender_id, uBuyer.id);
    assert.strictEqual(msg.body, 'Hello seller!');

    console.log('6. Participant can list messages');
    const msgs = await conversationService.listMessages(uSeller1.id, convId);
    assert.strictEqual(msgs.data.length, 1);
    assert.strictEqual(msgs.data[0].body, 'Hello seller!');

    console.log('7. Empty text rejected');
    try {
      await conversationService.sendMessage(uBuyer.id, convId, '   ');
      assert.fail('Should reject empty');
    } catch (e) { assert.strictEqual(e.status, 422); }

    console.log('8. Mark-read affects only current participant state');
    await conversationService.markConversationRead(uSeller1.id, convId);
    const msgsAfterRead = await conversationService.listMessages(uSeller1.id, convId);
    assert.strictEqual(msgsAfterRead.data[0].is_read, true);

    console.log('9. Report accessible message succeeds');
    const reportRes = await conversationService.reportMessage(uSeller1.id, msg.id, 'Spam message');
    assert.strictEqual(reportRes, true);

    console.log('10. Reporting inaccessible message rejected');
    try {
      await conversationService.reportMessage(uSeller2.id, msg.id, 'Spam');
      assert.fail('Should reject unauthorized report');
    } catch (e) { assert.strictEqual(e.status, 404); }

    console.log('All backend messaging tests passed.');
  } finally {
    if (testOrder) await supabaseAdmin.from('orders').delete().eq('id', testOrder.id);
    if (testOrder2) await supabaseAdmin.from('orders').delete().eq('id', testOrder2.id);
    if (uBuyer) await supabaseAdmin.auth.admin.deleteUser(uBuyer.id);
    if (uSeller1) await supabaseAdmin.auth.admin.deleteUser(uSeller1.id);
    if (uSeller2) await supabaseAdmin.auth.admin.deleteUser(uSeller2.id);
  }
}

run().catch(console.error);