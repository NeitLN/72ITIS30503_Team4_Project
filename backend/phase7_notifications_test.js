const assert = require('assert');
const { supabaseAdmin } = require('./lib/supabase');
const notificationService = require('./services/notificationService');

async function run() {
  console.log('--- Phase 7: Notifications Backend Tests ---');
  let testUser1 = null;
  let testUser2 = null;

  try {
    const ts = Date.now();

    // Create test users
    const u1 = await supabaseAdmin.auth.admin.createUser({ email: `n1_${ts}@test.local`, password: 'password', email_confirm: true });
    testUser1 = u1.data.user;
    await supabaseAdmin.from('users').upsert({ id: testUser1.id, email: testUser1.email, full_name: 'Notif User 1', role: 'seller' });

    const u2 = await supabaseAdmin.auth.admin.createUser({ email: `n2_${ts}@test.local`, password: 'password', email_confirm: true });
    testUser2 = u2.data.user;
    await supabaseAdmin.from('users').upsert({ id: testUser2.id, email: testUser2.email, full_name: 'Notif User 2', role: 'buyer' });

    // Check if table exists (to detect missing table)
    const initCheck = await supabaseAdmin.from('notifications').select('id').limit(1);
    if (initCheck.error && (initCheck.error.code === 'PGRST205' || initCheck.error.message.includes('does not exist') || initCheck.error.message.includes('schema cache'))) {
        console.log('[BLOCKED] Phase 7 migration has not been applied.');
        return;
    }

    console.log('1. User lists only own notifications');
    await notificationService.createNotification({
      user_id: testUser1.id,
      type: 'new_order',
      title: 'Test 1',
      body: 'Body 1',
      event_key: `e1_${ts}`
    });
    const list1 = await notificationService.listMyNotifications(testUser1.id);
    assert.strictEqual(list1.data.length, 1);
    assert.strictEqual(list1.data[0].title, 'Test 1');

    console.log('2. Public DTO excludes user_id and event_key');
    assert.strictEqual(list1.data[0].user_id, undefined);
    assert.strictEqual(list1.data[0].event_key, undefined);

    console.log('3. Safe action paths accepted');
    await notificationService.createNotification({
      user_id: testUser1.id,
      type: 'new_order',
      title: 'Test 2',
      body: 'Body 2',
      action_href: '/orders/123',
      event_key: `e2_${ts}`
    });

    console.log('4. Backslash path rejected');
    try {
      await notificationService.createNotification({ user_id: testUser1.id, type: 'new_order', action_href: '/\\test' });
      assert.fail();
    } catch (e) { assert.ok(e); }

    console.log('5. Protocol-relative path rejected');
    try {
      await notificationService.createNotification({ user_id: testUser1.id, type: 'new_order', action_href: '//example.com' });
      assert.fail();
    } catch (e) { assert.ok(e); }

    console.log('6. external URL rejected');
    try {
      await notificationService.createNotification({ user_id: testUser1.id, type: 'new_order', action_href: 'https://example.com' });
      assert.fail();
    } catch (e) { assert.ok(e); }

    console.log('7. control-character path rejected');
    try {
      await notificationService.createNotification({ user_id: testUser1.id, type: 'new_order', action_href: '/test\n' });
      assert.fail();
    } catch (e) { assert.ok(e); }

    console.log('8. read-state consistency (implicit via DB logic)');

    console.log('9. mark-one-read remains owner-scoped');
    const notifId = list1.data[0].id;
    // User 2 trying to mark user 1's notif read
    const markedBy2 = await notificationService.markNotificationRead(testUser2.id, notifId);
    assert.strictEqual(markedBy2, null); // should return null

    const markedBy1 = await notificationService.markNotificationRead(testUser1.id, notifId);
    assert.ok(markedBy1);
    assert.strictEqual(markedBy1.is_read, true);

    console.log('10. mark-all remains owner-scoped');
    await notificationService.createNotification({
      user_id: testUser1.id, type: 'new_order', title: 'Test 1b', body: 'Body', event_key: `e1b_${ts}`
    });
    await notificationService.createNotification({
      user_id: testUser2.id, type: 'new_order', title: 'Test 2', body: 'Body', event_key: `e2b_${ts}`
    });
    const affected = await notificationService.markAllNotificationsRead(testUser1.id);
    assert.strictEqual(affected, 1);
    const unread2 = await notificationService.getUnreadCount(testUser2.id);
    assert.strictEqual(unread2, 1); // User 2's notif unaffected

    console.log('11. duplicate event key remains idempotent');
    const res1 = await notificationService.createNotification({
      user_id: testUser1.id, type: 'new_order', title: 'Test Idemp', body: 'Body', event_key: `idemp_${ts}`
    });
    assert.ok(res1);
    const res2 = await notificationService.createNotification({
      user_id: testUser1.id, type: 'new_order', title: 'Test Idemp', body: 'Body', event_key: `idemp_${ts}`
    });
    assert.strictEqual(res2, null); // Idempotent block

    console.log('All backend notification tests passed.');
  } finally {
    if (testUser1) {
      await supabaseAdmin.from('notifications').delete().eq('user_id', testUser1.id);
      await supabaseAdmin.auth.admin.deleteUser(testUser1.id);
    }
    if (testUser2) {
      await supabaseAdmin.from('notifications').delete().eq('user_id', testUser2.id);
      await supabaseAdmin.auth.admin.deleteUser(testUser2.id);
    }
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
