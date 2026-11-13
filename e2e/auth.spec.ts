import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './helpers/auth';

test.describe('Authentication & Session', () => {
  test('should display login screen with all required elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('should show error message on invalid password', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="text"]').first().fill(TEST_CREDENTIALS.email);
    await page.locator('input[type="password"]').first().fill('wrongpassword123');
    await page.locator('button[type="submit"]').first().click();

    // Expect error alert or message
    await expect(page.locator('.text-rose-400, .text-rose-500, .text-rose-300, .text-red-400, [role="alert"]').first()).toBeVisible({ timeout: 20_000 });
  });

  test('should successfully sign in with valid admin credentials and log out', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="text"]').first().fill(TEST_CREDENTIALS.email);
    await page.locator('input[type="password"]').first().fill(TEST_CREDENTIALS.password);
    await page.locator('button[type="submit"]').first().click();

    // Verify authenticated app shell
    const aside = page.locator('aside');
    await expect(aside).toBeVisible({ timeout: 15_000 });
    await expect(aside).toContainText(TEST_CREDENTIALS.email);

    // Click logout (icon button exposes label via aria-label / title)
    const logoutBtn = aside.locator(
      'button[aria-label*="ອອກຈາກລະບົບ"], button[aria-label*="ออกจากระบบ"], button[aria-label*="Sign Out"], button[aria-label*="Log Out"], button[title*="ອອກຈາກລະບົບ"], button[title*="ออกจากระบบ"], button[title*="Sign Out"], button[title*="Log Out"]'
    ).first();
    await expect(logoutBtn).toBeVisible({ timeout: 5_000 });
    await logoutBtn.click();
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10_000 });
  });
});
