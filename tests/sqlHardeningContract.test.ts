import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MIGRATION_PATH = path.join(ROOT, 'supabase/migrations/20261113120000_pre_handover_reconciliation_and_rpcs.sql');
const PREFLIGHT_PATH = path.join(ROOT, 'supabase/checks/preflight_readiness.sql');
const CONFIG_PATH = path.join(ROOT, 'supabase/config.toml');

function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, 'utf8');
}

test('hardening migration exists and enforces pg_trgm + 6 missing FK indexes', () => {
  assert.ok(fs.existsSync(MIGRATION_PATH), 'Missing 20261113120000_pre_handover_reconciliation_and_rpcs.sql');
  const sql = readMigration();
  assert.match(sql, /ALTER\s+EXTENSION\s+pg_trgm\s+SET\s+SCHEMA\s+extensions/i);

  const expectedIndexes = [
    'idx_bill_items_vehicle_vin',
    'idx_bill_void_logs_voided_by',
    'idx_bills_customer_id',
    'idx_document_issuance_logs_issued_by_id',
    'idx_service_appointments_customer_id',
    'idx_test_drives_customer_id',
  ];
  for (const idx of expectedIndexes) {
    assert.ok(sql.includes(idx), `Missing index ${idx}`);
  }
});

test('hardening migration tightens staff_roles (sales canViewFinancials=false, inactive technician/general_user)', () => {
  const sql = readMigration();
  assert.match(sql, /'sales'[\s\S]*"canViewFinancials":\s*false/);
  assert.match(sql, /'technician'[\s\S]*is_active\s*=\s*false/i);
  assert.match(sql, /'general_user'[\s\S]*is_active\s*=\s*false/i);
});

test('hardening migration tightens RLS on vehicles, bills, bill_items, stock_movements, customers, and archive partitions', () => {
  const sql = readMigration();
  assert.doesNotMatch(sql, /CREATE POLICY\s+"vehicles_(insert|update)"[^;]*?canDeductPOS/i);
  assert.match(sql, /DROP\s+POLICY\s+IF\s+EXISTS\s+"bills_insert"\s+ON\s+public\.bills/i);
  assert.match(sql, /DROP\s+POLICY\s+IF\s+EXISTS\s+"bill_items_insert"\s+ON\s+public\.bill_items/i);
  assert.match(sql, /DROP\s+POLICY\s+IF\s+EXISTS\s+"stock_movements_insert"\s+ON\s+public\.stock_movements/i);
  assert.match(sql, /DROP\s+POLICY\s+IF\s+EXISTS\s+"customers_update"\s+ON\s+public\.customers/i);
  assert.match(sql, /CREATE\s+POLICY\s+"bills_archive_select"[\s\S]*?canViewFinancials/i);
  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.archive_fiscal_year_bills[\s\S]*?canViewFinancials/i);
});

test('all required hardened SECURITY DEFINER RPCs exist with search_path and REVOKE/GRANT guards', () => {
  const sql = readMigration();
  const requiredRpcs = [
    'record_vehicle_bill',
    'record_pos_sale',
    'record_installment_payment',
    'revert_installment_payment',
    'confirm_installment_payoff',
    'confirm_customer_payment',
    'attach_bill_payment_slip',
    'update_bill_after_sales',
    'void_bill_with_reason',
    'upsert_customer_pipeline',
    'patch_dealership_settings',
    'update_own_staff_profile',
    'generate_next_bill_number',
    'get_staff_directory',
    'get_sales_leaderboard',
    'get_dashboard_sales_summary',
    'handover_staff_leads',
  ];
  for (const fn of requiredRpcs) {
    assert.ok(sql.includes(`CREATE OR REPLACE FUNCTION public.${fn}`), `Missing RPC ${fn}`);
    const match = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}[\\s\\S]*?GRANT EXECUTE ON FUNCTION public\\.${fn}`, 'i'));
    assert.ok(match, `Missing REVOKE/GRANT block for ${fn}`);
    assert.match(match[0], /SET search_path = public, pg_catalog, pg_temp/i, `Missing locked search_path for ${fn}`);
    assert.match(match[0], /SECURITY DEFINER/i, `Expected SECURITY DEFINER on ${fn}`);
  }
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\._get_lak_exchange_rate\(\)/);
  assert.match(sql, /ba\.fiscal_year\s*=\s*%I\.fiscal_year/);
  assert.match(sql, /ON CONFLICT \(bill_id\) DO UPDATE/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.void_bill_with_reason[\s\S]*?vehicle_delivered_at\s*=\s*NULL[\s\S]*?installment_records\s*=\s*'\[\]'::jsonb/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.upsert_customer_pipeline[\s\S]*?vehicle_delivered_at\s*=\s*CASE WHEN \(p_customer \? 'vehicle_delivered_at'\) AND v_is_admin/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.record_vehicle_bill[\s\S]*?pdi_status[\s\S]*?reserved_for_customer/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_sales_leaderboard[\s\S]*?has_permission\('canViewFinancials'\)[\s\S]*?avg_discount_usd/);
  assert.match(sql, /ALTER\s+TABLE\s+public\.bill_items\s+ALTER\s+COLUMN\s+vehicle_vin\s+DROP\s+NOT\s+NULL/i);
  assert.match(sql, /SELECT[\s\S]*?FOR\s+UPDATE/i);
});

test('preflight_readiness and config.toml include hardened RPCs and Turnstile template', () => {
  const preflight = fs.readFileSync(PREFLIGHT_PATH, 'utf8');
  assert.ok(preflight.includes('public.record_installment_payment'));
  assert.ok(preflight.includes('public.upsert_customer_pipeline'));
  assert.ok(preflight.includes('public.get_dashboard_sales_summary'));
  assert.ok(preflight.includes('public.get_staff_directory'));
  assert.ok(preflight.includes('public.handover_staff_leads'));
  const configToml = fs.readFileSync(CONFIG_PATH, 'utf8');
  // Note: [auth.captcha] stays commented in config.toml so local CLI without TURNSTILE_SECRET_KEY doesn't error;
  // it documents the Dashboard/production Turnstile configuration.
  assert.match(configToml, /provider\s*=\s*"turnstile"/);
  assert.doesNotMatch(configToml, /provider\s*=\s*"hcaptcha"/);
});

test('follow-up lint migration aligns bill_items COALESCE types to text and removes shadowed loop vars', () => {
  const fixPath = path.join(ROOT, 'supabase/migrations/20261114102000_fix_record_vehicle_bill_coalesce_and_lint.sql');
  assert.ok(fs.existsSync(fixPath), 'Missing 20261114102000_fix_record_vehicle_bill_coalesce_and_lint.sql');
  const sql = fs.readFileSync(fixPath, 'utf8');
  assert.match(sql, /COALESCE\(\s*NULLIF\(p_item->>'pdi_status_initial',\s*''\)::public\.pdi_status::text,\s*v_vehicle\.pdi_status::text/i);
  assert.match(sql, /COALESCE\(\s*NULLIF\(p_item->>'status_initial',\s*''\)::public\.vehicle_status::text,\s*v_vehicle\.status::text/i);
  assert.doesNotMatch(sql, /^\s*(?:v_idx|i)\s+integer/m);
});

test('soft-delete migration preserves staff_profiles for 10-year audit, revokes sessions, and redacts Sales KPI revenue', () => {
  const migPath = path.join(ROOT, 'supabase/migrations/20261114223500_soft_delete_staff_and_sales_kpi_guard.sql');
  assert.ok(fs.existsSync(migPath), 'Missing 20261114223500_soft_delete_staff_and_sales_kpi_guard.sql');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /ALTER\s+TABLE\s+public\.staff_profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+archived_at/i);
  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.revoke_staff_sessions/i);
  assert.match(sql, /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.revoke_staff_sessions[\s\S]*?GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.revoke_staff_sessions[\s\S]*?TO\s+service_role/i);

  const deleteMatch = sql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.delete_staff_profile[\s\S]*?GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.delete_staff_profile/i);
  assert.ok(deleteMatch, 'Missing updated delete_staff_profile RPC');
  assert.match(deleteMatch[0], /status\s*=\s*'archived'/i);
  assert.doesNotMatch(deleteMatch[0], /DELETE\s+FROM\s+public\.staff_profiles/i);
  assert.doesNotMatch(deleteMatch[0], /DELETE\s+FROM\s+auth\.users/i);

  const kpiMatch = sql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.get_dashboard_sales_summary[\s\S]*?GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_dashboard_sales_summary/i);
  assert.ok(kpiMatch, 'Missing hardened get_dashboard_sales_summary RPC');
  assert.match(kpiMatch[0], /has_permission\('canViewFinancials'\)/i);
  assert.match(kpiMatch[0], /'vehicle_sales_revenue_usd',\s*CASE\s+WHEN\s+v_can_view_financials/i);
  assert.match(kpiMatch[0], /'monthly_installment_collected_usd',\s*CASE\s+WHEN\s+v_can_view_financials/i);
});

