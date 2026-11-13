import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_PATH = path.join(ROOT, 'src/backend/data.ts');

function readDataTs(): string {
  return fs.readFileSync(DATA_PATH, 'utf8');
}

test('data.ts removes all direct client bypass mutations on protected tables', () => {
  const src = readDataTs();
  assert.doesNotMatch(src, /\.from\(['"]bills['"]\)\s*\.\s*(upsert|insert|update)/, 'bills must only be mutated via RPCs');
  assert.doesNotMatch(src, /\.from\(['"]bill_items['"]\)\s*\.\s*(upsert|insert|update)/, 'bill_items must only be mutated via RPCs');
  assert.doesNotMatch(src, /\.from\(['"]vehicles['"]\)\s*\.\s*update/, 'vehicles parity update after RPC must be removed');
  assert.doesNotMatch(src, /\.from\(['"]customers['"]\)\s*\.\s*(upsert|update)/, 'customers writes must go through SECURITY DEFINER RPCs');
  assert.doesNotMatch(src, /\.from\(['"]staff_profiles['"]\)\s*\.\s*update/, 'staff_profiles updates must not bypass Edge Functions / RPCs');
  assert.doesNotMatch(src, /\.from\(['"]dealership_settings['"]\)\s*\.\s*upsert/, 'settings patch must use patch_dealership_settings RPC');
  assert.match(src, /upsertModelError/, 'vehicle_models fallback upsert must check and throw on error');
  assert.match(src, /resolveStaffUuid\([\s\S]*?bill\.salesRep/, 'saveBillRecord must resolve bill.salesRep UUID safely');
});

test('data.ts invokes all required hardened RPCs and exports installment/after-sales helpers', async () => {
  const src = readDataTs();
  const expectedRpcs = [
    'patch_dealership_settings',
    'upsert_customer_pipeline',
    'record_installment_payment',
    'revert_installment_payment',
    'confirm_installment_payoff',
    'confirm_customer_payment',
    'attach_bill_payment_slip',
    'update_bill_after_sales',
    'update_own_staff_profile',
    'get_dashboard_sales_summary',
    'get_staff_directory',
    'handover_staff_leads',
  ];
  for (const rpc of expectedRpcs) {
    assert.ok(src.includes(`'${rpc}'`), `Expected RPC call '${rpc}' in src/backend/data.ts`);
  }

  const mod = await import('../src/backend/data');
  for (const fn of [
    'recordInstallmentPayment',
    'revertInstallmentPayment',
    'confirmInstallmentPayoff',
    'confirmCustomerPayment',
    'updateBillAfterSales',
    'fetchDashboardSalesSummary',
  ]) {
    assert.equal(typeof (mod as Record<string, unknown>)[fn], 'function', `Expected export ${fn}`);
  }
});
