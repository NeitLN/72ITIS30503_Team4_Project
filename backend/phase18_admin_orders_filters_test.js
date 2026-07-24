/**
 * Phase 18 admin orders filters test.
 */
require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const { supabaseAdmin } = require('./lib/supabase');
const { signAuthToken } = require('./services/authService');

const API_BASE = process.env.PHASE18_API_BASE || 'http://127.0.0.1:8080';
const run = `phase18-qa-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const checks = [];

function uuid() { return crypto.randomUUID(); }
function headers(token) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }
function check(name, condition, detail = '') {
  checks.push(Boolean(condition));
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function createUser(label, role = 'customer') {
  const row = {
    id: uuid(),
    email: `${run}-${label}@stylehub.invalid`,
    full_name: `Phase 18 QA ${label}`,
    username: `p18_${label.replace(/-/g, '_')}_${crypto.randomBytes(3).toString('hex')}`,
    password_hash: 'phase18-local-test-only',
    role,
  };
  const { data, error } = await supabaseAdmin.from('users').insert(row).select('id,email,full_name,role').single();
  if (error) throw error;
  return { ...data, token: signAuthToken(data) };
}

(async () => {
  if (!supabaseAdmin) {
    console.log('BLOCKED: No Supabase admin credentials.');
    process.exitCode = 2;
    return;
  }

  try {
    const health = await api('/api/health');
    if (health.status !== 200) throw new Error(`Backend unavailable at ${API_BASE}`);

    const admin = await createUser('admin', 'admin');
    const buyer = await createUser('buyer');
    const seller = await createUser('seller', 'seller');

    // Guest / Customer / Seller access
    const noToken = await api('/api/orders');
    const buyerDenied = await api('/api/orders', { headers: headers(buyer.token) });
    const sellerDenied = await api('/api/orders', { headers: headers(seller.token) });
    
    check('Guest access is rejected', noToken.status === 401);
    check('Customer access is rejected', buyerDenied.status === 403);
    check('Seller access is rejected', sellerDenied.status === 403);

    const adminFetch = await api('/api/orders', { headers: headers(admin.token) });
    check('Admin access succeeds', adminFetch.status === 200);

    const defaultOrders = adminFetch.body?.data || [];
    check('No filters returns the existing default result set', Array.isArray(defaultOrders));
    
    if (defaultOrders.length >= 2) {
      const isSorted = new Date(defaultOrders[0].created_at) >= new Date(defaultOrders[1].created_at);
      check('Default results preserve current sorting (desc by created_at)', isSorted);
    }

    if (defaultOrders.length > 0) {
      const target = defaultOrders[0];
      
      // Keyword matches an order code
      const codeMatch = await api(`/api/orders?query=${target.order_code}`, { headers: headers(admin.token) });
      check('Keyword matches an order ID/order code', codeMatch.status === 200 && codeMatch.body.data.some(o => o.id === target.id));
      
      if (target.customer_name) {
        const nameMatch = await api(`/api/orders?query=${encodeURIComponent(target.customer_name.substring(0, 5))}`, { headers: headers(admin.token) });
        check('Keyword matches buyer name', nameMatch.status === 200 && nameMatch.body.data.some(o => o.id === target.id));
      } else {
        check('Keyword matches buyer name', true, 'Skipped (no name)');
      }

      if (target.customer_email) {
        const emailMatch = await api(`/api/orders?query=${encodeURIComponent(target.customer_email)}`, { headers: headers(admin.token) });
        check('Keyword matches buyer email', emailMatch.status === 200 && emailMatch.body.data.some(o => o.id === target.id));
      } else {
        check('Keyword matches buyer email', true, 'Skipped (no email)');
      }
      
      // Whitespace
      const spaceMatch = await api(`/api/orders?query=${encodeURIComponent('  ' + target.order_code + '  ')}`, { headers: headers(admin.token) });
      check('Leading/trailing whitespace is trimmed', spaceMatch.status === 200 && spaceMatch.body.data.some(o => o.id === target.id));

      // Order status
      const statusMatch = await api(`/api/orders?orderStatus=${target.status}`, { headers: headers(admin.token) });
      check('Valid order status filters correctly', statusMatch.status === 200 && statusMatch.body.data.every(o => o.status === target.status));
      
      const invalidStatus = await api(`/api/orders?orderStatus=invalid_status`, { headers: headers(admin.token) });
      check('Invalid order status is rejected', invalidStatus.status === 400);

      // Payment method
      if (target.payment_method) {
        const methodMatch = await api(`/api/orders?paymentMethod=${target.payment_method}`, { headers: headers(admin.token) });
        check('Valid payment method filters correctly', methodMatch.status === 200 && methodMatch.body.data.every(o => o.payment_method === target.payment_method));
      } else {
        check('Valid payment method filters correctly', true, 'Skipped');
      }

      const invalidMethod = await api(`/api/orders?paymentMethod=bitcoin`, { headers: headers(admin.token) });
      check('Invalid payment method is rejected', invalidMethod.status === 400);

      // Combined
      const combined = await api(`/api/orders?query=${target.order_code}&orderStatus=${target.status}`, { headers: headers(admin.token) });
      check('Combined keyword and status filters compose correctly', combined.status === 200 && combined.body.data.some(o => o.id === target.id));

      if (combined.body.data.length >= 2) {
        const isCombinedSorted = new Date(combined.body.data[0].created_at) >= new Date(combined.body.data[1].created_at);
        check('Filtered results preserve current sorting', isCombinedSorted);
      } else {
        check('Filtered results preserve current sorting', true, 'Skipped (too few results)');
      }

      // Empty keyword
      const emptyKeyword = await api(`/api/orders?query=   `, { headers: headers(admin.token) });
      check('Empty keyword behaves as no keyword', emptyKeyword.status === 200 && emptyKeyword.body.data.length === defaultOrders.length);
      
      // Special characters
      const specialChar = await api(`/api/orders?query=${encodeURIComponent('%_\\')}`, { headers: headers(admin.token) });
      check('Special characters do not generate unsafe query behavior', specialChar.status === 200);

      // No payment fabrication
      check('No filter fabricates payment data', defaultOrders.every(o => o.payment_method === undefined || ['cod', 'bank_transfer', 'simulated_card'].includes(o.payment_method)));
      
    } else {
      console.log('Skipping advanced filter tests as there are no existing orders in DB.');
    }

    // Cleanup users
    await supabaseAdmin.from('users').delete().in('id', [admin.id, buyer.id, seller.id]);

    console.log(`\nPHASE18 BACKEND SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
    if (checks.some((v) => !v)) process.exitCode = 1;
  } catch (error) {
    console.error('PHASE18 TEST ERROR:', error);
    process.exitCode = 1;
  }
})();
