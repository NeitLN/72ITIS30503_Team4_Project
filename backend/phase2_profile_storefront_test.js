const assert = require('assert');
const profileService = require('./services/profileService');
const sellerService = require('./services/sellerService');
const productService = require('./services/productService');
const { supabaseAdmin } = require('./lib/supabase');

async function run() {
  console.log('--- Phase 2: Seller Profile and Public Storefront Tests ---');
  let testUser1 = null;
  let testUser2 = null;

  try {
    const ts = Date.now();
    const u1 = await supabaseAdmin.auth.admin.createUser({ email: `p2_1_${ts}@test.local`, password: 'password', email_confirm: true });
    testUser1 = u1.data.user;
    await supabaseAdmin.from('users').upsert({ id: testUser1.id, email: testUser1.email, full_name: 'Test 1', role: 'customer' });

    const u2 = await supabaseAdmin.auth.admin.createUser({ email: `p2_2_${ts}@test.local`, password: 'password', email_confirm: true });
    testUser2 = u2.data.user;
    await supabaseAdmin.from('users').upsert({ id: testUser2.id, email: testUser2.email, full_name: 'Test 2', role: 'customer' });

    console.log('1. Authenticated user reads own private profile');
    const myProfile = await profileService.getMyProfile(testUser1.id);
    assert.strictEqual(myProfile.id, testUser1.id);
    assert.strictEqual(myProfile.email, testUser1.email);

    console.log('2. Unsupported private field cannot be mass-assigned');
    const beforeUpdate = await profileService.getMyProfile(testUser1.id);
    await profileService.updateMyProfile(testUser1.id, { role: 'admin', is_verified: true, display_name: 'Updated 1' });
    const afterUpdate = await profileService.getMyProfile(testUser1.id);
    assert.strictEqual(afterUpdate.role, beforeUpdate.role, 'Role should not change');
    assert.strictEqual(afterUpdate.full_name, 'Updated 1');

    console.log('3. Valid username accepted');
    const username1 = `u1_${ts}`;
    await profileService.updateMyProfile(testUser1.id, { username: username1 });
    const p1 = await profileService.getMyProfile(testUser1.id);
    assert.strictEqual(p1.username, username1);

    console.log('4. Invalid username rejected');
    try {
      await profileService.updateMyProfile(testUser1.id, { username: 'a' }); // Too short
      assert.fail('Should have rejected short username');
    } catch (e) { assert.strictEqual(e.status, 422); }
    try {
      await profileService.updateMyProfile(testUser1.id, { username: 'invalid name!' });
      assert.fail('Should have rejected space/special char');
    } catch (e) { assert.strictEqual(e.status, 422); }

    console.log('5. Duplicate case-insensitive username rejected');
    try {
      await profileService.updateMyProfile(testUser2.id, { username: username1.toUpperCase() });
      assert.fail('Should have rejected duplicate username');
    } catch (e) {
      assert.strictEqual(e.status, 409);
    }

    console.log('6. Updating to current own username succeeds');
    await profileService.updateMyProfile(testUser1.id, { username: username1 });

    console.log('7. Missing storefront returns null');
    const noSeller = await sellerService.getSellerByUsername('non_existent_123');
    assert.strictEqual(noSeller, null);

    console.log('8. Public storefront response excludes internal data');
    const pub = await sellerService.getSellerByUsername(username1);
    assert.ok(pub);
    assert.strictEqual(pub.email, undefined);
    assert.strictEqual(pub.role, undefined);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(pub, 'is_verified_seller'), false, 'DTO must not include fake verification');
    assert.strictEqual(pub.id, testUser1.id); // Internal ID still returned by service, stripped in route!

    console.log('9. Public storefront contains only user-sourced active listings');
    const { data: prods } = await productService.getProducts({ trusted_seller_id: testUser1.id, listing_source: 'user' });
    assert.strictEqual(prods.length, 0); // Empty storefront

    console.log('10. Client-supplied seller_id cannot override trusted resolution');
    const { data: hackedProds } = await productService.getProducts({ seller: 'fake', trusted_seller_id: testUser1.id });
    assert.strictEqual(hackedProds.length, 0);

    console.log('All backend tests passed for Phase 2.');
  } finally {
    if (testUser1) {
      await supabaseAdmin.from('products').delete().eq('seller_id', testUser1.id);
      await supabaseAdmin.auth.admin.deleteUser(testUser1.id);
    }
    if (testUser2) {
      await supabaseAdmin.from('products').delete().eq('seller_id', testUser2.id);
      await supabaseAdmin.auth.admin.deleteUser(testUser2.id);
    }
  }
}

run();