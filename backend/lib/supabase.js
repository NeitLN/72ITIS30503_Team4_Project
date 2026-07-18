const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' }); // Load root .env if running backend independently, or just rely on server.js dotenv config

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
