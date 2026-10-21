import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const testEnvPath = path.resolve(process.cwd(), '.env.test');

if (fs.existsSync(testEnvPath)) {
  const envContent = fs.readFileSync(testEnvPath, 'utf8');
  const parsed = dotenv.parse(envContent);
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} else if (process.env.ALLOW_PROD_TEST !== 'true') {
  throw new Error('E2E Safety Guard: .env.test not found. Refusing to fallback to .env.local without ALLOW_PROD_TEST=true');
}

function requiredTestEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing test environment variable: ${name}`);
  }

  return value;
}

export function validateTestSupabaseOrigin(url: string) {
  const allowed = process.env.E2E_ALLOWED_SUPABASE_ORIGIN;
  if (!allowed || !allowed.trim()) return;
  const targetOrigin = new URL(url).origin;
  const allowedOrigin = new URL(allowed).origin;
  if (targetOrigin !== allowedOrigin) {
    throw new Error(
      `[E2E SAFETY HALT] Target Supabase URL origin (${targetOrigin}) does not match E2E_ALLOWED_SUPABASE_ORIGIN (${allowedOrigin})`
    );
  }
}

export const TEST_CREDENTIALS = {
  email: requiredTestEnv('E2E_ADMIN_EMAIL'),
  password: requiredTestEnv('E2E_ADMIN_PASSWORD'),
};

export function getSupabaseClient() {
  const url = requiredTestEnv('VITE_SUPABASE_URL');
  const key = requiredTestEnv('VITE_SUPABASE_ANON_KEY');
  validateTestSupabaseOrigin(url);
  return createClient(url, key);
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Clear any residual state from previous tests that may have tampered storage
  await page.evaluate(() => {
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
  });

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
  await page.waitForLoadState('networkidle').catch(() => {});
}

export async function ensureSeedData() {
  try {
    const supabase = getSupabaseClient();
    const { data: auth } = await supabase.auth.signInWithPassword({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
    });
    if (!auth?.session) return;

    const defaultModels = [
      { id: 'avatr-12', name: 'AVATR 12', category: 'Grand Coupé', price_starting_usd: 46800, price_starting_lak: 1029600000 },
      { id: 'avatr-11', name: 'AVATR 11', category: 'Luxury SUV Coupé', price_starting_usd: 43900, price_starting_lak: 965800000 },
      { id: 'avatr-07', name: 'AVATR 07', category: 'Urban Smart SUV', price_starting_usd: 36500, price_starting_lak: 803000000 },
    ];
    await supabase.from('vehicle_models').upsert(defaultModels, { onConflict: 'id' });

    const { data: existingVehicles } = await supabase.from('vehicles').select('vin').eq('status', 'ready').limit(1);
    if (!existingVehicles || existingVehicles.length === 0) {
      await supabase.from('vehicles').upsert({
        vin: 'LVV9C12E7RA000001',
        model_id: 'avatr-12',
        engine_number: 'ENG-SEED-001',
        plate_number: 'ກມ-9999',
        color: 'Obsidian Black',
        price_usd: 46800,
        price_lak: 1029600000,
        status: 'ready',
        pdi_status: 'passed',
      }, { onConflict: 'vin' });
    }
  } catch (err) {
    console.warn('ensureSeedData error:', err);
  }
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
