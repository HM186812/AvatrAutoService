import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

test('all CSV exports use shared formula-neutralizing csv helpers with no raw Blob builders', () => {
  const csvFiles = [
    'src/utils/documentLogger.ts',
    'src/components/views/DashboardView.tsx',
    'src/components/views/CustomerView.tsx',
    'src/components/views/BillsManagementView.tsx',
    'src/components/views/SalesLeaderboardView.tsx',
    'src/components/modals/InstallmentLedgerModal.tsx',
    'src/components/views/MonthlyBrandReport.tsx',
  ];
  for (const file of csvFiles) {
    const src = readRel(file);
    assert.doesNotMatch(src, /new\s+Blob\(/, `Raw Blob CSV export remains in ${file}`);
    assert.match(src, /from\s+['"](?:\.\.?\/)*(?:utils\/)?csv['"]/, `${file} must import from utils/csv`);
  }
});

test('inline hardcoded 22000 multipliers are replaced by resolveLakExchangeRate', () => {
  const rateFiles = [
    'src/components/views/POSSalesView.tsx',
    'src/components/views/StockInView.tsx',
    'src/components/views/InventoryView.tsx',
    'src/components/views/BillsManagementView.tsx',
    'src/components/modals/EditVehicleModelModal.tsx',
    'src/components/modals/QuotationModal.tsx',
  ];
  for (const file of rateFiles) {
    const src = readRel(file);
    assert.doesNotMatch(src, /\b22000\b/, `Hardcoded 22000 remains in ${file}`);
  }
});

test('POS and Stock-In enforce synchronous useRef submit locks, blocking slip upload, and admin discount gate', () => {
  const posSrc = readRel('src/components/views/POSSalesView.tsx');
  assert.match(posSrc, /useRef\(/, 'POSSalesView must use a useRef submit lock');
  assert.match(posSrc, /isAdminRole\(/, 'POSSalesView must enforce admin-only manual discount');
  assert.match(posSrc, /uploadPaymentSlip/, 'POSSalesView uploads payment slip');
  assert.doesNotMatch(
    posSrc,
    /catch\s*\([^)]*\)\s*\{[^}]*showToast[^}]*'warning'/,
    'POSSalesView must block transfer sale on slip upload failure instead of continuing with a warning',
  );

  const stockSrc = readRel('src/components/views/StockInView.tsx');
  assert.match(stockSrc, /useRef\(/, 'StockInView must use a useRef submit lock');
});

test('BillsManagementView batch void tracks succeededIds before clearing selection', () => {
  const src = readRel('src/components/views/BillsManagementView.tsx');
  assert.match(src, /succeededIds/, 'Batch void must track succeededIds in a Set before updating selectedBillIds');
});

test('LoginView resets Turnstile widget on failed login attempts', () => {
  const loginSrc = readRel('src/components/auth/LoginView.tsx');
  const turnstileSrc = readRel('src/components/common/TurnstileWidget.tsx');
  assert.match(loginSrc, /resetSignal/, 'LoginView must pass resetSignal to TurnstileWidget');
  assert.match(turnstileSrc, /turnstile\.reset/, 'TurnstileWidget must call window.turnstile.reset on resetSignal change');
});

test('ImportStockCsvModal displays human-readable label for price_missing and uses useRef lock', () => {
  const src = readRel('src/components/modals/ImportStockCsvModal.tsx');
  assert.match(src, /price_missing/, 'ImportStockCsvModal must handle price_missing reason');
  assert.match(src, /useRef\(/, 'ImportStockCsvModal must guard runImport with a synchronous useRef lock');
});

test('financial actions, installment RPCs, after-sales locks, and cloud leaderboard/KPIs are properly role-gated and wired', () => {
  const appSrc = readRel('src/App.tsx');
  assert.match(appSrc, /deleteBill\(/);
  assert.match(appSrc, /<DashboardView[\s\S]{0,400}setBills=\{setBills\}/);
  assert.doesNotMatch(
    appSrc,
    /voidInfo[\s\S]{0,600}await saveLead\(/,
    'App void handler should rely on atomic void_bill_with_reason customer revert instead of stale saveLead',
  );

  const posSrc = readRel('src/components/views/POSSalesView.tsx');
  assert.match(posSrc, /id="pos-sales-rep"[\s\S]{0,200}disabled=\{!isAdmin\}/);

  const ledgerSrc = readRel('src/components/modals/InstallmentLedgerModal.tsx');
  assert.match(ledgerSrc, /recordInstallmentPayment/);
  assert.match(ledgerSrc, /revertInstallmentPayment/);
  assert.match(ledgerSrc, /isAdminRole/);
  assert.match(ledgerSrc, /useRef\(/);
  assert.match(ledgerSrc, /voidedBillIds/);

  const quickSrc = readRel('src/components/modals/QuickInstallmentPaymentModal.tsx');
  assert.match(quickSrc, /recordInstallmentPayment/);
  assert.match(quickSrc, /isAdminRole/);
  assert.match(quickSrc, /useRef\(/);
  assert.doesNotMatch(quickSrc, /REC-INS-/, 'Client should receive server-generated INS bill number from RPC');

  const instDashSrc = readRel('src/components/views/InstallmentDashboardView.tsx');
  assert.match(instDashSrc, /confirmInstallmentPayoff/);
  assert.match(instDashSrc, /confirmCustomerPayment/);
  assert.match(instDashSrc, /isAdminRole/);
  assert.doesNotMatch(instDashSrc, /saveLead\(|saveBillRecord\(/, 'InstallmentDashboardView must use RPCs rather than direct saveLead/saveBillRecord');

  const payConfirmSrc = readRel('src/components/modals/PaymentConfirmModal.tsx');
  assert.match(payConfirmSrc, /isAdminRole/);

  const custDocsSrc = readRel('src/components/modals/CustomerDocumentsModal.tsx');
  assert.match(custDocsSrc, /isAdminRole/);
  assert.match(custDocsSrc, /useRef\(/);
  assert.match(custDocsSrc, /\{onConfirmPayment && \(/);

  const pipelineSrc = readRel('src/components/modals/PipelineActionModal.tsx');
  assert.match(pipelineSrc, /isAdmin\??:\s*boolean/);
  assert.match(pipelineSrc, /canEditDiscount/);

  const afterSalesSrc = readRel('src/components/modals/CustomerAfterSalesModal.tsx');
  assert.match(afterSalesSrc, /isAdmin\??:\s*boolean/);
  assert.match(afterSalesSrc, /canEditModel/);
  assert.match(afterSalesSrc, /Boolean\(customer\?\.billRecord\)|hasRecordedBill/);

  const custViewSrc = readRel('src/components/views/CustomerView.tsx');
  assert.match(custViewSrc, /confirmCustomerPayment/);
  assert.match(custViewSrc, /updateBillAfterSales/);
  assert.match(custViewSrc, /<PipelineActionModal[\s\S]{0,400}isAdmin=\{isAdminUser\}/);
  assert.match(custViewSrc, /<CustomerAfterSalesModal[\s\S]{0,400}isAdmin=\{isAdminUser\}/);
  assert.doesNotMatch(custViewSrc, /saveBillRecord\(/, 'CustomerView after-sales updates must route through updateBillAfterSales');

  const dashSrc = readRel('src/components/views/DashboardView.tsx');
  assert.match(dashSrc, /fetchDashboardSalesSummary/);
  assert.match(dashSrc, /getCloudSalesSyncKey/);

  const lbSrc = readRel('src/components/views/SalesLeaderboardView.tsx');
  assert.match(lbSrc, /mergeCloudLeaderboardStats[\s\S]{0,120}resolveLakExchangeRate\(\)/);
  assert.match(lbSrc, /getCloudSalesSyncKey/);

  const topSrc = readRel('src/components/views/TopSalesWidget.tsx');
  assert.match(topSrc, /mergeCloudLeaderboardStats[\s\S]{0,120}resolveLakExchangeRate\(\)/);
  assert.match(topSrc, /getCloudSalesSyncKey/);
});
