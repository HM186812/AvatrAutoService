import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Theme & Localization', () => {
  test('should toggle between dark and light themes smoothly', async ({ page }) => {
    await loginAsAdmin(page);

    const aside = page.locator('aside');
    const themeBtn = aside.locator(
      'button[title*="ໂໝດ"], button[title*="โหมด"], button[title*="Mode"], button[aria-label*="ໂໝດ"], button[aria-label*="โหมด"], button[aria-label*="Mode"]'
    ).first();
    await expect(themeBtn).toBeVisible({ timeout: 5_000 });

    // Toggle theme
    await themeBtn.click();
    await page.waitForTimeout(500);

    // Toggle back
    await themeBtn.click();
    await page.waitForTimeout(500);

    await expect(aside).toBeVisible();
  });

  test('should switch languages between Lao, Thai, and English', async ({ page }) => {
    await loginAsAdmin(page);

    const aside = page.locator('aside');

    // Switch to English
    const enBtn = aside.locator('button').filter({ hasText: /^EN$/ }).first();
    await enBtn.click();
    await expect(page.locator('main')).toBeVisible();

    // Switch to Thai
    const thBtn = aside.locator('button').filter({ hasText: /^ไทย$/ }).first();
    await thBtn.click();
    await expect(page.locator('main')).toBeVisible();

    // Switch back to Lao
    const loBtn = aside.locator('button').filter({ hasText: /^ລາວ$/ }).first();
    await loBtn.click();
    await expect(page.locator('main')).toBeVisible();
  });
});
