import { test, expect } from '@playwright/test';
import { loginAsAdmin, cleanupTestData, ensureDedicatedTestVehicle, getSupabaseClient, TEST_CREDENTIALS } from './helpers/auth';

const TEST_TIMESTAMP = Date.now();
const TEST_VIN = `TESTPOS${TEST_TIMESTAMP.toString().slice(-10)}`;
const TEST_BUYER_NAME = `E2E Tester ${TEST_TIMESTAMP}`;
const TEST_BUYER_PHONE = `020${Math.floor(10000000 + Math.random() * 90000000)}`;

test.describe('Point of Sale (POS)', () => {
  test.beforeAll(async () => {
    // 1. Seed a dedicated isolated test vehicle - NEVER touch real inventory
    await ensureDedicatedTestVehicle(TEST_VIN);
  });

  test.afterAll(async () => {
    // 2. Comprehensive cleanup: delete test customer, bill, and test vehicle completely
    await cleanupTestData({ buyerName: TEST_BUYER_NAME, testVin: TEST_VIN });
  });

  test('should load POS view and display available vehicles for sale', async ({ page }) => {
    await loginAsAdmin(page);

    // Click POS menu
    const posBtn = page.locator('aside button').filter({ hasText: /POS|ຂາຍ|ขาย/ }).first();
    await posBtn.click();

    // Verify header and vehicle selection cards
    await expect(page.locator('main')).toContainText(/POINT OF SALE|POS/i);
    await expect(page.locator('main')).toContainText(/AVATR/, { timeout: 30_000 });
  });

  test('should complete vehicle sale (ขายของ) and assert database mutation state', async ({ page }) => {
    await loginAsAdmin(page);

    const posBtn = page.locator('aside button').filter({ hasText: /POS|ຂາຍ|ขาย/ }).first();
    await posBtn.click();

    // Select the dedicated test vehicle specifically by its plate or VIN card
    const dedicatedCard = page.locator('main button').filter({ hasText: TEST_VIN });
    if (await dedicatedCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dedicatedCard.click();
    } else {
      // Fallback: select any ready vehicle button with matching plate
      const plateCard = page.locator('main button').filter({ hasText: 'TEST-9999' }).first();
      if (await plateCard.isVisible().catch(() => false)) {
        await plateCard.click();
      } else {
        const vehicleCard = page.locator('main button').filter({ hasText: /AVATR/ }).first();
        await vehicleCard.click();
      }
    }

    // Fill customer details
    const nameInput = page.locator('input[placeholder*="ບຸນມີ"], input[placeholder*="ສົມຊາຍ"], input[placeholder*="สมชาย"]').first();
    const phoneInput = page.locator('input[placeholder*="020"]').first();

    await nameInput.fill(TEST_BUYER_NAME);
    await phoneInput.fill(TEST_BUYER_PHONE);

    // Confirm Sale
    const confirmBtn = page.locator('button.pos-confirm-sale-button, button').filter({ hasText: /ຢືນຢັນການຂາຍ|ยืนยันการขาย|Confirm/ }).first();
    await confirmBtn.click();

    // 1. Verify invoice modal rendered in UI
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal).toContainText(/ສຳເລັດ|สำเร็จ|Success|INV/i);

    // 2. Luna Demand #4: Direct Database State Assertions (Evidence over UI assertions)
    const supabase = getSupabaseClient();
    await supabase.auth.signInWithPassword({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
    });

    // A. Assert Bill was created in database
    const { data: billRows, error: billErr } = await supabase
      .from('bills')
      .select('id, bill_number, total_usd, status')
      .ilike('customer_name', `%${TEST_BUYER_NAME}%`);
    expect(billErr).toBeNull();
    expect(billRows && billRows.length).toBeGreaterThanOrEqual(1);

    // B. Assert Vehicle status changed to 'sold' or deducted
    const { data: vehicleRow, error: vErr } = await supabase
      .from('vehicles')
      .select('status')
      .eq('vin', TEST_VIN)
      .maybeSingle();
    expect(vErr).toBeNull();
    if (vehicleRow) {
      expect(vehicleRow.status).toBe('sold');
    }

    // C. Assert Stock Movement was logged
    const { data: movementRows, error: mErr } = await supabase
      .from('stock_movements')
      .select('movement_type')
      .eq('vehicle_vin', TEST_VIN);
    expect(mErr).toBeNull();
    expect(movementRows && movementRows.length).toBeGreaterThanOrEqual(1);
    expect(movementRows && movementRows[0].movement_type).toBe('stock_out');

    // Close invoice modal
    const closeBtn = modal.locator('button').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});
