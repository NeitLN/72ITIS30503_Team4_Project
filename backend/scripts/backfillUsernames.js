/**
 * Phase 8 — one-off backfill: assigns a stable, safe, non-sensitive username
 * to every existing user row that doesn't already have one. Never derives a
 * username from email. Never overwrites an existing non-empty username.
 *
 * Usage: node scripts/backfillUsernames.js --dry-run | --apply
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { RESERVED_USERNAMES, normalizeUsername, isValidUsernameFormat } = require('../services/profileService');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const MODE = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--dry-run') ? 'dry-run' : null;
if (!MODE) {
  console.error('Usage: node scripts/backfillUsernames.js --dry-run | --apply');
  process.exit(1);
}

function slugBase(name) {
  const slug = normalizeUsername(name).slice(0, 24);
  return slug.length >= 3 ? slug : `user-${slug}`;
}

async function run() {
  const { data: users, error } = await sb.from('users').select('id,full_name,name,username').order('created_at', { ascending: true });
  if (error) throw error;

  const taken = new Set(users.filter((u) => u.username).map((u) => u.username));
  const missing = users.filter((u) => !u.username);
  console.log(`Total users: ${users.length}. Missing usernames: ${missing.length}.`);

  const assignments = [];
  for (const u of missing) {
    let base = slugBase(u.full_name || u.name || 'user');
    if (!isValidUsernameFormat(base) || RESERVED_USERNAMES.has(base)) base = `user-${base}`.slice(0, 30);
    let candidate = base;
    let n = 2;
    while (taken.has(candidate) || RESERVED_USERNAMES.has(candidate) || !isValidUsernameFormat(candidate)) {
      candidate = `${base}-${n}`.slice(0, 30);
      n++;
    }
    taken.add(candidate);
    assignments.push({ id: u.id, name: u.full_name || u.name, username: candidate });
  }

  console.log('\nPlanned assignments:');
  assignments.forEach((a) => console.log(`  ${a.name} -> ${a.username}`));

  if (MODE === 'dry-run') {
    console.log('\nDRY RUN — no writes performed.');
    return;
  }

  for (const a of assignments) {
    const { error: upErr } = await sb.from('users').update({ username: a.username, updated_at: new Date().toISOString() }).eq('id', a.id);
    if (upErr) throw new Error(`Failed to assign username to ${a.id}: ${upErr.message}`);
  }
  console.log(`\nAssigned ${assignments.length} username(s).`);
}

run().catch((err) => { console.error('BACKFILL FAILED:', err.message); process.exit(1); });
