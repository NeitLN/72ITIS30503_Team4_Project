const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// 1. Load local test credentials first (will not override process.env vars already set by OS/CI)
require('dotenv').config({
  path: path.join(__dirname, '.env.test.local'),
});

// 2. Load standard .env as fallback
require('dotenv').config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// These integration tests require the backend to be running with real
// database access. Role-based tests use credentials supplied through
// local environment variables.

async function loginAsRole(email, password) {
  if (!email || !password) {
    return null;
  }
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    return null;
  }
  const body = await res.json();
  if (body.success && body.data && body.data.token) {
    return body.data.token;
  }
  return null;
}

async function fetchOverview(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_URL}/api/admin/overview`, { headers });
  const body = await res.json();
  return { status: res.status, body };
}

test('Admin Overview Integration Test', async (t) => {
  await t.test('rejects unauthenticated request', async () => {
    const { status, body } = await fetchOverview(null);
    assert.equal(status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.message, 'Vui lòng đăng nhập để tiếp tục.');
  });

  await t.test('rejects customer request', async (ctx) => {
    const customerToken = await loginAsRole(process.env.PHASE17_CUSTOMER_EMAIL, process.env.PHASE17_CUSTOMER_PASSWORD);
    if (!customerToken) {
      ctx.skip('Missing local Phase 17 Customer test credentials');
      return;
    }
    const { status, body } = await fetchOverview(customerToken);
    assert.equal(status, 403);
    assert.equal(body.success, false);
    assert.equal(body.error.message, 'Yêu cầu quyền quản trị viên.');
  });

  await t.test('rejects seller request', async (ctx) => {
    const sellerToken = await loginAsRole(process.env.PHASE17_SELLER_EMAIL, process.env.PHASE17_SELLER_PASSWORD);
    if (!sellerToken) {
      ctx.skip('Missing local Phase 17 Seller test credentials');
      return;
    }
    const { status, body } = await fetchOverview(sellerToken);
    assert.equal(status, 403);
    assert.equal(body.success, false);
    assert.equal(body.error.message, 'Yêu cầu quyền quản trị viên.');
  });

  await t.test('accepts admin request and returns valid data shape', async (ctx) => {
    const adminToken = await loginAsRole(process.env.PHASE17_ADMIN_EMAIL, process.env.PHASE17_ADMIN_PASSWORD);
    if (!adminToken) {
      ctx.skip('Missing local Phase 17 Admin test credentials');
      return;
    }
    const { status, body } = await fetchOverview(adminToken);
    assert.equal(status, 200, 'Expected 200 OK from overview API');
    assert.equal(body.success, true);

    const data = body.data;
    assert.ok(data.generatedAt);
    assert.ok(typeof data.metrics.totalUsers === 'number');
    assert.ok(typeof data.metrics.activeSellers === 'number');
    assert.ok(typeof data.metrics.activeProducts === 'number');
    assert.ok(typeof data.metrics.totalOrders === 'number');
    assert.ok(typeof data.metrics.totalTransactions === 'number');
    assert.ok(typeof data.metrics.transactionValue === 'number');

    assert.ok(typeof data.attention.pendingTransactions === 'number');
    assert.ok(Array.isArray(data.recentOrders));
    assert.ok(data.recentOrders.length <= 5);

    if (data.recentOrders.length > 0) {
      assert.ok(data.recentOrders[0].order_code);
      assert.ok(data.recentOrders[0].status);
    }

    assert.ok(Array.isArray(data.recentTransactions));
    assert.ok(data.recentTransactions.length <= 5);
  });
});
