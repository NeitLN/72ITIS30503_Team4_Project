import { test, expect, Page, BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.STYLEHUB_QA_BASE_URL || 'http://localhost:3000';

const CREDS = {
  seller: {
    email: process.env.STYLEHUB_QA_SELLER_EMAIL,
    password: process.env.STYLEHUB_QA_SELLER_PASSWORD,
  },
  customer: {
    email: process.env.STYLEHUB_QA_CUSTOMER_EMAIL,
    password: process.env.STYLEHUB_QA_CUSTOMER_PASSWORD,
  },
  admin: {
    email: process.env.STYLEHUB_QA_ADMIN_EMAIL,
    password: process.env.STYLEHUB_QA_ADMIN_PASSWORD,
  },
};

for (const role of ['seller', 'customer', 'admin'] as const) {
  if (!CREDS[role].email || !CREDS[role].password) {
    throw new Error(`Missing env credentials for role "${role}" — set STYLEHUB_QA_${role.toUpperCase()}_EMAIL / _PASSWORD before running.`);
  }
}

const EVIDENCE_DIR = path.join(__dirname, '..', '..', 'evidence', 'role-audit');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

async function loginAs(page: Page, role: keyof typeof CREDS) {
  const { email, password } = CREDS[role];
  await page.goto(`${BASE_URL}/login`);
  await page.locator('#email').fill(email!);
  await page.locator('#password').fill(password!);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

function attachConsoleTracking(page: Page, errors: string[], failedRequests: string[]) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`));
}

test.describe('Role audit — customer', () => {
  test('login, header nav, forbidden routes, forbidden API', async ({ browser }) => {
    const context: BrowserContext = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    attachConsoleTracking(page, consoleErrors, failedRequests);

    await loginAs(page, 'customer');
    await expect(page).toHaveURL(/\/profile/);

    // Header must show buyer nav, never seller/admin controls
    await expect(page.getByRole('link', { name: 'Hồ sơ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Đơn hàng' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kênh người bán' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /ĐĂNG BÁN|SELL/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Về trang quản trị' })).toHaveCount(0);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'customer_header.png') });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'customer_profile_desktop.png'), fullPage: true });

    // Direct unauthorized route: /sell
    const sellReqs: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/seller/')) sellReqs.push(r.url()); });
    await page.goto(`${BASE_URL}/sell`);
    await expect(page.getByText('Không có quyền truy cập')).toBeVisible();
    expect(sellReqs, `customer must not trigger seller API calls on /sell: ${sellReqs.join(', ')}`).toHaveLength(0);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'customer_seller_route_denied.png') });

    // Direct unauthorized route: /seller/dashboard
    await page.goto(`${BASE_URL}/seller/dashboard`);
    await expect(page.getByText('Không có quyền truy cập')).toBeVisible();

    // Direct unauthorized route: /admin
    const adminOverviewReqs: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/admin/')) adminOverviewReqs.push(r.url()); });
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.getByText('Quyền truy cập bị từ chối')).toBeVisible({ timeout: 8000 });
    expect(adminOverviewReqs, `customer must not trigger admin API calls on /admin: ${adminOverviewReqs.join(', ')}`).toHaveLength(0);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'customer_admin_route_denied.png') });

    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/profile`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'customer_profile_mobile.png'), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, 'customer profile mobile: horizontal overflow detected').toBe(false);

    // Direct API denial — using the browser's own authenticated session via fetch
    const apiChecks: Record<string, number> = {};
    for (const [name, url] of [
      ['seller listings', '/api/seller/listings'],
      ['seller orders', '/api/seller/orders'],
      ['seller finance', '/api/seller/finance/summary'],
    ] as const) {
      const status = await page.evaluate(async (u) => {
        const token = localStorage.getItem('stylehub:auth-token') || '';
        const res = await fetch(u, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        return res.status;
      }, `${BASE_URL.replace('3000', '8080')}${url}`);
      apiChecks[name] = status;
    }
    for (const [name, status] of Object.entries(apiChecks)) {
      expect(status, `customer direct API call to ${name} should be 403, got ${status}`).toBe(403);
    }

    console.log('Customer console errors:', consoleErrors.length, consoleErrors.slice(0, 5));
    console.log('Customer failed requests:', failedRequests.length, failedRequests.slice(0, 5));

    await context.close();
  });
});

test.describe('Role audit — seller', () => {
  test('login, header nav, dashboard, forbidden admin routes', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    attachConsoleTracking(page, consoleErrors, failedRequests);

    await loginAs(page, 'seller');
    await expect(page).toHaveURL(/\/profile/);

    await expect(page.getByRole('link', { name: 'Kênh người bán' })).toBeVisible();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'seller_header.png') });

    await page.goto(`${BASE_URL}/seller/dashboard`);
    await expect(page.getByText('Không có quyền truy cập')).toHaveCount(0);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'seller_dashboard_desktop.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'seller_dashboard_mobile.png'), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, 'seller dashboard mobile: horizontal overflow detected').toBe(false);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Seller must not access admin
    const adminReqs: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/admin/')) adminReqs.push(r.url()); });
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.getByText('Quyền truy cập bị từ chối')).toBeVisible({ timeout: 8000 });
    expect(adminReqs, `seller must not trigger admin API calls on /admin: ${adminReqs.join(', ')}`).toHaveLength(0);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'seller_admin_route_denied.png') });

    console.log('Seller console errors:', consoleErrors.length, consoleErrors.slice(0, 5));
    console.log('Seller failed requests:', failedRequests.length, failedRequests.slice(0, 5));

    await context.close();
  });
});

test.describe('Role audit — admin', () => {
  test('login, admin nav, dashboard, no seller/customer nav leakage', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    attachConsoleTracking(page, consoleErrors, failedRequests);

    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);

    await expect(page.getByRole('link', { name: 'Tổng quan' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quản lý giao dịch' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quản lý đơn hàng' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kênh người bán' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /ĐĂNG BÁN|SELL/i })).toHaveCount(0);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'admin_navigation.png') });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'admin_dashboard_desktop.png'), fullPage: true });

    await page.goto(`${BASE_URL}/admin/transactions`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'admin_transactions.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/admin`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'admin_dashboard_mobile.png'), fullPage: true });

    console.log('Admin console errors:', consoleErrors.length, consoleErrors.slice(0, 5));
    console.log('Admin failed requests:', failedRequests.length, failedRequests.slice(0, 5));

    await context.close();
  });
});
