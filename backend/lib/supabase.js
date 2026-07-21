const path = require('path');
const { createClient } = require('@supabase/supabase-js');
// Redundant with server.js's own load, but keeps this module correct when
// required directly by a standalone script (seeders, tests) that never goes
// through server.js. dotenv never overrides an already-set var, so this is
// a safe no-op when server.js already loaded the environment.
require('dotenv').config({ path: [path.join(__dirname, '../.env'), path.join(__dirname, '../../.env')], quiet: true });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  isConfigured = true;
} else {
  console.warn('⚠️ Supabase credentials missing. API will return 503 for database-dependent routes.');
}

// Service-role client — bypasses RLS. Used ONLY by trusted, already-authenticated
// server-side write paths (e.g. Phase 7 listing creation, Storage uploads).
// Never expose this client or its key to the frontend.
let supabaseAdmin = null;
let isAdminConfigured = false;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  isAdminConfigured = true;
}

const isSupabaseConfigured = () => isConfigured;
const isSupabaseAdminConfigured = () => isAdminConfigured;

module.exports = {
  supabase,
  isSupabaseConfigured,
  supabaseAdmin,
  isSupabaseAdminConfigured
};
