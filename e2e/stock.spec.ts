import { test, expect } from '@playwright/test';
import { loginAsAdmin, cleanupTestData } from './helpers/auth';

const TEST_PREFIX = `AUTOSTK_${Date.now()}`;
const TEST_VIN = `LVV9C07E7RA${Math.floor(100000 + Math.random() * 900000)}`;
const TEST_ENGINE = `ENG${Math.floor(100000 + Math.random() * 900000)}`;
const TEST_SUPPLIER = `${TEST_PREFIX} Supplier Co.`;

test.describe('Inventory & Stock-In', () => {
  test.afterAll(async () => {
    await cleanupTestData(TEST_PREFIX);
    await cleanupTestData(TEST_VIN);
  });

  test('should display inventory stock list with vehicles', async ({ page }) => {
    await loginAsAdmin(page);

    // Click Inventory menu
    const stockBtn = page.locator('aside button').filter({ hasText: /Stock|ສະຕ໋ອກລົດ|สต็อกรถยนต์/ }).first();
    await stockBtn.click();

    // Verify main content loaded
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main')).toContainText(/AVATR/);
  });

  test('should perform Stock-In (เพิ่มของ) with dual save to inventory and bills', async ({ page }) => {
    await loginAsAdmin(page);

    const freshVin = `LVV9C07E7RA${Math.floor(100000 + Math.random() * 900000)}`;
    const freshEngine = `ENG${Math.floor(100000 + Math.random() * 900000)}`;

    // Click Stock-In menu
    const stockInBtn = page.locator('aside button').filter({ hasText: /Stock-In|ປ້ອນນຳເຂົ້າ|บันทึกนำเข้า/ }).first();
    await stockInBtn.click();

    // Fill required fields
    const vinInput = page.locator('input[placeholder*="LVV9C"]').first();
    const engineInput = page.locator('input[placeholder*="TZ210XYA"]').first();
    const supplierInput = page.locator('input[placeholder*="AVATR Technology"]').first();
    const priceInput = page.locator('input[placeholder="45,000"]').first();

    await vinInput.fill(freshVin);
    await engineInput.fill(freshEngine);
    await supplierInput.fill(TEST_SUPPLIER);
    await priceInput.fill('42000');

    // Click Dual Save submit button
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Dual Save|ບັນທຶກສະຕ໋ອກ|บันทึกสต็อก/ }).first();
    await submitBtn.click();

    // Verify confirmation modal appears
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 30_000 });
    await expect(modal).toContainText(/ສຳເລັດ|สำเร็จ|Success|GRN/i);

    // Clean up fresh test vin after test
    await cleanupTestData(freshVin);

    // Close modal
    const closeBtn = modal.locator('button').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});
