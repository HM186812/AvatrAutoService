import { test, expect } from '@playwright/test';
import { loginAsAdmin, cleanupTestData } from './helpers/auth';

const TEST_PREFIX = `AUTOPOS_${Date.now()}`;
const TEST_BUYER_NAME = `${TEST_PREFIX} Buyer`;
const TEST_BUYER_PHONE = `020${Math.floor(10000000 + Math.random() * 90000000)}`;

test.describe('Point of Sale (POS)', () => {
  test.afterAll(async () => {
    await cleanupTestData(TEST_PREFIX);
  });

  test('should load POS view and display available vehicles for sale', async ({ page }) => {
    await loginAsAdmin(page);

    // Click POS menu
    const posBtn = page.locator('aside button').filter({ hasText: /POS|ຂາຍ|ขาย/ }).first();
    await posBtn.click();

    // Verify header and vehicle selection cards
    await expect(page.locator('main')).toContainText(/POINT OF SALE|POS/i);
    await expect(page.locator('main')).toContainText(/AVATR/);
  });

  test('should complete vehicle sale (ขายของ) and generate sales invoice', async ({ page }) => {
    await loginAsAdmin(page);

    const posBtn = page.locator('aside button').filter({ hasText: /POS|ຂາຍ|ขาย/ }).first();
    await posBtn.click();

    // Select the first available vehicle
    const vehicleCard = page.locator('main button').filter({ hasText: /AVATR/ }).first();
    await vehicleCard.click();

    // Fill customer details
    const nameInput = page.locator('input[placeholder*="ສົມຊາຍ"], input[placeholder*="สมชาย"]').first();
    const phoneInput = page.locator('input[placeholder*="020"]').first();

    await nameInput.fill(TEST_BUYER_NAME);
    await phoneInput.fill(TEST_BUYER_PHONE);

    // Confirm Sale
    const confirmBtn = page.locator('button').filter({ hasText: /ຢືນຢັນການຂາຍ|ยืนยันการขาย|Confirm/ }).first();
    await confirmBtn.click();

    // Verify invoice modal
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal).toContainText(/ສຳເລັດ|สำเร็จ|Success|INV/i);

    // Close invoice modal
    const closeBtn = modal.locator('button').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});
