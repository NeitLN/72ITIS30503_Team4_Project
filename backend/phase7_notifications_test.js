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

    console.log('2. Cross-user notification hidden');
    const list2 = await notificationService.listMyNotifications(testUser2.id);
    assert.strictEqual(list2.data.length, 0);

    console.log('3. Unread count exact');
    let unread1 = await notificationService.getUnreadCount(testUser1.id);
    assert.strictEqual(unread1, 1);

    console.log('4. Mark-one-read owner scoped');
    const notifId = list1.data[0].id;
    // User 2 trying to mark user 1's notif read
    const markedBy2 = await notificationService.markNotificationRead(testUser2.id, notifId);
    assert.strictEqual(markedBy2, null); // should return null

    const markedBy1 = await notificationService.markNotificationRead(testUser1.id, notifId);
    assert.ok(markedBy1);
    assert.strictEqual(markedBy1.is_read, true);

    console.log('5. Read notification excluded from unread count');
    unread1 = await notificationService.getUnreadCount(testUser1.id);
    assert.strictEqual(unread1, 0);

    console.log('6. Mark-all affects only current user');
    await notificationService.createNotification({
      user_id: testUser1.id, type: 'new_order', title: 'Test 1b', body: 'Body', event_key: `e1b_${ts}`
    });
    await notificationService.createNotification({
      user_id: testUser2.id, type: 'new_order', title: 'Test 2', body: 'Body', event_key: `e2_${ts}`
    });
    const affected = await notificationService.markAllNotificationsRead(testUser1.id);
    assert.strictEqual(affected, 1);
    const unread2 = await notificationService.getUnreadCount(testUser2.id);
    assert.strictEqual(unread2, 1); // User 2's notif unaffected

    console.log('7. Duplicate event_key does not duplicate notification');
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

run().catch(console.error);