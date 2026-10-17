import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Bills & Invoices Management', () => {
  test('should display bills list with sales and inbound records', async ({ page }) => {
    await loginAsAdmin(page);

    // Click Bills menu with robust cross-language matcher
    const billsBtn = page.locator('aside button').filter({ hasText: /ບິນ|บิล|Bill/i }).first();
    await billsBtn.click();

    // Verify bills view loaded
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main table').first()).toBeVisible({ timeout: 15_000 });
  });

  test('should open bill receipt modal on view click', async ({ page }) => {
    await loginAsAdmin(page);

    const billsBtn = page.locator('aside button').filter({ hasText: /ບິນ|บิล|Bill/i }).first();
    await billsBtn.click();

    // Wait for table to be loaded
    const firstRowBtn = page.locator('main table tbody tr button').first();
    await expect(firstRowBtn).toBeVisible({ timeout: 15_000 });
    await firstRowBtn.click();

    // Verify receipt modal opened
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 10_000 });

    // Close modal
    const closeBtn = modal.locator('button').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});
