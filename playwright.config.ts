import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Fail-closed E2E environment guard: .env.test is mandatory
const envTestPath = path.resolve(process.cwd(), '.env.test');
if (!fs.existsSync(envTestPath)) {
  throw new Error('[E2E SAFETY HALT] Missing .env.test! E2E tests strictly require a dedicated test configuration.');
}

const envContent = fs.readFileSync(envTestPath, 'utf8');
const parsed = dotenv.parse(envContent);

const REQUIRED_E2E_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_ALLOWED_SUPABASE_ORIGIN',
];

for (const key of REQUIRED_E2E_KEYS) {
  const val = parsed[key]?.trim();
  if (!val) {
    throw new Error(`[E2E SAFETY HALT] Missing mandatory key "${key}" in .env.test`);
  }
  process.env[key] = val; // Enforce test env values
}

// Origin guard: Target Supabase origin must strictly match allowed whitelist
const testSupabaseUrl = process.env.VITE_SUPABASE_URL!;
const allowedOrigin = process.env.E2E_ALLOWED_SUPABASE_ORIGIN!;
const targetOrigin = new URL(testSupabaseUrl).origin;
const expectedOrigin = new URL(allowedOrigin).origin;

if (targetOrigin !== expectedOrigin) {
  throw new Error(
    `[E2E SAFETY HALT] Target Supabase URL origin (${targetOrigin}) does not match E2E_ALLOWED_SUPABASE_ORIGIN (${expectedOrigin})`
  );
}

// Check if existing cached Chromium or default browser is available
const cachedChromium = path.join(process.env.HOME || '', '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const hasCachedChromium = fs.existsSync(cachedChromium);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'node ./node_modules/vite/bin/vite.js --port=3000 --host=0.0.0.0 --mode test',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
