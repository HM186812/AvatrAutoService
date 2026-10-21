import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Verify .env.test to prevent accidental test mutation on Production DB
const envTestPath = path.resolve(process.cwd(), '.env.test');
const hasEnvTest = fs.existsSync(envTestPath);

if (hasEnvTest) {
  dotenv.config({ path: envTestPath });
} else if (process.env.ALLOW_PROD_TEST !== 'true') {
  console.warn(
    '\n⚠️  [PLAYWRIGHT E2E SAFETY GUARD] Missing .env.test file!\n' +
    'To avoid mutating the Production database, Playwright requires a dedicated test environment.\n' +
    'Please copy .env.test.example to .env.test and set your test database credentials:\n' +
    '  cp .env.test.example .env.test\n' +
    'Or run with ALLOW_PROD_TEST=true if you explicitly intend to test against the current environment.\n'
  );
  throw new Error('E2E Test Aborted: .env.test not found. Run with .env.test or ALLOW_PROD_TEST=true');
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
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --mode test',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
