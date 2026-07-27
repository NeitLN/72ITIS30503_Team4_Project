/**
 * Phase 22 — bank transfer instruction generation unit suite.
 * Pure functions only; no network or database access.
 */
const assert = require('node:assert/strict');

const checks = [];
function test(name, fn) {
  try {
    fn();
    checks.push(true);
    console.log(`[PASS] ${name}`);
  } catch (error) {
    checks.push(false);
    console.error(`[FAIL] ${name} — ${error.message}`);
  }
}

process.env.STYLEHUB_BANK_NAME = 'Test Bank';
process.env.STYLEHUB_BANK_ACCOUNT_NAME = 'STYLEHUB TEST';
process.env.STYLEHUB_BANK_ACCOUNT_NUMBER = '0000000001';
process.env.STYLEHUB_BANK_TRANSFER_TTL_MINUTES = '30';

const bankTransferService = require('./services/bankTransferService');

test('transfer content is derived from order code, not user input', () => {
  const content = bankTransferService.buildTransferContent('SH202607098TN7GI');
  assert.equal(content, 'STYLEHUB 098TN7GI');
});

test('transfer content strips non-alphanumeric characters safely', () => {
  const content = bankTransferService.buildTransferContent('SH-2026-07-09/8TN7GI');
  assert.equal(content, 'STYLEHUB 098TN7GI');
});

test('two different orders never produce the same transfer content', () => {
  const a = bankTransferService.buildTransferContent('SH202607098TN7GI');
  const b = bankTransferService.buildTransferContent('SH20260709AAQJKH');
  assert.notEqual(a, b);
});

test('buildInstructions uses the backend-calculated order amount, not a client value', () => {
  const instructions = bankTransferService.buildInstructions({
    order_code: 'SH202607098TN7GI',
    total_amount: 250000,
    created_at: new Date().toISOString(),
  });
  assert.equal(instructions.amount, 250000);
  assert.equal(instructions.currency, 'VND');
});

test('buildInstructions returns null when bank config is not set', () => {
  const original = { ...process.env };
  delete process.env.STYLEHUB_BANK_NAME;
  delete require.cache[require.resolve('./services/bankTransferService')];
  const freshService = require('./services/bankTransferService');
  const instructions = freshService.buildInstructions({ order_code: 'SH1', total_amount: 1000, created_at: new Date().toISOString() });
  assert.equal(instructions, null);
  process.env.STYLEHUB_BANK_NAME = original.STYLEHUB_BANK_NAME;
  delete require.cache[require.resolve('./services/bankTransferService')];
});

test('an expired instruction is marked expired', () => {
  const oldCreatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago, TTL is 30min
  const instructions = bankTransferService.buildInstructions({
    order_code: 'SH202607098TN7GI',
    total_amount: 100000,
    created_at: oldCreatedAt,
  });
  assert.equal(instructions.isExpired, true);
});

test('a fresh instruction is not expired', () => {
  const instructions = bankTransferService.buildInstructions({
    order_code: 'SH202607098TN7GI',
    total_amount: 100000,
    created_at: new Date().toISOString(),
  });
  assert.equal(instructions.isExpired, false);
});

const passed = checks.filter(Boolean).length;
console.log(`\nPHASE 22 BANK TRANSFER UNIT SUMMARY: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exitCode = 1;
