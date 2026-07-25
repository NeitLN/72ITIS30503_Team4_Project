/**
 * Phase 3 remediation: listing duplicate/delete integrity.
 *
 * Integration test — calls sellerListingService functions directly (the same
 * trust boundary the real routes/sellerListings.js already enforces: userId
 * is always the authenticated caller's id, never client input) against real,
 * disposable database rows and real (tiny) Storage objects. Everything this
 * test creates is deleted again in a `finally` block; nothing here mutates
 * or reads any real seller's data.
 */
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { supabaseAdmin } = require('./lib/supabase');
const sellerListingService = require('./services/sellerListingService');

const BUCKET = 'product-images';
const run = `p3li${Date.now().toString(36)}`;
const checks = [];

function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function expectError(fn, matcher) {
  try {
    await fn();
    return { threw: false };
  } catch (err) {
    return { threw: true, ok: matcher ? matcher(err) : true, err };
  }
}

// A minimal, valid 1x1 PNG — small enough to upload/copy/delete cheaply.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function createUser(label) {
  const row = {
    id: crypto.randomUUID(),
    email: `${run}-${label}@stylehub.invalid`,
    full_name: `Phase3 QA ${label}`,
    username: `p3_${label.replace(/-/g, '_')}_${crypto.randomBytes(3).toString('hex')}`,
    password_hash: 'phase3-local-test-only',
    role: 'seller',
  };
  const { data, error } = await supabaseAdmin.from('users').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

/** Uploads `count` real, tiny owned images and returns the product row with
 * its (already-attached) images, matching the shape sellerListingService's
 * own functions expect. */
async function createDraftListingWithImages(sellerId, { count = 2, status = 'draft', listingSource = 'user', extraImageUrl = null } = {}) {
  const { data: product, error } = await supabaseAdmin.from('products').insert({
    seller_id: sellerId,
    name: `${run} test listing`,
    slug: `${run}-listing-${crypto.randomBytes(4).toString('hex')}`,
    description: 'Phase3 integrity test fixture listing.',
    price: 100000,
    status,
    listing_source: listingSource,
    category_slug: 't-shirts',
    image_url: '/images/test.jpg',
    seller_name: 'Phase3 QA',
    condition: 'good',
    size: 'M',
    location: 'Thành phố Hồ Chí Minh',
    brand: 'Phase3 Brand',
  }).select('*').single();
  if (error) throw error;

  const uploadedPaths = [];
  const imageRows = [];
  for (let i = 0; i < count; i++) {
    const objectPath = `products/${sellerId}/${product.id}/${i}-${crypto.randomUUID()}.png`;
    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(objectPath, TINY_PNG, { contentType: 'image/png', upsert: false });
    if (upErr) throw upErr;
    uploadedPaths.push(objectPath);
    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
    imageRows.push({ product_id: product.id, url: pub.publicUrl, alt_text: 'test', sort_order: i, is_primary: i === 0 });
  }
  if (extraImageUrl) {
    imageRows.push({ product_id: product.id, url: extraImageUrl, alt_text: 'external', sort_order: count, is_primary: false });
  }
  if (imageRows.length) {
    const { error: imgErr } = await supabaseAdmin.from('product_images').insert(imageRows);
    if (imgErr) throw imgErr;
  }

  return { productId: product.id, uploadedPaths };
}

async function storageObjectExists(path) {
  const dir = path.split('/').slice(0, -1).join('/');
  const fileName = path.split('/').pop();
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(dir, { search: fileName });
  if (error) return false;
  return (data || []).some((f) => f.name === fileName);
}

async function getImageUrls(productId) {
  const { data } = await supabaseAdmin.from('product_images').select('url').eq('product_id', productId);
  return (data || []).map((r) => r.url);
}

(async () => {
  const sellerA = await createUser('seller-a');
  const sellerB = await createUser('seller-b');
  const cleanupProductIds = [];
  const cleanupUserIds = [sellerA, sellerB];
  const cleanupStoragePaths = [];

  try {
    // ---- 1/9/17. Seller can duplicate own eligible listing; new id; draft status; new slug ----
    const original = await createDraftListingWithImages(sellerA, { count: 2 });
    cleanupProductIds.push(original.productId);
    cleanupStoragePaths.push(...original.uploadedPaths);

    const { data: originalRow } = await supabaseAdmin.from('products').select('*').eq('id', original.productId).single();
    const duplicate = await sellerListingService.duplicateListing(sellerA, original.productId);
    cleanupProductIds.push(duplicate.id);

    check('1. Seller can duplicate own eligible listing', Boolean(duplicate?.id));
    check('4. Duplicate has a new product ID', duplicate.id !== original.productId);
    check('5. Duplicate begins in safe status (draft)', duplicate.status === 'draft');
    check('17. Duplicate has a different slug (uniqueness)', duplicate.slug !== originalRow.slug && Boolean(duplicate.slug));

    // ---- 6. Duplicate images are not vulnerable to shared-file deletion ----
    const originalUrlsBefore = await getImageUrls(original.productId);
    const duplicateUrls = await getImageUrls(duplicate.id);
    const noOverlap = duplicateUrls.every((u) => !originalUrlsBefore.includes(u));
    check('6. Duplicate images use independent Storage objects (no shared URL with the original)', noOverlap && duplicateUrls.length === originalUrlsBefore.length);
    cleanupStoragePaths.push(...duplicate.images.map((img) => `products/${sellerA}/${duplicate.id}/${img.url.split('/').pop()}`).map(() => null).filter(Boolean));
    // Track duplicate's own storage paths for cleanup via its known URLs:
    for (const img of duplicate.images) {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = img.url.indexOf(marker);
      if (idx !== -1) cleanupStoragePaths.push(img.url.slice(idx + marker.length));
    }

    // ---- 7. Deleting duplicate does not break original images ----
    await sellerListingService.deleteDraftListing(sellerA, duplicate.id);
    cleanupProductIds.splice(cleanupProductIds.indexOf(duplicate.id), 1); // already deleted
    const originalStillIntact = await Promise.all(originalUrlsBefore.map(async (url) => {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = url.indexOf(marker);
      if (idx === -1) return true;
      return storageObjectExists(url.slice(idx + marker.length));
    }));
    check('7. Deleting the duplicate does not remove the original\'s Storage files', originalStillIntact.every(Boolean));

    // ---- 8. Deleting the original draft does not break a (still-live) duplicate ----
    const duplicate2 = await sellerListingService.duplicateListing(sellerA, original.productId);
    cleanupProductIds.push(duplicate2.id);
    for (const img of duplicate2.images) {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = img.url.indexOf(marker);
      if (idx !== -1) cleanupStoragePaths.push(img.url.slice(idx + marker.length));
    }
    await sellerListingService.deleteDraftListing(sellerA, original.productId);
    cleanupProductIds.splice(cleanupProductIds.indexOf(original.productId), 1); // already deleted
    const duplicate2StillIntact = await Promise.all(duplicate2.images.map(async (img) => {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = img.url.indexOf(marker);
      if (idx === -1) return true;
      return storageObjectExists(img.url.slice(idx + marker.length));
    }));
    check("8. Deleting the original draft does not remove a duplicate's Storage files", duplicate2StillIntact.every(Boolean));
    await sellerListingService.deleteDraftListing(sellerA, duplicate2.id);
    cleanupProductIds.splice(cleanupProductIds.indexOf(duplicate2.id), 1);

    // ---- 2. Seller cannot duplicate another seller's listing ----
    const otherListing = await createDraftListingWithImages(sellerB, { count: 1 });
    cleanupProductIds.push(otherListing.productId);
    cleanupStoragePaths.push(...otherListing.uploadedPaths);
    const crossDup = await expectError(() => sellerListingService.duplicateListing(sellerA, otherListing.productId));
    check('2. Seller A cannot duplicate Seller B\'s listing (404)', crossDup.threw && crossDup.err.status === 404);
    const crossDel = await expectError(() => sellerListingService.deleteDraftListing(sellerA, otherListing.productId));
    check('Seller A cannot delete Seller B\'s draft (404)', crossDel.threw && crossDel.err.status === 404);
    check('15. Cross-seller Storage path is never touched (listing still eligible/unchanged)', await storageObjectExists(otherListing.uploadedPaths[0]));

    // ---- 3. Seed listing is excluded unless explicitly allowed ----
    const seedListing = await createDraftListingWithImages(sellerA, { count: 0, listingSource: 'seed' });
    cleanupProductIds.push(seedListing.productId);
    const seedDup = await expectError(() => sellerListingService.duplicateListing(sellerA, seedListing.productId));
    check('3. A seed-sourced row is excluded from duplicate (404, even with a matching seller_id)', seedDup.threw && seedDup.err.status === 404);

    // ---- 9. Active listing cannot be draft-deleted ----
    const activeListing = await createDraftListingWithImages(sellerA, { count: 1, status: 'active' });
    cleanupProductIds.push(activeListing.productId);
    cleanupStoragePaths.push(...activeListing.uploadedPaths);
    const activeDel = await expectError(() => sellerListingService.deleteDraftListing(sellerA, activeListing.productId));
    check('9. Active listing cannot be draft-deleted (409)', activeDel.threw && activeDel.err.status === 409);
    check('10. Database deletion failure means Storage was never touched (active listing files intact)', await storageObjectExists(activeListing.uploadedPaths[0]));

    // ---- 12. External URL is not treated as owned Storage ----
    const externalUrl = 'https://cdn.example-external.invalid/not-ours.jpg';
    const withExternal = await createDraftListingWithImages(sellerA, { count: 1, extraImageUrl: externalUrl });
    cleanupProductIds.push(withExternal.productId);
    cleanupStoragePaths.push(...withExternal.uploadedPaths);
    const dupWithExternal = await sellerListingService.duplicateListing(sellerA, withExternal.productId);
    cleanupProductIds.push(dupWithExternal.id);
    for (const img of dupWithExternal.images) {
      if (img.url === externalUrl) continue;
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = img.url.indexOf(marker);
      if (idx !== -1) cleanupStoragePaths.push(img.url.slice(idx + marker.length));
    }
    const externalPreserved = dupWithExternal.images.some((img) => img.url === externalUrl);
    check('12. External (non-owned) image URL is copied by reference, not treated as owned Storage', externalPreserved);

    // ---- 13/16. Missing source file -> partial copy failure is compensated, no half-created duplicate ----
    const missingFileListing = await createDraftListingWithImages(sellerA, { count: 1 });
    cleanupProductIds.push(missingFileListing.productId);
    // Delete the underlying Storage object directly so the DB record now
    // points at a file that no longer exists — simulates a missing source file.
    await supabaseAdmin.storage.from(BUCKET).remove(missingFileListing.uploadedPaths);
    const { count: productCountBefore } = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', sellerA);
    const missingFileDup = await expectError(() => sellerListingService.duplicateListing(sellerA, missingFileListing.productId));
    const { count: productCountAfter } = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', sellerA);
    check('16. Missing source Storage file is handled safely (copy fails cleanly, no crash)', missingFileDup.threw);
    check('13. Partial copy failure is compensated — no half-created duplicate row lingers', productCountBefore === productCountAfter);

    // ---- 11. Storage cleanup failure (already-missing file) does not corrupt DB state ----
    const alreadyMissingDraft = await createDraftListingWithImages(sellerA, { count: 1 });
    cleanupProductIds.push(alreadyMissingDraft.productId);
    await supabaseAdmin.storage.from(BUCKET).remove(alreadyMissingDraft.uploadedPaths); // pre-remove the file
    const deleteWithMissingStorage = await expectError(() => sellerListingService.deleteDraftListing(sellerA, alreadyMissingDraft.productId));
    check('11. Deleting a draft whose Storage file is already gone still succeeds (best-effort cleanup, DB is authoritative)', !deleteWithMissingStorage.threw);
    const { data: goneRow } = await supabaseAdmin.from('products').select('id').eq('id', alreadyMissingDraft.productId).maybeSingle();
    check('11b. The listing is actually gone from the database after that delete', !goneRow);
    cleanupProductIds.splice(cleanupProductIds.indexOf(alreadyMissingDraft.productId), 1);

    // ---- 14. Ownership is checked before Storage mutation (re-affirm via cross-seller attempt above + arity) ----
    check('14. duplicateListing/deleteDraftListing take a trusted (userId, id) pair only — no extra override params', sellerListingService.duplicateListing.length === 2 && sellerListingService.deleteDraftListing.length === 2);
  } finally {
    try {
      if (cleanupStoragePaths.length) {
        await supabaseAdmin.storage.from(BUCKET).remove([...new Set(cleanupStoragePaths)]);
      }
    } catch (cleanupErr) { console.error('cleanup: storage remove failed', cleanupErr); }
    try {
      if (cleanupProductIds.length) {
        await supabaseAdmin.from('products').delete().in('id', cleanupProductIds);
      }
    } catch (cleanupErr) { console.error('cleanup: product delete failed', cleanupErr); }
    try {
      await supabaseAdmin.from('users').delete().in('id', cleanupUserIds);
    } catch (cleanupErr) { console.error('cleanup: user delete failed', cleanupErr); }
  }

  console.log(`\nPHASE3 LISTING INTEGRITY TEST SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
  if (checks.some((v) => !v)) process.exitCode = 1;
})().catch((err) => {
  console.error('PHASE3 LISTING INTEGRITY TEST ERROR:', err);
  process.exitCode = 1;
});
