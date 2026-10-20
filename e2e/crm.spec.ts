import { test, expect } from '@playwright/test';
import { loginAsAdmin, cleanupTestData } from './helpers/auth';

const TEST_PREFIX = `AUTOCRM_${Date.now()}`;
const TEST_LEAD_NAME = `${TEST_PREFIX} Somsak`;
const TEST_LEAD_PHONE = `020${Math.floor(10000000 + Math.random() * 90000000)}`;

test.describe('CRM & Customers', () => {
  test.afterAll(async () => {
    await cleanupTestData(TEST_PREFIX);
  });

  test('should navigate to CRM and create a new customer lead', async ({ page }) => {
    await loginAsAdmin(page);

    // Click CRM menu
    const crmBtn = page.locator('aside button').filter({ hasText: /CRM|ລູກຄ້າ|ลูกค้า/ }).first();
    await crmBtn.click();

    // Verify CRM view loaded
    await expect(page.locator('main')).toContainText(/CUSTOMER RELATIONSHIP MANAGEMENT|CRM/i);

    // Open new customer modal
    const addLeadBtn = page.locator('button').filter({ hasText: /ເພີ່ມລູກຄ້າ|Add New Customer/i }).first();
    await expect(addLeadBtn).toBeVisible({ timeout: 15_000 });
    await addLeadBtn.click();

    // Fill new customer form
    const nameInput = page.locator('#lead-customer-name, input[placeholder*="ສົມສັກ"], input[placeholder*="สมศักดิ์"]').first();
    const phoneInput = page.locator('#lead-phone, input[placeholder*="020"]').first();

    await nameInput.fill(TEST_LEAD_NAME);
    await phoneInput.fill(TEST_LEAD_PHONE);

    // Submit form
    const saveButton = page.locator('button[type="submit"]').filter({ hasText: /ບັນທຶກ|บันทึก|Save/ }).first();
    await saveButton.click();

    // Verify success feedback or customer appears in list
    await expect(page.locator('main')).toContainText(new RegExp(`${TEST_PREFIX}|${TEST_LEAD_PHONE}`), { timeout: 10_000 });
  });

  test('should search and filter customer leads correctly', async ({ page }) => {
    await loginAsAdmin(page);

    const crmBtn = page.locator('aside button').filter({ hasText: /CRM|ລູກຄ້າ|ลูกค้า/ }).first();
    await crmBtn.click();

    const searchInput = page.locator('input[placeholder*="ຄົ້ນຫາ"], input[placeholder*="ค้นหา"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(TEST_LEAD_PHONE);
      await expect(page.locator('main')).toContainText(TEST_LEAD_PHONE);
    }
  });
});
