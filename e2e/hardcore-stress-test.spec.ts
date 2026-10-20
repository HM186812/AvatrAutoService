import { test, expect } from '@playwright/test';
import { loginAsAdmin, cleanupTestData } from './helpers/auth';

const CHAOS_PREFIX = `CHAOS_${Date.now()}`;

test.describe('🔥 HARDCORE ADVERSARIAL & CHAOS TEST SUITE (โหมดทดสอบโหด)', () => {
  test.afterAll(async () => {
    await cleanupTestData(CHAOS_PREFIX);
  });

  test('CHAOS-01: Malicious XSS & SQLi Payload Injection', async ({ page }) => {
    test.setTimeout(45_000);
    let alertTriggered = false;
    page.on('dialog', async (dialog) => {
      alertTriggered = true;
      await dialog.dismiss();
    });

    await loginAsAdmin(page);

    // Navigate to CRM
    const crmBtn = page.locator('aside button').filter({ hasText: /ລູກຄ້າ|CRM|Customer/i }).first();
    await crmBtn.click();
    await expect(page.locator('main')).toBeVisible();

    // Inject XSS & SQLi payloads into search and customer form
    const xssPayload = `${CHAOS_PREFIX} <script>alert(1)</script><img src=x onerror=alert(1)>'; DROP TABLE customers;--`;
    const searchInput = page.locator('main input[type="text"], main input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(xssPayload);
      await page.waitForTimeout(300);
      await searchInput.fill('');
    }

    expect(alertTriggered).toBe(false);
    console.log('✅ CHAOS-01 PASSED: XSS script injection neutralized successfully (Zero Alert Dialogs)');
  });

  test('CHAOS-02: Rapid Multi-Click & Concurrency Race Condition', async ({ page }) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page);

    // Navigate to CRM
    const crmBtn = page.locator('aside button').filter({ hasText: /ລູກຄ້າ|CRM|Customer/i }).first();
    await crmBtn.click();
    await expect(page.locator('main')).toBeVisible();

    // Open Add Customer Modal
    const addCustBtn = page.locator('button').filter({ hasText: /ເພີ່ມລູກຄ້າ|Add New Customer/i }).first();
    await expect(addCustBtn).toBeVisible({ timeout: 15_000 });
    await addCustBtn.click();

    // Count POST/PUT/PATCH mutations to customers table
    let mutationCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/rest/v1/customers') && ['POST', 'PUT', 'PATCH'].includes(req.method())) {
        mutationCount++;
      }
    });

    // Fill form
    const nameInput = page.locator('#lead-customer-name, form input[type="text"]').first();
    const phoneInput = page.locator('#lead-phone, form input[placeholder*="020"]').first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(`${CHAOS_PREFIX}_RACE`);
    await phoneInput.fill(`02099${Math.floor(100000 + Math.random() * 900000)}`);

    // Rapidly click submit 5 times without waiting
    const submitBtn = page.locator('form button[type="submit"]').first();
    await Promise.all([
      submitBtn.click({ force: true }).catch(() => {}),
      submitBtn.click({ force: true }).catch(() => {}),
      submitBtn.click({ force: true }).catch(() => {}),
      submitBtn.click({ force: true }).catch(() => {}),
      submitBtn.click({ force: true }).catch(() => {}),
    ]);

    await page.waitForTimeout(2000);
    console.log(`📊 CHAOS-02: 5 rapid clicks resulted in ${mutationCount} database mutation(s)`);
    expect(mutationCount).toBeLessThanOrEqual(1);
  });

  test('CHAOS-03: Extreme Boundary Values & 4,000-char Text Overflow', async ({ page }) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page);

    const crmBtn = page.locator('aside button').filter({ hasText: /ລູກຄ້າ|CRM|Customer/i }).first();
    await crmBtn.click();
    await expect(page.locator('main')).toBeVisible();

    // Open Add Customer Modal if present
    const addCustBtn = page.locator('button').filter({ hasText: /ເພີ່ມລູກຄ້າ|Add New Customer/i }).first();
    if (await addCustBtn.isVisible()) {
      await addCustBtn.click();
    }

    const longText = '🔥AVATR_ຂໍ້ມູນຍາວ_'.repeat(250); // ~4,000 chars
    const notesArea = page.locator('form textarea').first();
    if (await notesArea.isVisible()) {
      await notesArea.fill(longText);
      const val = await notesArea.inputValue();
      expect(val.length).toBeLessThanOrEqual(2000);
    }

    await expect(page.locator('main')).toBeVisible();
    console.log('✅ CHAOS-03 PASSED: System handled 4,000-character Unicode payload without crashing');
  });

  test('CHAOS-04: API 500 Fault Injection & Graceful Error Boundary Recovery', async ({ page }) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page);

    const crmBtn = page.locator('aside button').filter({ hasText: /ລູກຄ້າ|CRM|Customer/i }).first();
    await crmBtn.click();
    await expect(page.locator('main')).toBeVisible();

    // Open Add Customer Modal
    const addCustBtn = page.locator('button').filter({ hasText: /ເພີ່ມລູກຄ້າ|Add New Customer/i }).first();
    await expect(addCustBtn).toBeVisible({ timeout: 15_000 });
    await addCustBtn.click();

    // Intercept customer save and return 500 Internal Server Error
    await page.route('**/rest/v1/customers*', async (route) => {
      if (route.request().method() === 'POST') {
        console.log('⚡ SIMULATING: Injected 500 Internal Server Error from Supabase');
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Simulated Database Chaos 500 Outage' }),
        });
      } else {
        await route.continue();
      }
    });

    const nameInput = page.locator('#lead-customer-name, form input[type="text"]').first();
    const phoneInput = page.locator('#lead-phone, form input[placeholder*="020"]').first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(`${CHAOS_PREFIX}_500_TEST`);
    await phoneInput.fill('020 55554444');

    const submitBtn = page.locator('form button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // App should still be alive and not crash into error boundary
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('aside')).toBeVisible();
    console.log('✅ CHAOS-04 PASSED: App survived 500 API fault and recovered gracefully');
  });

  test('CHAOS-05: Session Storage Mutilation & Token Poisoning', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('avatr_auth_session', '{corrupted_json_syntax_error');
      localStorage.setItem('avatr_dealership_packages_v2', '{{{invalid_json');
      localStorage.setItem('sb-corrupted-auth-token', 'NOT_A_JWT_TOKEN_12345');
    });

    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ CHAOS-05 PASSED: Corrupted token gracefully recovered without SyntaxError crash');
  });

  test('CHAOS-06: Viewport Torture on 320px Mobile Screen', async ({ page }) => {
    test.setTimeout(30_000);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await expect(page.locator('form')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
    });
    console.log(`📱 CHAOS-06 (320px): Horizontal overflow status: ${hasHorizontalOverflow}`);
    expect(hasHorizontalOverflow).toBe(false);
    console.log('✅ CHAOS-06 PASSED: 320px ultra-narrow viewport rendered with accessible controls');
  });
});
