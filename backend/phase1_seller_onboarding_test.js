const assert = require('assert');
const profileService = require('./services/profileService');
const { supabaseAdmin } = require('./lib/supabase');

async function run() {
  console.log('--- Phase 1: Seller Onboarding Backend Tests ---');
  let testUser = null;

  try {
    const run = `phase1-onboard-${Date.now()}`;
    const email = `${run}@stylehub.invalid`;
    const { data: authData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true
    });
    if (userErr) throw userErr;
    
    testUser = { id: authData.user.id };
    
    // Ensure the users table row exists (if no trigger, or to ensure full setup)
    const { error: insertErr } = await supabaseAdmin.from('users').upsert({
      id: testUser.id,
      email,
      full_name: 'Test Onboarding',
      role: 'customer'
    }, { onConflict: 'id' });
    if (insertErr) throw insertErr;
    
    console.log('Testing zero state readiness');
    let readiness = await profileService.getMyReadiness(testUser.id);
    assert.strictEqual(readiness.completedCount, 0);
    assert.strictEqual(readiness.isStorefrontAvailable, false);
    assert.strictEqual(readiness.hasDraftListing, false);
    
    console.log('Testing after setting username and location');
    await profileService.updateMyProfile(testUser.id, { username: `u_${Date.now()}`, location: 'Thành phố Hồ Chí Minh' });
    readiness = await profileService.getMyReadiness(testUser.id);
    assert.strictEqual(readiness.completedCount, 2);
    assert.strictEqual(readiness.isStorefrontAvailable, true);
    
    console.log('Testing after creating draft product');
    const { error: pErr } = await supabaseAdmin.from('products').insert({
      seller_id: testUser.id,
      name: 'Test Product',
      slug: `test-product-${Date.now()}`,
      description: 'Desc',
      price: 100000,
      status: 'draft',
      listing_source: 'user',
      category_slug: 't-shirts',
      image_url: '/images/test.jpg',
      seller_name: 'Test Onboarding',
      condition: 'new',
      size: 'M',
      location: 'Thành phố Hồ Chí Minh',
      brand: 'Test Brand'
    });
    if (pErr) throw pErr;
    
    readiness = await profileService.getMyReadiness(testUser.id);
    assert.strictEqual(readiness.hasDraftListing, true);
    assert.strictEqual(readiness.hasActiveListing, false);
    assert.ok(readiness.completedCount > 2); // username, location, first_listing

    console.log('All backend tests passed for Phase 1.');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    if (testUser) {
      await supabaseAdmin.from('products').delete().eq('seller_id', testUser.id);
      await supabaseAdmin.auth.admin.deleteUser(testUser.id);
    }
  }
}

run();