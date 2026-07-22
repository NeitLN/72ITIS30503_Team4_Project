const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260725000000_simulated_payment_escrow.sql');
assert.ok(fs.existsSync(migrationPath), 'Phase 2 forward migration must exist.');

const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase();
for (const required of [
  'create table if not exists public.payment_allocations',
  'create table if not exists public.payment_events',
  'create unique index if not exists payments_one_per_order_idx',
  'unique (payment_id, seller_id)',
  'stylehub_checkout_atomic_v2',
  'stylehub_cancel_order',
  'platform_fee_total',
  'seller_amount_total',
  "'held'",
  "'refunded'",
  'payment_events_append_only',
]) assert.ok(sql.includes(required), `Migration is missing required contract: ${required}`);

assert.match(sql, /gross_amount\s*=\s*platform_fee_total\s*\+\s*seller_amount_total/);
assert.match(sql, /unique\s*\(payment_id,\s*idempotency_key\)/);
assert.match(sql, /row_number\(\) over[\s\S]*seller_id/);
assert.match(sql, /oi\.line_total\s*<>\s*trunc\(oi\.line_total\)/);
assert.match(sql, /jsonb_object_keys\(p_payment_details\)\s+as\s+payment_key\(key_name\)/);
assert.match(sql, /set\s+response_payload\s*=\s*v_result/);
assert.match(sql, /v_gross\s*:=\s*\(v_result\s*->>\s*'totalamount'\)::numeric::bigint/);
assert.match(sql, /alter table public\.payments enable row level security/);
assert.match(sql, /revoke all on table public\.payments from public, anon, authenticated/);
assert.match(sql, /grant select on table public\.payments to authenticated/);
assert.match(sql, /revoke all on table public\.payments from service_role/);
assert.match(sql, /revoke all on table public\.payment_allocations from service_role/);
assert.match(sql, /revoke all on table public\.payment_events from service_role/);
assert.match(sql, /grant select, insert, update, delete on table public\.payments to service_role/);
assert.doesNotMatch(sql, /stylehub\.allow_payment_fixture_cleanup/);
assert.doesNotMatch(sql, /stylehub_cleanup_phase2_payment_fixtures/);
const executableSql = sql.replace(/^\s*--.*$/gm, '');
assert.doesNotMatch(executableSql, /double precision|\breal\b/);

console.log('[PASS] Phase 2 migration contains the payment, allocation, event, atomic-checkout, and cancellation contracts.');
