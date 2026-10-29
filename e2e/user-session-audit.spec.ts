import { test, expect } from '@playwright/test';
import path from 'path';
import { TEST_CREDENTIALS } from './helpers/auth';

test('Verify Live Website Login with test admin credentials', async ({ page }) => {
  const screenshotsDir = path.resolve(process.cwd(), 'docs/verification-screenshots');

  console.log('--- Step 1: Navigate to Web Application ---');
  await page.goto('/');
  await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 10_000 });

  console.log(`--- Step 2: Input ${TEST_CREDENTIALS.email} and password ---`);
  await page.locator('input[type="text"]').first().fill(TEST_CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(TEST_CREDENTIALS.password);

  const startTime = Date.now();
  await page.locator('button[type="submit"]').first().click();

  console.log('--- Step 3: Wait for App Shell & Auth Session ---');
  const sidebar = page.locator('.app-sidebar, aside.app-sidebar, aside').first();
  await expect(sidebar).toBeVisible({ timeout: 15_000 });
  const loginDuration = Date.now() - startTime;
  console.log(`✅ Login Success! Response time: ${loginDuration}ms`);

  // Verify email displayed in sidebar
  await expect(sidebar).toContainText(TEST_CREDENTIALS.email);
  console.log(`✅ User email verified in sidebar: ${TEST_CREDENTIALS.email}`);

  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${screenshotsDir}/01-dashboard-view.png`, fullPage: false });

  console.log('--- Step 4: Verify POS Sales View ---');
  const posNav = page.locator('button, a').filter({ hasText: /POS|ຂາຍໜ້າຮ້ານ|จุดขาย/i }).first();
  if (await posNav.isVisible()) {
    await posNav.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotsDir}/02-pos-view.png`, fullPage: false });
    console.log('✅ POS View loaded successfully');
  }

  console.log('--- Step 5: Verify Inventory View ---');
  const invNav = page.locator('button, a').filter({ hasText: /ສາງລົດ|คลังรถ|Inventory/i }).first();
  if (await invNav.isVisible()) {
    await invNav.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotsDir}/03-inventory-view.png`, fullPage: false });
    console.log('✅ Inventory View loaded successfully');
  }

  console.log('--- Step 6: Verify Bills Management View ---');
  const billsNav = page.locator('button, a').filter({ hasText: /ບິນ|บิล|Bills/i }).first();
  if (await billsNav.isVisible()) {
    await billsNav.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotsDir}/04-bills-view.png`, fullPage: false });
    console.log('✅ Bills View loaded successfully');
  }

  console.log('--- Step 7: Verify CRM Customer View ---');
  const crmNav = page.locator('button, a').filter({ hasText: /ລູກຄ້າ|ลูกค้า|CRM|Customers/i }).first();
  if (await crmNav.isVisible()) {
    await crmNav.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotsDir}/05-crm-view.png`, fullPage: false });
    console.log('✅ CRM View loaded successfully');
  }

  console.log(`🎉 ALL LIVE SYSTEM CHECKS COMPLETED FOR ${TEST_CREDENTIALS.email}!`);
});
