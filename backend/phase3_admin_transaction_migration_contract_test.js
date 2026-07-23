const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260726000000_admin_transaction_management.sql');
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8').toLowerCase() : '';

const requirements = [
  ['Additive Phase 3 migration exists', Boolean(sql)],
  ['Order status constraint supports the application completed state', /orders_status_check[\s\S]*'completed'/.test(sql)],
  ['Append-only admin transaction audit ledger exists', /create table if not exists public\.admin_transaction_events/.test(sql)],
  ['Atomic admin transition RPC exists', /create or replace function public\.stylehub_admin_transition_transaction/.test(sql)],
  ['RPC is security definer', /stylehub_admin_transition_transaction[\s\S]*security definer/.test(sql)],
  ['RPC verifies the actor role from users', /from public\.users[\s\S]*role\s*=\s*'admin'/.test(sql)],
  ['Order stale-update guard is present', /p_expected_order_updated_at/.test(sql)],
  ['Payment version stale-update guard is present', /p_expected_payment_version/.test(sql)],
  ['Idempotency guard is present', /p_idempotency_key/.test(sql) && /unique\s*\(order_id, idempotency_key\)/.test(sql)],
  ['Release transition updates allocations atomically', /payment_allocations[\s\S]*state\s*=\s*'released'/.test(sql)],
  ['Release is recorded in the existing payment event ledger', /insert into public\.payment_events[\s\S]*payment_released/.test(sql)],
  ['Admin audit records actor, reason and previous/new state', /actor_id[\s\S]*reason[\s\S]*previous_order_status[\s\S]*new_order_status/.test(sql)],
  ['Public and client roles cannot execute the RPC', /revoke all on function public\.stylehub_admin_transition_transaction[\s\S]*from public, anon, authenticated/.test(sql)],
];

let passed = 0;
for (const [name, condition] of requirements) {
  if (condition) passed += 1;
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}`);
}
console.log(`\nPHASE 3 MIGRATION CONTRACT SUMMARY: ${passed}/${requirements.length} passed`);
if (passed !== requirements.length) process.exitCode = 1;
