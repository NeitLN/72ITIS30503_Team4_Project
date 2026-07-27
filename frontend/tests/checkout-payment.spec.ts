import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.STYLEHUB_QA_BASE_URL || 'http://localhost:3000';
const CUSTOMER_EMAIL = process.env.STYLEHUB_QA_CUSTOMER_EMAIL;
const CUSTOMER_PASSWORD = process.env.STYLEHUB_QA_CUSTOMER_PASSWORD;
const PRODUCT_ID = process.env.STYLEHUB_QA_PRODUCT_ID;
const PRODUCT_SLUG = process.env.STYLEHUB_QA_PRODUCT_SLUG;

if (!CUSTOMER_EMAIL || !CUSTOMER_PASSWORD || !PRODUCT_ID || !PRODUCT_SLUG) {
  throw new Error('Missing STYLEHUB_QA_CUSTOMER_EMAIL / _PASSWORD / STYLEHUB_QA_PRODUCT_ID / STYLEHUB_QA_PRODUCT_SLUG env vars.');
}

const EVIDENCE_DIR = path.join(__dirname, '..', '..', 'evidence', 'checkout-payment');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

async function loginAndSeedCart(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('#email').fill(CUSTOMER_EMAIL!);
  await page.locator('#password').fill(CUSTOMER_PASSWORD!);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });

  await page.evaluate(([productId, slug]) => {
    const cart = [{
      id: productId,
      productId,
      variantId: null,
      name: 'QA Checkout Item',
      price: 210000,
      salePrice: null,
      imageUrl: null,
      size: 'L',
      condition: 'like_new',
      brandName: null,
      sellerHandle: 'qa-seller',
      quantity: 1,
      slug,
    }];
    localStorage.setItem('stylehub_cart', JSON.stringify(cart));
  }, [PRODUCT_ID!, PRODUCT_SLUG!]);
}

test.describe('Checkout payment redesign', () => {
  test('no crude labels, professional payment cards, sandbox notice', async ({ page }) => {
    await loginAndSeedCart(page);
    await page.goto(`${BASE_URL}/checkout`);
    await expect(page.getByText('Tổng quan mua sắm').or(page.getByText('Thông tin giao hàng'))).toBeVisible({ timeout: 10000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Simulated Card');
    expect(bodyText).not.toContain('Demo Card');
    expect(bodyText).not.toContain('Fake Payment');
    expect(bodyText).not.toContain('Test Payment');

    await expect(page.getByText('Thanh toán khi nhận hàng', { exact: true })).toBeVisible();
    await expect(page.getByText('Chuyển khoản ngân hàng', { exact: true })).toBeVisible();
    await expect(page.getByText('Thẻ ngân hàng / Thanh toán trực tuyến', { exact: true })).toBeVisible();
    await expect(page.getByText('Phổ biến', { exact: true })).toBeVisible();
    await expect(page.getByText('Bảo mật bởi đối tác thanh toán', { exact: true })).toBeVisible();

    await page.getByText('Thẻ ngân hàng / Thanh toán trực tuyến', { exact: true }).click();
    await expect(page.getByText(/Môi trường thử nghiệm/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Tiếp tục thanh toán/i })).toBeVisible();

    await page.getByText('Chuyển khoản ngân hàng', { exact: true }).click();
    await expect(page.getByRole('button', { name: /Tạo đơn & nhận mã chuyển khoản/i })).toBeVisible();

    await page.getByText('Thanh toán khi nhận hàng', { exact: true }).click();
    await expect(page.getByRole('button', { name: /Đặt hàng/i })).toBeVisible();

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'checkout_payment_methods_desktop.png'), fullPage: true });
  });

  test('mobile: no overflow on payment method cards', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAndSeedCart(page);
    await page.goto(`${BASE_URL}/checkout`);
    await expect(page.getByText('Thanh toán khi nhận hàng', { exact: true })).toBeVisible({ timeout: 10000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, 'checkout mobile: horizontal overflow detected').toBe(false);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'checkout_payment_methods_mobile.png'), fullPage: true });
  });

  test('COD checkout: honest success copy, not "Thanh toán thành công"', async ({ page }) => {
    await loginAndSeedCart(page);
    await page.goto(`${BASE_URL}/checkout`);
    await expect(page.getByText('Thanh toán khi nhận hàng', { exact: true })).toBeVisible({ timeout: 10000 });

    await page.fill('#name', 'QA Checkout Buyer');
    await page.fill('#phone', '0901234567');
    await page.fill('#email', 'qa-checkout@example.invalid');
    await page.fill('#province', 'Thành phố Hồ Chí Minh');
    await page.fill('#district', 'Quận 1');
    await page.fill('#streetAddress', '1 Đường QA Checkout');

    await page.waitForFunction(() => {
      const btn = document.querySelector('button[type="submit"][form="checkout-form"]') as HTMLButtonElement | null;
      return btn && !btn.disabled;
    }, { timeout: 15000 });

    await page.getByRole('button', { name: /Đặt hàng/i }).click();
    await page.waitForURL(/\/checkout\/success/, { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /Đặt hàng thành công.*Thanh toán khi nhận hàng/i })).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Thanh toán thành công');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'cod_success.png'), fullPage: true });
  });

  test('bank transfer checkout: real instructions panel with amount, reference, countdown', async ({ page }) => {
    await loginAndSeedCart(page);
    await page.goto(`${BASE_URL}/checkout`);
    await expect(page.getByText('Chuyển khoản ngân hàng', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Chuyển khoản ngân hàng', { exact: true }).click();

    await page.fill('#name', 'QA Checkout Buyer');
    await page.fill('#phone', '0901234567');
    await page.fill('#email', 'qa-checkout-bank@example.invalid');
    await page.fill('#province', 'Thành phố Hồ Chí Minh');
    await page.fill('#district', 'Quận 1');
    await page.fill('#streetAddress', '1 Đường QA Checkout');

    await page.waitForFunction(() => {
      const btn = document.querySelector('button[type="submit"][form="checkout-form"]') as HTMLButtonElement | null;
      return btn && !btn.disabled;
    }, { timeout: 15000 });

    await page.getByRole('button', { name: /Tạo đơn & nhận mã chuyển khoản/i }).click();
    await page.waitForURL(/\/checkout\/success/, { timeout: 15000 });

    const panel = page.locator('[data-testid="bank-transfer-instructions"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Ngân hàng', { exact: true })).toBeVisible();
    await expect(panel.getByText('Số tài khoản', { exact: true })).toBeVisible();
    await expect(panel.getByText('Nội dung chuyển khoản', { exact: true })).toBeVisible();
    await expect(panel.getByText(/^\d{2}:\d{2}$/)).toBeVisible();

    const noConfirmButtons = await page.getByRole('button', { name: /xác nhận đã thanh toán|đánh dấu đã thanh toán/i }).count();
    expect(noConfirmButtons, 'checkout must not expose a self-confirm payment button').toBe(0);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'bank_transfer_success.png'), fullPage: true });
  });
});
