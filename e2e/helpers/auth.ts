import { Page, expect } from '@playwright/test';
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { createClient } = req('@supabase/supabase-js');
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const testEnvPath = path.resolve(process.cwd(), '.env.test');

if (!fs.existsSync(testEnvPath)) {
  throw new Error('[E2E SAFETY HALT] .env.test is mandatory. Tests refuse to run without an isolated test environment configuration.');
}

const envContent = fs.readFileSync(testEnvPath, 'utf8');
const parsed = dotenv.parse(envContent);
for (const [key, value] of Object.entries(parsed)) {
  process.env[key] = value; // Always enforce .env.test values over host env
}

function requiredTestEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required test environment variable in .env.test: ${name}`);
  }

  return value.trim();
}

export function validateTestSupabaseOrigin(url: string) {
  const allowed = process.env.E2E_ALLOWED_SUPABASE_ORIGIN;
  if (!allowed || !allowed.trim()) {
    throw new Error(
      '[E2E SAFETY HALT] E2E_ALLOWED_SUPABASE_ORIGIN is mandatory in .env.test. Refusing to run tests without explicit allowed origin whitelist.'
    );
  }
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

export async function ensureDedicatedTestVehicle(vin: string) {
  const supabase = getSupabaseClient();
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: TEST_CREDENTIALS.email,
    password: TEST_CREDENTIALS.password,
  });
  if (!auth?.session) throw new Error('Failed to authenticate as test admin to seed vehicle');

  const defaultModels = [
    { id: 'avatr-12', name: 'AVATR 12', category: 'Grand Coupé', price_starting_usd: 46800, price_starting_lak: 1029600000 },
  ];
  await supabase.from('vehicle_models').upsert(defaultModels, { onConflict: 'id' });

  // Always create/reset the dedicated test vehicle with ready status
  const { error } = await supabase.from('vehicles').upsert({
    vin,
    model_id: 'avatr-12',
    engine_number: `ENG-${vin.slice(-8)}`,
    plate_number: 'TEST-9999',
    color: 'Obsidian Black',
    price_usd: 46800,
    price_lak: 1029600000,
    status: 'ready',
    pdi_status: 'passed',
  }, { onConflict: 'vin' });

  if (error) {
    throw new Error(`Failed to seed test vehicle ${vin}: ${error.message}`);
  }
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
  } catch (err) {
    console.warn('ensureSeedData error:', err);
  }
}

export async function cleanupTestData(target: string | { buyerName?: string; testVin?: string }) {
  try {
    const supabase = getSupabaseClient();
    const { data: auth } = await supabase.auth.signInWithPassword({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
    });

    if (!auth?.session) return;

    if (typeof target === 'string') {
      const prefix = target;
      // Delete test customers
      await supabase.from('customers').delete().ilike('name', `%${prefix}%`);
      // Delete test bills
      await supabase.from('bills').delete().ilike('bill_number', `%${prefix}%`);
      // Delete test vehicles
      await supabase.from('vehicles').delete().ilike('vin', `%${prefix}%`);
    } else {
      const { buyerName, testVin } = target;

      // 1. If buyerName specified, find bills and customers
      if (buyerName) {
        const { data: billsToClean } = await supabase
          .from('bills')
          .select('id')
          .ilike('customer_name', `%${buyerName}%`);

        if (billsToClean && billsToClean.length > 0) {
          const billIds = billsToClean.map((b: { id: string }) => b.id);
          await supabase.from('bill_items').delete().in('bill_id', billIds);
          await supabase.from('stock_movements').delete().in('bill_id', billIds);
          await supabase.from('bills').delete().in('id', billIds);
        }

        await supabase.from('customers').delete().ilike('name', `%${buyerName}%`);
      }

      // 2. If testVin specified, clean vehicle movements and vehicle
      if (testVin) {
        await supabase.from('stock_movements').delete().eq('vehicle_vin', testVin);
        await supabase.from('bill_items').delete().eq('vehicle_vin', testVin);
        await supabase.from('vehicles').delete().eq('vin', testVin);
      }
    }
  } catch (err) {
    console.warn('Cleanup error:', err);
  }
}
