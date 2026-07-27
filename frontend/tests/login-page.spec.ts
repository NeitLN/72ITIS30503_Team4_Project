import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.STYLEHUB_QA_BASE_URL || 'http://localhost:3000';
const EVIDENCE_DIR = path.join(__dirname, '..', '..', 'evidence', 'login-redesign');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

test.describe('Login page', () => {
  test('no demo credentials rendered, heading and form present', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('TÀI KHOẢN DEMO');
    expect(bodyText).not.toContain('Tài khoản demo');
    expect(bodyText).not.toContain('customer123');
    expect(bodyText).not.toContain('admin123');
    expect(bodyText).not.toContain('customer@stylehub.vn');

    const html = await page.content();
    expect(html).not.toContain('customer123');
    expect(html).not.toContain('admin123');

    await expect(page.getByRole('heading', { name: /Chào mừng/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Đăng nhập/ })).toBeVisible();
  });

  test('desktop and mobile: heading readable, no overflow', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE_URL}/login`);
      await expect(page.getByRole('heading', { name: /Chào mừng/i })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow, `horizontal overflow at ${viewport.width}x${viewport.height}`).toBe(false);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `login_${viewport.width}x${viewport.height}.png`) });
    }
  });

  test('exactly one h1 on the page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
