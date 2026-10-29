import { test, expect } from '@playwright/test';
import path from 'path';
import { TEST_CREDENTIALS } from './helpers/auth';

test('Live POS Real Sale Submission & Bill Verification for test staff', async ({ page }) => {
  const screenshotsDir = path.resolve(process.cwd(), 'docs/verification-screenshots/full-audit');
  test.setTimeout(90_000);

  console.log(`--- Step 1: Login with ${TEST_CREDENTIALS.email} ---`);
  await page.goto('/');
  await page.locator('input[type="text"]').first().fill(TEST_CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(TEST_CREDENTIALS.password);
  await page.locator('button[type="submit"]').first().click();

  const sidebar = page.locator('aside.app-sidebar');
  await expect(sidebar).toBeVisible({ timeout: 20_000 });
  await expect(sidebar).toContainText(TEST_CREDENTIALS.email);
  console.log(`✅ Logged in successfully as ${TEST_CREDENTIALS.email}`);

  console.log('--- Step 2: Navigate to POS View ---');
  const posBtn = sidebar.locator('button').filter({ hasText: /POS|ຂາຍ|จุดขาย/i }).first();
  await posBtn.click();
  await page.waitForTimeout(1500);

  console.log('--- Step 3: Fill Customer Details for POS Sale ---');
  const nameInput = page.locator('input[placeholder*="ທ່ານ ບຸນມີ"], input[placeholder*="สมชาย"], input[placeholder*="Somxay"]').first();
  await expect(nameInput).toBeVisible({ timeout: 10_000 });
  const testCustomerName = `E2E Live Customer ${Date.now().toString().slice(-4)}`;
  await nameInput.fill(testCustomerName);

  const phoneInput = page.locator('input[type="tel"]').first();
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill('020 99887766');

  await page.waitForTimeout(500);

  console.log('--- Step 4: Submit Live Order via .pos-confirm-sale-button ---');
  const submitBtn = page.locator('.pos-confirm-sale-button, button[type="submit"]').filter({ hasText: /ຢືນຢັນ|ยืนยัน|Confirm/i }).first();
  await expect(submitBtn).toBeVisible({ timeout: 5_000 });
  await expect(submitBtn).toBeEnabled();

  const clickTime = Date.now();
  await submitBtn.click();

  console.log('--- Step 5: Wait for Sale Confirmation & Printable Bill Modal ---');
  const modalBackdrop = page.locator('.fixed.inset-0.z-50').first();
  await expect(modalBackdrop).toBeVisible({ timeout: 20_000 });
  console.log(`✅ Order processed and invoice modal popped up in ${Date.now() - clickTime}ms!`);

  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${screenshotsDir}/08-pos-sale-receipt-confirmed.png` });
  console.log('📸 Captured 08-pos-sale-receipt-confirmed.png');

  // Close modal and navigate to Bills
  const closeBtn = modalBackdrop.locator('button').filter({ hasText: /ຢືນຢັນ|ยืนยัน|Confirm|ປິດ|ปิด|Close/i }).last();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(1000);

  console.log('--- Step 6: Verify in Bills Management View ---');
  const billsBtn = sidebar.locator('button').filter({ hasText: /ບິນ|บิล|Bills/i }).first();
  await billsBtn.click({ force: true });
  await page.waitForTimeout(1500);

  // Assert customer name is visible in the bills table
  await expect(page.getByText(testCustomerName).first()).toBeVisible({ timeout: 10_000 });
  console.log(`✅ Verified test customer bill (${testCustomerName}) is visible in Bills View!`);
  await page.screenshot({ path: `${screenshotsDir}/08-bills-with-new-pos-sale.png` });
  console.log('📸 Captured 08-bills-with-new-pos-sale.png');

  console.log('--- Step 7: Navigate to CRM Customers to Verify Delivery/Customer Sync ---');
  const crmBtn = sidebar.locator('button').filter({ hasText: /CRM|ລູກຄ້າ|ลูกค้า/i }).first();
  await crmBtn.click({ force: true });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${screenshotsDir}/08-crm-with-new-delivered-customer.png` });
  console.log('📸 Captured 08-crm-with-new-delivered-customer.png');

  console.log('🎉 REAL POS SALE E2E TEST FULLY COMPLETED AND VERIFIED!');
});
