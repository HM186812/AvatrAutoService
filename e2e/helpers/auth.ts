import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Respect existing environment or .env.test first before falling back to .env.local
if (!process.env.VITE_SUPABASE_URL) {
  const envTestPath = path.resolve(process.cwd(), '.env.test');
  if (fs.existsSync(envTestPath)) {
    dotenv.config({ path: envTestPath });
  } else {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  }
}

export const TEST_CREDENTIALS = {
  email: 'test01@gmail.com',
  password: '123456',
};

export function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Check if already logged in
  const alreadyLoggedIn = await page.locator('aside').isVisible().catch(() => false);
  if (alreadyLoggedIn) return;

  // Fill login credentials
  const emailInput = page.locator('input[type="text"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(TEST_CREDENTIALS.email);
  await passwordInput.fill(TEST_CREDENTIALS.password);

  // Click first submit button (Sign In form)
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  // Wait for sidebar to appear
  await expect(page.locator('aside')).toBeVisible({ timeout: 35_000 });
}

export async function cleanupTestData(prefix: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: auth } = await supabase.auth.signInWithPassword({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
    });

    if (!auth?.session) return;

    // Delete test customers
    await supabase.from('customers').delete().ilike('name', `%${prefix}%`);

    // Delete test bills
    await supabase.from('bills').delete().ilike('bill_number', `%${prefix}%`);

    // Delete test vehicles
    await supabase.from('vehicles').delete().ilike('vin', `%${prefix}%`);
  } catch (err) {
    console.warn(`Cleanup error for prefix ${prefix}:`, err);
  }
}
