const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' }); // Load root .env if running backend independently, or just rely on server.js dotenv config

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  isConfigured = true;
} else {
  console.warn('⚠️ Supabase credentials missing. API will return 503 for database-dependent routes.');
}

const isSupabaseConfigured = () => isConfigured;

module.exports = {
  supabase,
  isSupabaseConfigured
};
