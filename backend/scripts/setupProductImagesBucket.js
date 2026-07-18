/**
 * Phase 7 — one-off setup script: creates the `product-images` Supabase
 * Storage bucket used for real /sell listing uploads, if it doesn't already
 * exist. Public read (so ProductCard/Product Detail can render stable public
 * URLs, matching how the static catalog images already work); write access
 * is restricted to the service-role key, which never leaves the backend.
 *
 * Safe to re-run: no-ops if the bucket already exists.
 * Usage: node scripts/setupProductImagesBucket.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in backend/.env');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BUCKET = 'product-images';

async function run() {
  const { data: buckets, error: listErr } = await sb.storage.listBuckets();
  if (listErr) throw new Error('listBuckets: ' + listErr.message);

  const exists = (buckets || []).some((b) => b.name === BUCKET);
  if (exists) {
    console.log(`Bucket "${BUCKET}" already exists. No changes made.`);
  } else {
    const { error: createErr } = await sb.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5 MB, matches backend upload validation
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (createErr) throw new Error('createBucket: ' + createErr.message);
    console.log(`Created bucket "${BUCKET}" (public read, 5MB/file limit, jpeg/png/webp only).`);
  }

  console.log('\nWrite access: only the backend service-role key ever writes to this bucket.');
  console.log('The service-role key bypasses Storage RLS by design and is never sent to the frontend.');
  console.log('No anon/public INSERT policy is created — anonymous clients cannot upload or overwrite objects.');
}

run().catch((err) => { console.error('SETUP FAILED:', err.message); process.exit(1); });
