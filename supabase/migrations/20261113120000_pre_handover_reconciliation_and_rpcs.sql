-- ==============================================================================
-- Migration: 20261113120000_pre_handover_reconciliation_and_rpcs.sql
-- Purpose: Pre-handover security, concurrency, RBAC, and DB hygiene hardening:
--   1. Move pg_trgm extension into dedicated `extensions` schema (N-01)
--   2. Add 6 covering FK B-tree indexes flagged by database advisor (N-01)
--   3. Align staff_roles (`sales` canViewFinancials=false; deactivate legacy roles) (H-04)
--   4. Allow NULL bill_items.vehicle_vin for legacy monthly installment receipts + backfill orphans (B-02)
--   5. Reconcile ALL live RLS policies into versioned migration & close client bypasses (B-01, B-02, H-01)
--   6. Harden server-side RPC boundaries & pricing (B-01..B-03, H-02, H-03)
-- ==============================================================================

-- 1. Move pg_trgm out of public schema cleanly before explicit transaction block
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END $$;

BEGIN;

-- 2. Covering Foreign Key Indexes (N-01)
CREATE INDEX IF NOT EXISTS idx_bill_items_vehicle_vin
  ON public.bill_items (vehicle_vin);

CREATE INDEX IF NOT EXISTS idx_bill_void_logs_voided_by
  ON public.bill_void_logs (voided_by);

CREATE INDEX IF NOT EXISTS idx_bills_customer_id
  ON public.bills (customer_id);

CREATE INDEX IF NOT EXISTS idx_document_issuance_logs_issued_by_id
  ON public.document_issuance_logs (issued_by_id);

CREATE INDEX IF NOT EXISTS idx_service_appointments_customer_id
  ON public.service_appointments (customer_id);

CREATE INDEX IF NOT EXISTS idx_test_drives_customer_id
  ON public.test_drives (customer_id);

-- 3. Align staff_roles & check active legacy accounts (H-04, B-01)
DO $$
DECLARE
  v_legacy_active text;
BEGIN
  SELECT string_agg(email || ' (' || role::text || ')', ', ')
  INTO v_legacy_active
  FROM public.staff_profiles
  WHERE status = 'active'
    AND role::text NOT IN ('super_admin', 'admin', 'sales');

  IF v_legacy_active IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot disable legacy roles while active staff accounts hold them: %. Reassign these accounts to admin or sales first.', v_legacy_active;
  END IF;
END $$;

INSERT INTO public.staff_roles (
  role_code, display_name_lo, display_name_en, display_name_th,
  description, permissions, sort_order, is_active
) VALUES
  ('super_admin', 'ຜູ້ດູແລລະບົບສູງສຸດ', 'Super Admin', 'ผู้ดูแลระบบสูงสุด', 'Full administrative control', '{"canManageUsers":true,"canDeleteUsers":true,"canGrantRoles":true,"canEditInventory":true,"canUploadQR":true,"canAddModels":true,"canDeductPOS":true,"canViewFinancials":true,"canUpdatePDI":true,"canViewVehicles":true}'::jsonb, 1, TRUE),
  ('admin', 'ຜູ້ດູແລລະບົບ (Admin)', 'Admin', 'ผู้ดูแลระบบ (Admin)', 'System administrator', '{"canManageUsers":true,"canDeleteUsers":true,"canGrantRoles":true,"canEditInventory":true,"canUploadQR":true,"canAddModels":true,"canDeductPOS":true,"canViewFinancials":true,"canUpdatePDI":true,"canViewVehicles":true}'::jsonb, 2, TRUE),
  ('sales', 'ຝ່າຍຂາຍ (Sales)', 'Sales Executive', 'ฝ่ายขาย (Sales)', 'POS sales and customer CRM', '{"canManageUsers":false,"canDeleteUsers":false,"canGrantRoles":false,"canEditInventory":false,"canUploadQR":false,"canAddModels":false,"canDeductPOS":true,"canViewFinancials":false,"canUpdatePDI":false,"canViewVehicles":true}'::jsonb, 3, TRUE),
  ('technician', 'ຊ່າງເຕັກນິກ (Technician)', 'Technician / PDI', 'ช่างเทคนิค (Technician)', 'Retired role', '{"canManageUsers":false,"canDeleteUsers":false,"canGrantRoles":false,"canEditInventory":false,"canUploadQR":false,"canAddModels":false,"canDeductPOS":false,"canViewFinancials":false,"canUpdatePDI":false,"canViewVehicles":false}'::jsonb, 4, FALSE),
  ('general_user', 'ຜູ້ໃຊ້ທົ່ວໄປ (User)', 'General User', 'ผู้ใช้ทั่วไป (User)', 'Dormant suspended signup fallback', '{"canManageUsers":false,"canDeleteUsers":false,"canGrantRoles":false,"canEditInventory":false,"canUploadQR":false,"canAddModels":false,"canDeductPOS":false,"canViewFinancials":false,"canUpdatePDI":false,"canViewVehicles":false}'::jsonb, 5, FALSE)
ON CONFLICT (role_code) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Explicitly clarify archived status on retired roles while keeping dormant FK row safe
UPDATE public.staff_roles
SET is_active = FALSE,
    permissions = '{"canManageUsers":false,"canDeleteUsers":false,"canGrantRoles":false,"canEditInventory":false,"canUploadQR":false,"canAddModels":false,"canDeductPOS":false,"canViewFinancials":false,"canUpdatePDI":false,"canViewVehicles":false}'::jsonb
WHERE role_code IN ('technician', 'general_user');

-- 4. Allow NULL vehicle_vin on monthly installment receipt items & backfill orphan contracts
ALTER TABLE public.bill_items
  ALTER COLUMN vehicle_vin DROP NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.bill_items_archive') IS NOT NULL THEN
    ALTER TABLE public.bill_items_archive
      ALTER COLUMN vehicle_vin DROP NOT NULL;
  END IF;
END $$;

-- Link any financed/installment bill lacking customer_id to a matching or newly created customer row
DO $$
DECLARE
  v_bill record;
  v_cust_id uuid;
  v_norm_phone text;
BEGIN
  FOR v_bill IN
    SELECT *
    FROM public.bills
    WHERE customer_id IS NULL
      AND COALESCE(status::text, 'completed') <> 'voided'
      AND (
        type::text = 'installment'
        OR payment_method IN ('finance', 'installment')
        OR COALESCE(installment_period, 0) >= 1
      )
    ORDER BY created_at ASC NULLS LAST
  LOOP
    v_norm_phone := pg_catalog.regexp_replace(COALESCE(v_bill.customer_phone, ''), '[^0-9]', '', 'g');
    v_cust_id := NULL;

    IF length(v_norm_phone) >= 6 THEN
      SELECT id INTO v_cust_id
      FROM public.customers
      WHERE pg_catalog.regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_norm_phone
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    IF v_cust_id IS NULL THEN
      INSERT INTO public.customers (
        name, phone, id_card_number, province, category, source, status, priority,
        payment_type, payment_type_confirmed, installment_status,
        down_payment_percent, down_payment_usd, tenure_months, monthly_payment_lak,
        finance_company, payment_receipt_no, payment_date,
        assigned_to, notes
      ) VALUES (
        COALESCE(NULLIF(btrim(v_bill.customer_name), ''), 'ລູກຄ້າຜ່ອນ'),
        COALESCE(NULLIF(btrim(v_bill.customer_phone), ''), 'N/A'),
        v_bill.customer_id_card,
        COALESCE(v_bill.customer_province, 'ນະຄອນຫຼວງວຽງຈັນ'),
        'walk_in',
        'POS Installment',
        'delivered',
        'high',
        'installment',
        'down_payment',
        'active_repaying',
        COALESCE(v_bill.down_payment_percent, 30),
        COALESCE(v_bill.down_payment_usd, 0),
        COALESCE(v_bill.tenure_months, 48),
        COALESCE(v_bill.monthly_payment_lak, 0),
        COALESCE(v_bill.finance_company, 'AVATR Leasing'),
        v_bill.bill_number,
        v_bill.bill_date::text,
        COALESCE(v_bill.sales_rep, v_bill.recorded_by),
        'Backfilled customer record from bill ' || COALESCE(v_bill.bill_number, v_bill.id::text)
      )
      RETURNING id INTO v_cust_id;
    END IF;

    UPDATE public.bills
    SET customer_id = v_cust_id
    WHERE id = v_bill.id;
  END LOOP;
END $$;

-- 5. Helpers: currency exchange rate + deterministic installment schedule generator
CREATE OR REPLACE FUNCTION public._get_lak_exchange_rate()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT NULLIF((elem->>'rateToUSD')::numeric, 0)
      FROM public.dealership_settings ds,
           LATERAL jsonb_array_elements(
             CASE
               WHEN pg_catalog.jsonb_typeof(ds.config->'currencies') = 'array'
                 THEN ds.config->'currencies'
               ELSE '[]'::jsonb
             END
           ) AS elem
      WHERE ds.id = true
        AND UPPER(COALESCE(elem->>'code', '')) = 'LAK'
        AND COALESCE(elem->>'rateToUSD', '') ~ '^[0-9]+(\.[0-9]+)?$'
        AND (elem->>'rateToUSD')::numeric > 0
      LIMIT 1
    ),
    22000
  );
$$;

REVOKE ALL ON FUNCTION public._get_lak_exchange_rate() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._get_lak_exchange_rate() TO postgres;

CREATE OR REPLACE FUNCTION public._build_default_installment_schedule(
  p_base_date timestamptz,
  p_vehicle_price_usd numeric,
  p_down_payment_percent numeric,
  p_down_payment_usd numeric,
  p_tenure_months integer,
  p_exchange_rate numeric DEFAULT NULL,
  p_annual_interest_rate numeric DEFAULT 0.075
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_tenure integer := GREATEST(1, LEAST(COALESCE(p_tenure_months, 48), 120));
  v_dp_pct numeric := COALESCE(p_down_payment_percent, 30);
  v_price numeric := GREATEST(0, COALESCE(p_vehicle_price_usd, 45000));
  v_dp_usd numeric := COALESCE(p_down_payment_usd, pg_catalog.round(v_price * (v_dp_pct / 100.0)));
  v_principal numeric := GREATEST(0, v_price - v_dp_usd);
  v_total_interest numeric := pg_catalog.round(v_principal * p_annual_interest_rate * (v_tenure::numeric / 12.0));
  v_monthly_usd numeric := pg_catalog.round((v_principal + v_total_interest) / v_tenure::numeric);
  v_monthly_principal numeric := pg_catalog.round(v_principal / v_tenure::numeric);
  v_monthly_interest numeric := GREATEST(0, v_monthly_usd - v_monthly_principal);
  v_rate numeric := COALESCE(NULLIF(p_exchange_rate, 0), public._get_lak_exchange_rate());
  v_monthly_lak numeric := pg_catalog.round(v_monthly_usd * v_rate);
  v_base date := COALESCE((p_base_date AT TIME ZONE 'Asia/Vientiane')::date, CURRENT_DATE);
  v_today date := (now() AT TIME ZONE 'Asia/Vientiane')::date;
  v_schedule jsonb := '[]'::jsonb;
  v_due date;
  v_status text;
  i integer;
BEGIN
  FOR i IN 1..v_tenure LOOP
    -- Target day 10 of i-th month ahead (matches JS setMonth(+i); setDate(10))
    v_due := (date_trunc('month', v_base)::date + make_interval(months => i) + interval '9 days')::date;
    v_status := CASE WHEN v_due < v_today THEN 'due' ELSE 'pending' END;

    v_schedule := v_schedule || jsonb_build_array(jsonb_build_object(
      'period', i,
      'dueDate', to_char(v_due, 'YYYY-MM-DD'),
      'amountUSD', v_monthly_usd,
      'amountLAK', v_monthly_lak,
      'principalUSD', v_monthly_principal,
      'interestUSD', v_monthly_interest,
      'status', v_status,
      'notes', CASE WHEN i = 1 THEN 'ງວດທີ 1 ຫຼັງຮັບລົດ' ELSE NULL END
    ));
  END LOOP;

  RETURN v_schedule;
END;
$$;

REVOKE ALL ON FUNCTION public._build_default_installment_schedule(timestamptz, numeric, numeric, numeric, integer, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._build_default_installment_schedule(timestamptz, numeric, numeric, numeric, integer, numeric, numeric) TO postgres;

-- Materialize schedule for existing financed customers whose installment_records is empty
UPDATE public.customers c
SET installment_records = public._build_default_installment_schedule(
  COALESCE(c.created_at, now()),
  COALESCE(
    NULLIF(c.list_price_usd, 0) - COALESCE(c.discount_usd, 0),
    (SELECT NULLIF(b.total_usd, 0) FROM public.bills b WHERE b.customer_id = c.id AND COALESCE(b.status::text, 'completed') <> 'voided' AND COALESCE(b.installment_period, 0) = 0 ORDER BY b.created_at ASC LIMIT 1),
    (SELECT NULLIF(vm.price_starting_usd, 0) FROM public.vehicle_models vm WHERE vm.id = c.interested_model_id LIMIT 1),
    45000
  ),
  c.down_payment_percent,
  c.down_payment_usd,
  c.tenure_months
)
WHERE (c.payment_type IN ('installment', 'finance') OR c.payment_type_confirmed IN ('down_payment', 'installment_completed'))
  AND COALESCE(jsonb_array_length(c.installment_records), 0) = 0;

-- 6. Reconciled & Hardened RLS Policies across ALL tables & archives (H-01, B-01, B-02)

-- public.vehicles (no sales direct INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "vehicles_read" ON public.vehicles;
CREATE POLICY "vehicles_read" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.is_active_staff());

DROP POLICY IF EXISTS "vehicles_insert" ON public.vehicles;
CREATE POLICY "vehicles_insert" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff() AND public.has_permission('canEditInventory'));

DROP POLICY IF EXISTS "vehicles_update" ON public.vehicles;
CREATE POLICY "vehicles_update" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (public.is_active_staff() AND public.has_permission('canEditInventory'))
  WITH CHECK (public.is_active_staff() AND public.has_permission('canEditInventory'));

DROP POLICY IF EXISTS "vehicles_delete" ON public.vehicles;
CREATE POLICY "vehicles_delete" ON public.vehicles
  FOR DELETE TO authenticated
  USING (public.is_active_staff() AND public.has_permission('canEditInventory'));

-- public.bills (sales reads only own bills or assigned customers' bills; all writes go through SECURITY DEFINER RPCs or admin)
DROP POLICY IF EXISTS "bills_read" ON public.bills;
CREATE POLICY "bills_read" ON public.bills
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND (
      public.has_permission('canViewFinancials')
      OR sales_rep = (SELECT auth.uid())
      OR recorded_by = (SELECT auth.uid())
      OR (type::text = 'import' AND public.has_permission('canEditInventory'))
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id = bills.customer_id
          AND c.assigned_to = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "bills_insert" ON public.bills;
CREATE POLICY "bills_insert" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

DROP POLICY IF EXISTS "bills_update" ON public.bills;
CREATE POLICY "bills_update" ON public.bills
  FOR UPDATE TO authenticated
  USING (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()))
  WITH CHECK (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

DROP POLICY IF EXISTS "bills_delete_admin" ON public.bills;
DROP POLICY IF EXISTS "bills_delete" ON public.bills;
CREATE POLICY "bills_delete" ON public.bills
  FOR DELETE TO authenticated
  USING (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

-- public.bill_items
DROP POLICY IF EXISTS "bill_items_read" ON public.bill_items;
CREATE POLICY "bill_items_read" ON public.bill_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_items.bill_id)
  );

DROP POLICY IF EXISTS "bill_items_insert" ON public.bill_items;
CREATE POLICY "bill_items_insert" ON public.bill_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

DROP POLICY IF EXISTS "bill_items_update" ON public.bill_items;
CREATE POLICY "bill_items_update" ON public.bill_items
  FOR UPDATE TO authenticated
  USING (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()))
  WITH CHECK (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

DROP POLICY IF EXISTS "bill_items_delete" ON public.bill_items;
CREATE POLICY "bill_items_delete" ON public.bill_items
  FOR DELETE TO authenticated
  USING (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

-- public.stock_movements
DROP POLICY IF EXISTS "stock_movements_read" ON public.stock_movements;
CREATE POLICY "stock_movements_read" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (public.is_active_staff() AND public.has_permission('canViewVehicles'));

DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;
CREATE POLICY "stock_movements_insert" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

-- public.customers (sales reads all CRM leads collaboratively, writes exclusively via validated RPCs)
DROP POLICY IF EXISTS "customers_read" ON public.customers;
CREATE POLICY "customers_read" ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_active_staff());

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()))
  WITH CHECK (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

DROP POLICY IF EXISTS "customers_delete_admin" ON public.customers;
CREATE POLICY "customers_delete_admin" ON public.customers
  FOR DELETE TO authenticated
  USING (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

-- public.dealership_settings
DROP POLICY IF EXISTS "dealership_settings_read" ON public.dealership_settings;
CREATE POLICY "dealership_settings_read" ON public.dealership_settings
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND (
      public.has_permission('canDeductPOS')
      OR public.has_permission('canViewFinancials')
      OR public.has_permission('canManageUsers')
    )
  );

DROP POLICY IF EXISTS "dealership_settings_insert" ON public.dealership_settings;
CREATE POLICY "dealership_settings_insert" ON public.dealership_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_staff()
    AND (public.has_permission('canManageUsers') OR public.has_permission('canUploadQR'))
  );

DROP POLICY IF EXISTS "dealership_settings_update" ON public.dealership_settings;
CREATE POLICY "dealership_settings_update" ON public.dealership_settings
  FOR UPDATE TO authenticated
  USING (
    public.is_active_staff()
    AND (public.has_permission('canManageUsers') OR public.has_permission('canUploadQR'))
  )
  WITH CHECK (
    public.is_active_staff()
    AND (public.has_permission('canManageUsers') OR public.has_permission('canUploadQR'))
  );

-- public.staff_profiles (strict self/admin PII read) + public.get_staff_directory (non-PII active roster for assignee lookups)
DROP POLICY IF EXISTS "staff_profiles_read" ON public.staff_profiles;
CREATE POLICY "staff_profiles_read" ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.has_permission('canManageUsers'));

CREATE OR REPLACE FUNCTION public.get_staff_directory()
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  role_title text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  SELECT
    sp.id,
    sp.name,
    sp.role::text AS role,
    sp.role_title,
    sp.status::text AS status
  FROM public.staff_profiles sp
  WHERE public.is_active_staff()
  ORDER BY sp.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_staff_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_directory() TO authenticated;

-- public.vehicle_models
DROP POLICY IF EXISTS "vehicle_models_read" ON public.vehicle_models;
CREATE POLICY "vehicle_models_read" ON public.vehicle_models
  FOR SELECT TO authenticated
  USING (public.is_active_staff());

DROP POLICY IF EXISTS "vehicle_models_insert" ON public.vehicle_models;
CREATE POLICY "vehicle_models_insert" ON public.vehicle_models
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff() AND public.has_permission('canAddModels'));

DROP POLICY IF EXISTS "vehicle_models_update" ON public.vehicle_models;
CREATE POLICY "vehicle_models_update" ON public.vehicle_models
  FOR UPDATE TO authenticated
  USING (public.is_active_staff() AND (public.has_permission('canEditInventory') OR public.has_permission('canAddModels')))
  WITH CHECK (public.is_active_staff() AND (public.has_permission('canEditInventory') OR public.has_permission('canAddModels')));

DROP POLICY IF EXISTS "vehicle_models_delete_admin" ON public.vehicle_models;
CREATE POLICY "vehicle_models_delete_admin" ON public.vehicle_models
  FOR DELETE TO authenticated
  USING (public.is_active_staff() AND (public.is_admin() OR public.is_super_admin()));

-- Archive parent & existing partitions RLS aligned with bills_read
DROP POLICY IF EXISTS "bills_archive_select" ON public.bills_archive;
CREATE POLICY "bills_archive_select" ON public.bills_archive
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND (
      public.has_permission('canViewFinancials')
      OR sales_rep = (SELECT auth.uid())
      OR recorded_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "bill_items_archive_select" ON public.bill_items_archive;
CREATE POLICY "bill_items_archive_select" ON public.bill_items_archive
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills_archive ba
      WHERE ba.id = bill_items_archive.bill_id
        AND ba.fiscal_year = bill_items_archive.fiscal_year
    )
  );

DO $$
DECLARE
  v_part text;
  v_parts text[] := ARRAY['2023','2024','2025','2026','2027','default'];
BEGIN
  FOREACH v_part IN ARRAY v_parts LOOP
    IF to_regclass('public.bills_archive_' || v_part) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', 'bills_archive_' || v_part);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'bills_archive_' || v_part || '_select', 'bills_archive_' || v_part);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff() AND (public.has_permission(''canViewFinancials'') OR sales_rep = (SELECT auth.uid()) OR recorded_by = (SELECT auth.uid())));',
        'bills_archive_' || v_part || '_select',
        'bills_archive_' || v_part
      );
    END IF;
    IF to_regclass('public.bill_items_archive_' || v_part) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', 'bill_items_archive_' || v_part);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'bill_items_archive_' || v_part || '_select', 'bill_items_archive_' || v_part);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bills_archive ba WHERE ba.id = %I.bill_id AND ba.fiscal_year = %I.fiscal_year AND (public.has_permission(''canViewFinancials'') OR ba.sales_rep = (SELECT auth.uid()) OR ba.recorded_by = (SELECT auth.uid()))));',
        'bill_items_archive_' || v_part || '_select',
        'bill_items_archive_' || v_part,
        'bill_items_archive_' || v_part,
        'bill_items_archive_' || v_part
      );
    END IF;
  END LOOP;
END $$;

-- 7. Update archive_fiscal_year_bills dynamic partition policy to match bills_read
CREATE OR REPLACE FUNCTION public.archive_fiscal_year_bills(p_year integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_archived_count integer := 0;
  v_items_count integer := 0;
  v_current_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
  v_bills_part text;
  v_items_part text;
BEGIN
  IF NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can archive fiscal year bills.';
  END IF;

  IF p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'Invalid fiscal year: %', p_year;
  END IF;

  IF p_year >= v_current_year THEN
    RAISE EXCEPTION 'Cannot archive current or future fiscal year (%). Only closed fiscal years can be archived.', p_year;
  END IF;

  v_bills_part := format('bills_archive_%s', p_year);
  v_items_part := format('bill_items_archive_%s', p_year);

  EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.bills_archive FOR VALUES IN (%s);', v_bills_part, p_year);
  EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.bill_items_archive FOR VALUES IN (%s);', v_items_part, p_year);

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_bills_part);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', v_bills_part || '_select', v_bills_part);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff() AND (public.has_permission(''canViewFinancials'') OR sales_rep = (SELECT auth.uid()) OR recorded_by = (SELECT auth.uid())));',
    v_bills_part || '_select',
    v_bills_part
  );

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_items_part);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', v_items_part || '_select', v_items_part);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bills_archive ba WHERE ba.id = %I.bill_id AND ba.fiscal_year = %I.fiscal_year AND (public.has_permission(''canViewFinancials'') OR ba.sales_rep = (SELECT auth.uid()) OR ba.recorded_by = (SELECT auth.uid()))));',
    v_items_part || '_select',
    v_items_part,
    v_items_part,
    v_items_part
  );

  INSERT INTO public.bill_items_archive (
    id, bill_id, line_number, vehicle_vin, model_name, trim, plate_number, color,
    interior_color, battery, unit_price_usd, unit_price_lak, discount_usd, discount_lak,
    pdi_status_initial, status_initial, inspector_name, event_campaign, event_start_date,
    event_end_date, event_location, engine_number, created_at, archived_at, fiscal_year
  )
  SELECT
    bi.id, bi.bill_id, bi.line_number, bi.vehicle_vin, bi.model_name, bi.trim, bi.plate_number, bi.color,
    bi.interior_color, bi.battery, bi.unit_price_usd, bi.unit_price_lak, bi.discount_usd, bi.discount_lak,
    bi.pdi_status_initial, bi.status_initial, bi.inspector_name, bi.event_campaign, bi.event_start_date,
    bi.event_end_date, bi.event_location, bi.engine_number, COALESCE(b.created_at, now()), now(), p_year
  FROM public.bill_items bi
  JOIN public.bills b ON b.id = bi.bill_id
  WHERE (b.bill_date::text LIKE (p_year::text || '%') OR (b.bill_date IS NULL AND EXTRACT(YEAR FROM b.created_at) = p_year))
  ON CONFLICT (id, fiscal_year) DO NOTHING;

  GET DIAGNOSTICS v_items_count = ROW_COUNT;

  INSERT INTO public.bills_archive (
    id, bill_number, type, status, bill_date, customer_id, customer_name, customer_phone,
    customer_id_card, customer_address, customer_province, sales_rep, recorded_by,
    payment_method, qr_used, bank_name, transfer_ref, finance_company, down_payment_percent,
    down_payment_usd, tenure_months, monthly_payment_lak, free_gifts, warranty_terms,
    supplier_name, customs_doc_number, import_entry_port, destination_warehouse,
    total_usd, total_lak, payment_slip_path, notes, created_at, updated_at,
    installment_period, warranty_start_date, warranty_expiry_date, warranty_years,
    warranty_distance_km, current_mileage_km, battery_health_soh, after_sales_notes,
    archived_at, fiscal_year
  )
  SELECT
    b.id, b.bill_number, b.type::text, COALESCE(b.status::text, 'completed'), b.bill_date::text, b.customer_id, b.customer_name, b.customer_phone,
    b.customer_id_card, b.customer_address, b.customer_province, b.sales_rep, b.recorded_by,
    b.payment_method, b.qr_used, b.bank_name, b.transfer_ref, b.finance_company, b.down_payment_percent,
    b.down_payment_usd, b.tenure_months, b.monthly_payment_lak, b.free_gifts, b.warranty_terms,
    b.supplier_name, b.customs_doc_number, b.import_entry_port, b.destination_warehouse,
    b.total_usd, b.total_lak, b.payment_slip_path, b.notes, b.created_at, b.updated_at,
    b.installment_period, b.warranty_start_date, b.warranty_expiry_date, b.warranty_years,
    b.warranty_distance_km, b.current_mileage_km, b.battery_health_soh, b.after_sales_notes,
    now(), p_year
  FROM public.bills b
  WHERE (b.bill_date::text LIKE (p_year::text || '%') OR (b.bill_date IS NULL AND EXTRACT(YEAR FROM b.created_at) = p_year))
  ON CONFLICT (id, fiscal_year) DO NOTHING;

  WITH deleted AS (
    DELETE FROM public.bills b
    WHERE (b.bill_date::text LIKE (p_year::text || '%') OR (b.bill_date IS NULL AND EXTRACT(YEAR FROM b.created_at) = p_year))
    RETURNING 1
  )
  SELECT count(*) INTO v_archived_count FROM deleted;

  RETURN jsonb_build_object(
    'success', true,
    'fiscal_year', p_year,
    'archived_bills_count', v_archived_count,
    'archived_items_count', v_items_count,
    'archived_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_fiscal_year_bills(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_fiscal_year_bills(integer) TO authenticated;

-- 8. Harden generate_next_bill_number (H-02 + archive check)
CREATE OR REPLACE FUNCTION public.generate_next_bill_number(p_prefix TEXT DEFAULT 'INV')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_year TEXT;
  v_seq BIGINT;
  v_result TEXT;
  v_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.is_active_staff(), false) THEN
    RAISE EXCEPTION 'Unauthorized: active staff authentication required.';
  END IF;

  IF p_prefix NOT IN ('INV', 'GRN', 'INS') THEN
    RAISE EXCEPTION 'Invalid bill prefix: %. Allowed: INV, GRN, INS', p_prefix;
  END IF;

  v_year := to_char((now() AT TIME ZONE 'Asia/Vientiane')::date, 'YYYY');
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_prefix || '-' || v_year));

  IF to_regclass('public.bills_archive') IS NOT NULL THEN
    SELECT GREATEST(
      COALESCE((
        SELECT MAX(substring(bill_number FROM '-(\d+)$')::bigint)
        FROM public.bills
        WHERE bill_number ~ ('^' || p_prefix || '-' || v_year || '-\d+$')
      ), 0),
      COALESCE((
        SELECT MAX(substring(bill_number FROM '-(\d+)$')::bigint)
        FROM public.bills_archive
        WHERE bill_number ~ ('^' || p_prefix || '-' || v_year || '-\d+$')
      ), 0)
    ) + 1
    INTO v_seq;
  ELSE
    SELECT COALESCE(
      MAX(substring(bill_number FROM '-(\d+)$')::bigint),
      0
    ) + 1
    INTO v_seq
    FROM public.bills
    WHERE bill_number ~ ('^' || p_prefix || '-' || v_year || '-\d+$');
  END IF;

  LOOP
    v_result := p_prefix || '-' || v_year || '-' || lpad(v_seq::text, 5, '0');
    SELECT (
      EXISTS(SELECT 1 FROM public.bills WHERE bill_number = v_result)
      OR (to_regclass('public.bills_archive') IS NOT NULL AND EXISTS(SELECT 1 FROM public.bills_archive WHERE bill_number = v_result))
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_seq := v_seq + 1;
  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_bill_number(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_next_bill_number(TEXT) TO authenticated;

-- 9. Hardened record_vehicle_bill: server-computed pricing, parity stock_in fields, FOR UPDATE vehicle lock FIRST (B-01, B-03, H-03)
CREATE OR REPLACE FUNCTION public.record_vehicle_bill(
  p_bill jsonb,
  p_item jsonb,
  p_movement_type text,
  p_vehicle jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_bill_id uuid;
  v_vin text;
  v_customer_id uuid;
  v_vehicle public.vehicles%ROWTYPE;
  v_phone text;
  v_name text;
  v_province text;
  v_id_card text;
  v_address text;
  v_sales_rep uuid;
  v_unit_price_usd numeric := 0;
  v_unit_price_lak numeric := 0;
  v_discount_usd numeric := 0;
  v_discount_lak numeric := 0;
  v_net_total_usd numeric := 0;
  v_net_total_lak numeric := 0;
  v_raw_discount numeric;
  v_fallback_rate numeric := public._get_lak_exchange_rate();
BEGIN
  v_caller_id := (SELECT auth.uid());
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  SELECT role::text INTO v_caller_role
  FROM public.staff_profiles
  WHERE id = v_caller_id AND status = 'active';

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an active staff member.';
  END IF;

  IF p_movement_type = 'stock_in' THEN
    IF v_caller_role NOT IN ('super_admin', 'admin') THEN
      RAISE EXCEPTION 'Permission denied: Only admin or super_admin can record stock-in.';
    END IF;
    IF COALESCE(p_bill->>'type', '') <> 'import' THEN
      RAISE EXCEPTION 'Invalid bill type: stock_in movements require bill type "import".';
    END IF;
  ELSIF p_movement_type = 'stock_out' THEN
    IF v_caller_role NOT IN ('super_admin', 'admin', 'sales') THEN
      RAISE EXCEPTION 'Permission denied: Only sales or admin can record stock-out.';
    END IF;
    IF COALESCE(p_bill->>'type', '') <> 'sale' THEN
      RAISE EXCEPTION 'Invalid bill type: stock_out movements require bill type "sale".';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid movement_type: %, must be stock_in or stock_out.', p_movement_type;
  END IF;

  v_bill_id := NULLIF(p_bill->>'id', '')::uuid;
  v_vin := NULLIF(btrim(COALESCE(p_item->>'vehicle_vin', p_vehicle->>'vin', '')), '');

  IF v_bill_id IS NULL OR NULLIF(btrim(COALESCE(p_bill->>'bill_number', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Bill ID and bill number are required.';
  END IF;

  IF v_vin IS NULL THEN
    RAISE EXCEPTION 'Vehicle VIN is required.';
  END IF;

  -- Lock vehicle row FIRST on stock_out and compute authoritative pricing BEFORE writing any financial tables
  IF p_movement_type = 'stock_out' THEN
    SELECT * INTO v_vehicle
    FROM public.vehicles
    WHERE vin = v_vin
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vehicle with VIN % not found in inventory.', v_vin;
    END IF;

    IF v_vehicle.status::text NOT IN ('ready', 'showroom', 'event', 'promotion', 'reserved') THEN
      RAISE EXCEPTION 'Vehicle VIN % has status "%" and cannot be sold.', v_vin, v_vehicle.status::text;
    END IF;

    IF COALESCE(v_vehicle.pdi_status::text, '') <> 'passed' THEN
      RAISE EXCEPTION 'Vehicle VIN % has not passed PDI inspection and cannot be sold.', v_vin;
    END IF;

    IF v_vehicle.reserved_for_customer IS NOT NULL THEN
      IF NULLIF(p_bill->>'customer_id', '')::uuid IS DISTINCT FROM v_vehicle.reserved_for_customer
         AND NOT (
           NULLIF(p_bill->>'customer_id', '') IS NULL
           AND NULLIF(btrim(COALESCE(p_bill->>'customer_phone', p_bill->>'phone', '')), '') IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM public.customers rc
             WHERE rc.id = v_vehicle.reserved_for_customer
               AND rc.phone = NULLIF(btrim(COALESCE(p_bill->>'customer_phone', p_bill->>'phone', '')), '')
           )
         ) THEN
        RAISE EXCEPTION 'Vehicle VIN % is currently reserved for another customer.', v_vin;
      END IF;
    END IF;

    v_unit_price_usd := GREATEST(COALESCE(v_vehicle.price_usd, 0), 0);
    v_unit_price_lak := GREATEST(COALESCE(v_vehicle.price_lak, 0), 0);
    IF v_unit_price_lak = 0 AND v_unit_price_usd > 0 THEN
      v_unit_price_lak := pg_catalog.round(v_unit_price_usd * v_fallback_rate);
    END IF;

    IF v_caller_role IN ('super_admin', 'admin') THEN
      IF NULLIF(btrim(COALESCE(p_item->>'discount_usd', '')), '') IS NOT NULL THEN
        v_raw_discount := (p_item->>'discount_usd')::numeric;
        IF v_raw_discount < 0 OR v_raw_discount > v_unit_price_usd THEN
          RAISE EXCEPTION 'Invalid discount: must be between 0 and vehicle price (%).', v_unit_price_usd;
        END IF;
        v_discount_usd := v_raw_discount;
      ELSE
        v_discount_usd := LEAST(GREATEST(COALESCE(v_vehicle.promotion_discount_usd, 0), 0), v_unit_price_usd);
      END IF;
    ELSE
      -- Sales uses strictly DB-configured promotion_discount_usd
      v_discount_usd := LEAST(GREATEST(COALESCE(v_vehicle.promotion_discount_usd, 0), 0), v_unit_price_usd);
    END IF;

    v_net_total_usd := GREATEST(0, v_unit_price_usd - v_discount_usd);
    IF v_unit_price_usd > 0 THEN
      v_discount_lak := pg_catalog.round(v_unit_price_lak * (v_discount_usd / v_unit_price_usd));
      v_net_total_lak := GREATEST(0, v_unit_price_lak - v_discount_lak);
    ELSE
      v_discount_lak := pg_catalog.round(v_discount_usd * v_fallback_rate);
      v_net_total_lak := GREATEST(0, v_unit_price_lak - v_discount_lak);
    END IF;

    IF v_caller_role IN ('super_admin', 'admin') THEN
      v_sales_rep := COALESCE(NULLIF(p_bill->>'sales_rep', '')::uuid, v_caller_id);
    ELSE
      v_sales_rep := v_caller_id;
    END IF;
  ELSE
    -- stock_in authoritative prices come from p_vehicle / p_item (>= 0)
    v_unit_price_usd := GREATEST(COALESCE(NULLIF(p_vehicle->>'price_usd', '')::numeric, NULLIF(p_item->>'unit_price_usd', '')::numeric, 0), 0);
    v_unit_price_lak := GREATEST(COALESCE(NULLIF(p_vehicle->>'price_lak', '')::numeric, NULLIF(p_item->>'unit_price_lak', '')::numeric, 0), 0);
    IF v_unit_price_lak = 0 AND v_unit_price_usd > 0 THEN
      v_unit_price_lak := pg_catalog.round(v_unit_price_usd * v_fallback_rate);
    END IF;
    v_discount_usd := 0;
    v_discount_lak := 0;
    v_net_total_usd := v_unit_price_usd;
    v_net_total_lak := v_unit_price_lak;
    v_sales_rep := v_caller_id;
  END IF;

  v_phone := NULLIF(btrim(COALESCE(p_bill->>'customer_phone', p_bill->>'phone', '')), '');
  v_name := NULLIF(btrim(COALESCE(p_bill->>'customer_name', '')), '');
  v_province := NULLIF(btrim(COALESCE(p_bill->>'customer_province', p_bill->>'province', '')), '');
  v_id_card := NULLIF(btrim(COALESCE(p_bill->>'customer_id_card', p_bill->>'id_card', '')), '');
  v_address := NULLIF(btrim(COALESCE(p_bill->>'customer_address', p_bill->>'address', '')), '');

  v_customer_id := NULLIF(p_bill->>'customer_id', '')::uuid;
  IF v_customer_id IS NULL AND (p_bill->>'type') = 'sale' AND v_phone IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_phone));

    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE phone = v_phone
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_customer_id IS NULL AND v_name IS NOT NULL THEN
      INSERT INTO public.customers (
        name, phone, province, id_card_number,
        category, source, status, priority, assigned_to, notes,
        list_price_usd, discount_usd, vin
      ) VALUES (
        v_name,
        v_phone,
        v_province,
        v_id_card,
        'walk_in',
        'POS sale',
        'delivered',
        'normal',
        v_sales_rep,
        NULLIF(btrim(COALESCE(p_bill->>'notes', '')), ''),
        v_unit_price_usd,
        v_discount_usd,
        v_vin
      )
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  IF p_movement_type = 'stock_in' THEN
    IF p_vehicle IS NULL THEN
      RAISE EXCEPTION 'Vehicle payload is required for stock-in.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.vehicles WHERE vin = v_vin AND status::text <> 'removed') THEN
      RAISE EXCEPTION 'Vehicle with VIN % already exists in inventory.', v_vin;
    END IF;

    INSERT INTO public.vehicles (
      vin, engine_number, front_motor_number, rear_motor_number, powertrain_type,
      model_id, plate_number, color, color_hex, interior_color,
      trim, battery, price_usd, price_lak, status, pdi_status,
      pdi_inspector, pdi_notes, location, image_url, reserved_for_customer,
      arrival_date, mileage_km, incoming_batch, expected_arrival_date, issue_note,
      event_campaign, event_start_date, event_end_date, event_location,
      promotion_discount_usd, promotion_notes, updated_at
    ) VALUES (
      v_vin,
      NULLIF(btrim(COALESCE(p_vehicle->>'engine_number', p_item->>'engine_number', '')), ''),
      NULLIF(btrim(COALESCE(p_vehicle->>'front_motor_number', '')), ''),
      NULLIF(btrim(COALESCE(p_vehicle->>'rear_motor_number', '')), ''),
      NULLIF(btrim(COALESCE(p_vehicle->>'powertrain_type', '')), ''),
      p_vehicle->>'model_id',
      p_vehicle->>'plate_number',
      p_vehicle->>'color',
      p_vehicle->>'color_hex',
      p_vehicle->>'interior_color',
      p_vehicle->>'trim',
      p_vehicle->>'battery',
      v_unit_price_usd,
      v_unit_price_lak,
      COALESCE(NULLIF(p_vehicle->>'status', '')::public.vehicle_status, 'ready'::public.vehicle_status),
      COALESCE(NULLIF(p_vehicle->>'pdi_status', '')::public.pdi_status, 'pending'::public.pdi_status),
      p_vehicle->>'pdi_inspector',
      p_vehicle->>'pdi_notes',
      p_vehicle->>'location',
      p_vehicle->>'image_url',
      CASE
        WHEN COALESCE(p_vehicle->>'reserved_for_customer', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (p_vehicle->>'reserved_for_customer')::uuid
        ELSE NULL
      END,
      COALESCE(NULLIF(p_vehicle->>'arrival_date', '')::date, CURRENT_DATE),
      COALESCE((p_vehicle->>'mileage_km')::integer, 0),
      NULLIF(btrim(COALESCE(p_vehicle->>'incoming_batch', '')), ''),
      NULLIF(btrim(COALESCE(p_vehicle->>'expected_arrival_date', '')), '')::date,
      NULLIF(btrim(COALESCE(p_vehicle->>'issue_note', '')), ''),
      p_vehicle->>'event_campaign',
      NULLIF(p_vehicle->>'event_start_date', '')::date,
      NULLIF(p_vehicle->>'event_end_date', '')::date,
      p_vehicle->>'event_location',
      COALESCE((p_vehicle->>'promotion_discount_usd')::numeric, 0),
      p_vehicle->>'promotion_notes',
      now()
    )
    ON CONFLICT (vin) DO UPDATE SET
      engine_number = EXCLUDED.engine_number,
      front_motor_number = EXCLUDED.front_motor_number,
      rear_motor_number = EXCLUDED.rear_motor_number,
      powertrain_type = EXCLUDED.powertrain_type,
      model_id = EXCLUDED.model_id,
      plate_number = EXCLUDED.plate_number,
      color = EXCLUDED.color,
      color_hex = EXCLUDED.color_hex,
      interior_color = EXCLUDED.interior_color,
      trim = EXCLUDED.trim,
      battery = EXCLUDED.battery,
      price_usd = EXCLUDED.price_usd,
      price_lak = EXCLUDED.price_lak,
      status = EXCLUDED.status,
      pdi_status = EXCLUDED.pdi_status,
      pdi_inspector = EXCLUDED.pdi_inspector,
      pdi_notes = EXCLUDED.pdi_notes,
      location = EXCLUDED.location,
      image_url = EXCLUDED.image_url,
      reserved_for_customer = EXCLUDED.reserved_for_customer,
      arrival_date = EXCLUDED.arrival_date,
      mileage_km = EXCLUDED.mileage_km,
      incoming_batch = EXCLUDED.incoming_batch,
      expected_arrival_date = EXCLUDED.expected_arrival_date,
      issue_note = EXCLUDED.issue_note,
      event_campaign = EXCLUDED.event_campaign,
      event_start_date = EXCLUDED.event_start_date,
      event_end_date = EXCLUDED.event_end_date,
      event_location = EXCLUDED.event_location,
      promotion_discount_usd = EXCLUDED.promotion_discount_usd,
      promotion_notes = EXCLUDED.promotion_notes,
      updated_at = now()
    WHERE public.vehicles.status::text = 'removed';
  END IF;

  INSERT INTO public.bills (
    id, bill_number, type, bill_date, customer_id, customer_name,
    customer_phone, customer_id_card, customer_address, customer_province,
    sales_rep, recorded_by, payment_method, qr_used, bank_name,
    transfer_ref, finance_company, down_payment_percent, down_payment_usd,
    tenure_months, monthly_payment_lak, free_gifts, warranty_terms,
    payment_slip_path, supplier_name, customs_doc_number, import_entry_port,
    destination_warehouse, total_usd, total_lak, notes, updated_at
  ) VALUES (
    v_bill_id,
    p_bill->>'bill_number',
    (p_bill->>'type')::public.bill_type,
    COALESCE((p_bill->>'bill_date')::date, CURRENT_DATE),
    v_customer_id,
    v_name,
    v_phone,
    v_id_card,
    v_address,
    v_province,
    v_sales_rep,
    v_caller_id,
    p_bill->>'payment_method',
    p_bill->>'qr_used',
    p_bill->>'bank_name',
    p_bill->>'transfer_ref',
    p_bill->>'finance_company',
    (p_bill->>'down_payment_percent')::numeric,
    (p_bill->>'down_payment_usd')::numeric,
    (p_bill->>'tenure_months')::integer,
    (p_bill->>'monthly_payment_lak')::numeric,
    COALESCE(p_bill->'free_gifts', '[]'::jsonb),
    p_bill->>'warranty_terms',
    p_bill->>'payment_slip_path',
    p_bill->>'supplier_name',
    p_bill->>'customs_doc_number',
    p_bill->>'import_entry_port',
    p_bill->>'destination_warehouse',
    v_net_total_usd,
    v_net_total_lak,
    p_bill->>'notes',
    now()
  );

  INSERT INTO public.bill_items (
    id, bill_id, line_number, vehicle_vin, engine_number, model_name, trim,
    plate_number, color, interior_color, battery, unit_price_usd,
    unit_price_lak, discount_usd, discount_lak, pdi_status_initial,
    status_initial, inspector_name, event_campaign, event_start_date,
    event_end_date, event_location
  ) VALUES (
    COALESCE(NULLIF(p_item->>'id', '')::uuid, gen_random_uuid()),
    v_bill_id,
    COALESCE((p_item->>'line_number')::integer, 1),
    v_vin,
    NULLIF(btrim(COALESCE(p_item->>'engine_number', p_vehicle->>'engine_number', '')), ''),
    COALESCE(NULLIF(p_item->>'model_name', ''), 'AVATR'),
    p_item->>'trim',
    COALESCE(p_item->>'plate_number', v_vehicle.plate_number),
    COALESCE(p_item->>'color', v_vehicle.color),
    COALESCE(p_item->>'interior_color', v_vehicle.interior_color),
    COALESCE(p_item->>'battery', v_vehicle.battery),
    v_unit_price_usd,
    v_unit_price_lak,
    v_discount_usd,
    v_discount_lak,
    COALESCE(NULLIF(p_item->>'pdi_status_initial', '')::public.pdi_status, v_vehicle.pdi_status),
    COALESCE(NULLIF(p_item->>'status_initial', '')::public.vehicle_status, v_vehicle.status),
    p_item->>'inspector_name',
    p_item->>'event_campaign',
    p_item->>'event_start_date',
    p_item->>'event_end_date',
    p_item->>'event_location'
  );

  INSERT INTO public.stock_movements (
    id, vehicle_vin, movement_type, bill_id, notes, recorded_by
  ) VALUES (
    gen_random_uuid(),
    v_vin,
    p_movement_type,
    v_bill_id,
    CASE
      WHEN p_movement_type = 'stock_in' THEN 'Stock-in via import bill ' || (p_bill->>'bill_number')
      ELSE 'Stock-out via sales bill ' || (p_bill->>'bill_number')
    END,
    v_caller_id
  );

  IF p_movement_type = 'stock_out' THEN
    UPDATE public.vehicles
    SET status = 'sold'::public.vehicle_status,
        reserved_for_customer = NULL,
        updated_at = now()
    WHERE vin = v_vin;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) TO authenticated;

-- 10. Hardened record_pos_sale: executes record_vehicle_bill FIRST and writes server-computed pricing to customers (B-02, B-03)
CREATE OR REPLACE FUNCTION public.record_pos_sale(
  p_customer jsonb,
  p_bill jsonb,
  p_item jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_role text;
  v_customer_id uuid;
  v_bill_id uuid;
  v_bill jsonb;
  v_item jsonb;
  v_saved_bill public.bills%ROWTYPE;
  v_saved_item public.bill_items%ROWTYPE;
  v_model_id text;
  v_payment_type text;
  v_dp_pct numeric;
  v_dp_usd numeric;
  v_tenure integer;
  v_monthly_lak numeric;
  v_paid_usd numeric;
  v_paid_lak numeric;
  v_schedule jsonb := '[]'::jsonb;
  v_rate numeric := public._get_lak_exchange_rate();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  SELECT role::text INTO v_caller_role
  FROM public.staff_profiles
  WHERE id = v_caller_id AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin', 'sales') THEN
    RAISE EXCEPTION 'Not authorized to record a sale';
  END IF;

  v_customer_id := NULLIF(p_customer->>'id', '')::uuid;
  v_bill_id := NULLIF(p_bill->>'id', '')::uuid;

  IF v_customer_id IS NULL OR v_bill_id IS NULL
     OR (p_bill->>'type') IS DISTINCT FROM 'sale'
     OR NULLIF(p_bill->>'customer_id', '')::uuid IS DISTINCT FROM v_customer_id THEN
    RAISE EXCEPTION 'Invalid sale/customer relationship';
  END IF;

  -- Upsert base non-financial CRM record FIRST if customer does not yet exist so FK bills.customer_id succeeds
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = v_customer_id) THEN
    SELECT id INTO v_model_id
    FROM public.vehicle_models
    WHERE id = p_customer->>'interested_model_id'
       OR lower(name) = lower(COALESCE(p_item->>'model_name', ''))
    LIMIT 1;

    INSERT INTO public.customers (
      id, name, phone, email, category, source, interested_model_id,
      status, priority, budget, assigned_to, notes,
      id_card_number, province, district, village, created_at
    ) VALUES (
      v_customer_id,
      COALESCE(NULLIF(btrim(p_customer->>'name'), ''), 'Customer'),
      COALESCE(NULLIF(btrim(p_customer->>'phone'), ''), 'N/A'),
      NULLIF(btrim(COALESCE(p_customer->>'email', '')), ''),
      COALESCE(NULLIF(p_customer->>'category', ''), 'walk_in'),
      COALESCE(NULLIF(p_customer->>'source', ''), 'POS Showroom Sale'),
      v_model_id,
      'negotiation',
      COALESCE(NULLIF(p_customer->>'priority', ''), 'high'),
      NULLIF(p_customer->>'budget', ''),
      CASE
        WHEN v_caller_role IN ('super_admin', 'admin')
          AND NULLIF(p_customer->>'assigned_to', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (p_customer->>'assigned_to')::uuid
        ELSE v_caller_id
      END,
      NULLIF(p_customer->>'notes', ''),
      NULLIF(p_customer->>'id_card_number', ''),
      NULLIF(p_customer->>'province', ''),
      NULLIF(p_customer->>'district', ''),
      NULLIF(p_customer->>'village', ''),
      COALESCE(NULLIF(p_customer->>'created_at', '')::timestamptz, now())
    );
  END IF;

  v_bill := p_bill || jsonb_build_object(
    'recorded_by', v_caller_id,
    'sales_rep', CASE
      WHEN v_caller_role IN ('super_admin', 'admin')
        AND NULLIF(p_bill->>'sales_rep', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (p_bill->>'sales_rep')::uuid
      ELSE v_caller_id
    END
  );
  v_item := p_item || jsonb_build_object('bill_id', v_bill_id);

  -- Execute hardened inventory lock + authoritative pricing + bill insertion
  PERFORM public.record_vehicle_bill(
    p_bill => v_bill,
    p_item => v_item,
    p_movement_type => 'stock_out'
  );

  SELECT * INTO v_saved_bill FROM public.bills WHERE id = v_bill_id;
  SELECT * INTO v_saved_item FROM public.bill_items WHERE bill_id = v_bill_id ORDER BY line_number ASC LIMIT 1;

  v_payment_type := CASE
    WHEN COALESCE(p_customer->>'payment_type', p_bill->>'payment_method', 'cash') IN ('installment', 'finance')
      THEN 'installment'
    ELSE 'cash'
  END;

  IF v_payment_type = 'installment' THEN
    v_dp_pct := GREATEST(0, LEAST(COALESCE((p_bill->>'down_payment_percent')::numeric, 30), 100));
    v_dp_usd := LEAST(
      GREATEST(COALESCE((p_bill->>'down_payment_usd')::numeric, pg_catalog.round(v_saved_bill.total_usd * (v_dp_pct / 100.0))), 0),
      v_saved_bill.total_usd
    );
    v_tenure := GREATEST(1, LEAST(COALESCE((p_bill->>'tenure_months')::integer, 48), 120));
    v_schedule := public._build_default_installment_schedule(
      now(),
      v_saved_bill.total_usd,
      v_dp_pct,
      v_dp_usd,
      v_tenure,
      v_rate,
      0.075
    );
    v_monthly_lak := COALESCE((v_schedule->0->>'amountLAK')::numeric, COALESCE((p_bill->>'monthly_payment_lak')::numeric, 0));
    v_paid_usd := v_dp_usd;
    v_paid_lak := pg_catalog.round(v_dp_usd * v_rate);

    -- Align saved bill financial terms with clamped server computation
    UPDATE public.bills
    SET down_payment_percent = v_dp_pct,
        down_payment_usd = v_dp_usd,
        tenure_months = v_tenure,
        monthly_payment_lak = v_monthly_lak
    WHERE id = v_bill_id;
  ELSE
    v_dp_pct := NULL;
    v_dp_usd := NULL;
    v_tenure := NULL;
    v_monthly_lak := NULL;
    v_paid_usd := v_saved_bill.total_usd;
    v_paid_lak := v_saved_bill.total_lak;
  END IF;

  -- Update customer strictly from server-derived pricing and vehicle linkage
  UPDATE public.customers
  SET name = COALESCE(NULLIF(btrim(p_customer->>'name'), ''), name),
      phone = COALESCE(NULLIF(btrim(p_customer->>'phone'), ''), phone),
      id_card_number = COALESCE(NULLIF(p_customer->>'id_card_number', ''), id_card_number),
      province = COALESCE(NULLIF(p_customer->>'province', ''), province),
      district = COALESCE(NULLIF(p_customer->>'district', ''), district),
      village = COALESCE(NULLIF(p_customer->>'village', ''), village),
      status = 'delivered',
      vin = v_saved_item.vehicle_vin,
      engine_number = COALESCE(v_saved_item.engine_number, engine_number),
      plate_number = COALESCE(v_saved_item.plate_number, plate_number),
      color = COALESCE(v_saved_item.color, color),
      list_price_usd = v_saved_item.unit_price_usd,
      discount_usd = v_saved_item.discount_usd,
      payment_type = v_payment_type,
      payment_type_confirmed = CASE WHEN v_payment_type = 'installment' THEN 'down_payment' ELSE 'full' END,
      installment_status = CASE WHEN v_payment_type = 'installment' THEN 'active_repaying' ELSE installment_status END,
      down_payment_percent = v_dp_pct,
      down_payment_usd = v_dp_usd,
      tenure_months = v_tenure,
      monthly_payment_lak = v_monthly_lak,
      finance_company = COALESCE(NULLIF(p_bill->>'finance_company', ''), finance_company),
      installment_records = CASE WHEN v_payment_type = 'installment' THEN v_schedule ELSE COALESCE(installment_records, '[]'::jsonb) END,
      paid_amount_usd = v_paid_usd,
      paid_amount_lak = v_paid_lak,
      payment_date = to_char(now() AT TIME ZONE 'Asia/Vientiane', 'YYYY-MM-DD HH24:MI'),
      payment_receipt_no = v_saved_bill.bill_number,
      payment_method_ref = COALESCE(NULLIF(v_saved_bill.transfer_ref, ''), UPPER(COALESCE(v_saved_bill.payment_method, 'CASH'))),
      payment_bank = COALESCE(v_saved_bill.bank_name, payment_bank),
      payment_confirmed_by = (SELECT COALESCE(name, email) FROM public.staff_profiles WHERE id = v_caller_id),
      is_payment_completed = (v_payment_type <> 'installment'),
      last_follow_up = now(),
      updated_at = now()
  WHERE id = v_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_pos_sale(jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_pos_sale(jsonb, jsonb, jsonb) TO authenticated;

-- 11. Atomic installment payment collection RPC (B-02, H-03)
CREATE OR REPLACE FUNCTION public.record_installment_payment(
  p_customer_id uuid,
  p_period integer,
  p_payment jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_role text;
  v_caller_name text;
  v_customer public.customers%ROWTYPE;
  v_sale_bill public.bills%ROWTYPE;
  v_records jsonb;
  v_entry jsonb;
  v_found_idx integer := -1;
  v_idx integer := 0;
  v_sched_usd numeric := 0;
  v_sched_lak numeric := 0;
  v_pay_usd numeric := 0;
  v_pay_lak numeric := 0;
  v_pay_date text;
  v_pay_method text;
  v_bank_name text;
  v_transfer_ref text;
  v_notes text;
  v_receipt_no text;
  v_bill_id uuid := gen_random_uuid();
  v_new_records jsonb := '[]'::jsonb;
  v_total_paid_usd numeric := 0;
  v_total_paid_lak numeric := 0;
  v_paid_count integer := 0;
  v_total_count integer := 0;
  v_vin text;
  v_model_name text;
  v_new_entry jsonb;
  v_rate numeric := public._get_lak_exchange_rate();
  v_base_paid_usd numeric := 0;
  v_base_paid_lak numeric := 0;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  SELECT role::text, COALESCE(name, email, 'Staff') INTO v_caller_role, v_caller_name
  FROM public.staff_profiles
  WHERE id = v_caller_id AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin', 'sales') THEN
    RAISE EXCEPTION 'Permission denied: active admin or sales role required.';
  END IF;

  IF p_period IS NULL OR p_period < 1 THEN
    RAISE EXCEPTION 'Invalid installment period: %', p_period;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_customer_id::text));

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer record not found.';
  END IF;

  SELECT * INTO v_sale_bill
  FROM public.bills
  WHERE customer_id = p_customer_id
    AND COALESCE(status::text, 'completed') <> 'voided'
    AND COALESCE(installment_period, 0) = 0
    AND type::text IN ('sale', 'installment')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_caller_role = 'sales' THEN
    IF v_customer.assigned_to IS DISTINCT FROM v_caller_id
       AND COALESCE(v_sale_bill.sales_rep, v_sale_bill.recorded_by) IS DISTINCT FROM v_caller_id
       AND v_sale_bill.recorded_by IS DISTINCT FROM v_caller_id THEN
      RAISE EXCEPTION 'Permission denied: sales staff may only collect installments on their own customers or sales.';
    END IF;
  END IF;

  v_records := COALESCE(v_customer.installment_records, '[]'::jsonb);
  IF jsonb_typeof(v_records) <> 'array' OR jsonb_array_length(v_records) = 0 THEN
    -- Deterministically materialize schedule on Postgres if legacy row has empty array
    v_records := public._build_default_installment_schedule(
      COALESCE(v_customer.created_at, now()),
      COALESCE(
        NULLIF(v_customer.list_price_usd, 0) - COALESCE(v_customer.discount_usd, 0),
        NULLIF(v_sale_bill.total_usd, 0),
        (SELECT NULLIF(vm.price_starting_usd, 0) FROM public.vehicle_models vm WHERE vm.id = v_customer.interested_model_id LIMIT 1),
        45000
      ),
      v_customer.down_payment_percent,
      v_customer.down_payment_usd,
      v_customer.tenure_months
    );
  END IF;

  v_total_count := jsonb_array_length(v_records);
  FOR v_idx IN 0..(v_total_count - 1) LOOP
    IF COALESCE((v_records->v_idx->>'period')::integer, -1) = p_period THEN
      v_found_idx := v_idx;
      v_entry := v_records->v_idx;
      EXIT;
    END IF;
  END LOOP;

  IF v_found_idx = -1 THEN
    RAISE EXCEPTION 'Installment period % does not exist on customer schedule.', p_period;
  END IF;

  IF COALESCE(v_entry->>'status', '') = 'paid' THEN
    RAISE EXCEPTION 'Installment period % has already been recorded as paid.', p_period;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bills
    WHERE customer_id = p_customer_id
      AND installment_period = p_period
      AND type::text = 'installment'
      AND COALESCE(status::text, 'completed') <> 'voided'
  ) THEN
    RAISE EXCEPTION 'An active receipt bill already exists for installment period %.', p_period;
  END IF;

  v_sched_usd := GREATEST(COALESCE((v_entry->>'amountUSD')::numeric, 0), 0);
  v_sched_lak := GREATEST(COALESCE((v_entry->>'amountLAK')::numeric, pg_catalog.round(v_sched_usd * v_rate)), 0);

  IF v_caller_role IN ('super_admin', 'admin')
     AND NULLIF(btrim(COALESCE(p_payment->>'paidAmountUSD', '')), '') IS NOT NULL THEN
    v_pay_usd := (p_payment->>'paidAmountUSD')::numeric;
    v_pay_lak := COALESCE(
      NULLIF(btrim(COALESCE(p_payment->>'paidAmountLAK', '')), '')::numeric,
      pg_catalog.round(v_pay_usd * v_rate)
    );
  ELSE
    -- Non-admin sales staff always collect the contract scheduled amount
    v_pay_usd := v_sched_usd;
    v_pay_lak := v_sched_lak;
  END IF;

  IF v_pay_usd IS NULL OR v_pay_usd <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  v_pay_date := COALESCE(NULLIF(btrim(COALESCE(p_payment->>'paidDate', '')), ''), to_char((now() AT TIME ZONE 'Asia/Vientiane')::date, 'YYYY-MM-DD'));
  v_pay_method := CASE WHEN COALESCE(p_payment->>'paymentMethod', 'transfer') = 'cash' THEN 'cash' ELSE 'transfer' END;
  v_bank_name := CASE WHEN v_pay_method = 'transfer' THEN NULLIF(btrim(COALESCE(p_payment->>'bankName', '')), '') ELSE NULL END;
  v_transfer_ref := CASE WHEN v_pay_method = 'transfer' THEN NULLIF(btrim(COALESCE(p_payment->>'transferRef', '')), '') ELSE NULL END;
  v_notes := NULLIF(btrim(COALESCE(p_payment->>'notes', '')), '');

  v_receipt_no := public.generate_next_bill_number('INS');

  v_new_entry := v_entry || jsonb_build_object(
    'status', 'paid',
    'paidDate', v_pay_date,
    'paidAmountUSD', v_pay_usd,
    'paidAmountLAK', v_pay_lak,
    'paymentMethod', v_pay_method,
    'bankName', v_bank_name,
    'transferRef', v_transfer_ref,
    'receiptNo', v_receipt_no,
    'notes', v_notes,
    'collectedBy', v_caller_name
  );

  FOR v_idx IN 0..(v_total_count - 1) LOOP
    IF v_idx = v_found_idx THEN
      v_entry := v_new_entry;
    ELSE
      v_entry := v_records->v_idx;
    END IF;
    v_new_records := v_new_records || jsonb_build_array(v_entry);
    IF COALESCE(v_entry->>'status', '') = 'paid' THEN
      v_paid_count := v_paid_count + 1;
      v_total_paid_usd := v_total_paid_usd + COALESCE((v_entry->>'paidAmountUSD')::numeric, (v_entry->>'amountUSD')::numeric, 0);
      v_total_paid_lak := v_total_paid_lak + COALESCE((v_entry->>'paidAmountLAK')::numeric, (v_entry->>'amountLAK')::numeric, 0);
    END IF;
  END LOOP;

  v_base_paid_usd := CASE
    WHEN v_customer.payment_type IN ('installment', 'finance') OR COALESCE(v_customer.down_payment_usd, 0) > 0
      THEN COALESCE(v_customer.down_payment_usd, 0)
    ELSE 0
  END;
  v_base_paid_lak := pg_catalog.round(v_base_paid_usd * v_rate);
  v_total_paid_usd := v_base_paid_usd + v_total_paid_usd;
  v_total_paid_lak := v_base_paid_lak + v_total_paid_lak;

  UPDATE public.customers
  SET installment_records = v_new_records,
      paid_amount_usd = v_total_paid_usd,
      paid_amount_lak = v_total_paid_lak,
      installment_status = CASE WHEN v_paid_count = v_total_count AND v_total_count > 0 THEN 'completed' ELSE 'active_repaying' END,
      last_follow_up = now(),
      updated_at = now()
  WHERE id = p_customer_id;

  v_vin := NULLIF(btrim(COALESCE(v_customer.vin, '')), '');
  IF v_vin IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.vehicles WHERE vin = v_vin) THEN
    v_vin := NULL;
  END IF;

  v_model_name := COALESCE(
    NULLIF(btrim(COALESCE(p_payment->>'modelName', '')), ''),
    (SELECT name FROM public.vehicle_models WHERE id = v_customer.interested_model_id LIMIT 1),
    'AVATR'
  );

  INSERT INTO public.bills (
    id, bill_number, type, status, bill_date, customer_id,
    customer_name, customer_phone, customer_id_card, customer_address, customer_province,
    sales_rep, recorded_by, payment_method, bank_name, transfer_ref,
    finance_company, installment_period, tenure_months, monthly_payment_lak,
    total_usd, total_lak, notes, updated_at
  ) VALUES (
    v_bill_id,
    v_receipt_no,
    'installment'::public.bill_type,
    'completed',
    v_pay_date::date,
    p_customer_id,
    v_customer.name,
    v_customer.phone,
    v_customer.id_card_number,
    pg_catalog.concat_ws(', ', NULLIF(v_customer.village, ''), NULLIF(v_customer.district, ''), NULLIF(v_customer.province, '')),
    v_customer.province,
    COALESCE(v_sale_bill.sales_rep, v_customer.assigned_to, v_caller_id),
    v_caller_id,
    v_pay_method,
    v_bank_name,
    v_transfer_ref,
    v_customer.finance_company,
    p_period,
    v_customer.tenure_months,
    v_pay_lak,
    v_pay_usd,
    v_pay_lak,
    COALESCE(v_notes, 'ຮັບເງິນງວດທີ ' || p_period || ' ລູກຄ້າ ' || v_customer.name),
    now()
  );

  INSERT INTO public.bill_items (
    id, bill_id, line_number, vehicle_vin, model_name, plate_number, color,
    unit_price_usd, unit_price_lak, discount_usd, discount_lak
  ) VALUES (
    gen_random_uuid(),
    v_bill_id,
    1,
    v_vin,
    v_model_name,
    v_customer.plate_number,
    v_customer.color,
    v_pay_usd,
    v_pay_lak,
    0,
    0
  );

  RETURN jsonb_build_object(
    'bill_id', v_bill_id,
    'bill_number', v_receipt_no,
    'paid_amount_usd', v_total_paid_usd,
    'paid_amount_lak', v_total_paid_lak,
    'installment_status', CASE WHEN v_paid_count = v_total_count AND v_total_count > 0 THEN 'completed' ELSE 'active_repaying' END,
    'updated_records', v_new_records
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_installment_payment(uuid, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_installment_payment(uuid, integer, jsonb) TO authenticated;

-- 12. Admin-only revert_installment_payment RPC (B-02, H-03)
CREATE OR REPLACE FUNCTION public.revert_installment_payment(
  p_customer_id uuid,
  p_period integer,
  p_reason text DEFAULT 'Payment reverted'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_name text;
  v_customer public.customers%ROWTYPE;
  v_records jsonb;
  v_new_records jsonb := '[]'::jsonb;
  v_entry jsonb;
  v_due_date date;
  v_today date := (now() AT TIME ZONE 'Asia/Vientiane')::date;
  v_reverted_status text;
  v_idx integer;
  v_total_paid_usd numeric := 0;
  v_total_paid_lak numeric := 0;
  v_voided_bill_ids uuid[] := ARRAY[]::uuid[];
  v_bill_row record;
  v_reason text := COALESCE(NULLIF(btrim(p_reason), ''), 'Installment payment reverted');
BEGIN
  IF v_caller_id IS NULL OR NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Permission denied: only administrators may revert recorded installment payments.';
  END IF;

  SELECT COALESCE(name, email, 'Admin') INTO v_caller_name
  FROM public.staff_profiles WHERE id = v_caller_id;

  IF v_reason IS NULL OR pg_catalog.char_length(v_reason) < 3 THEN
    v_reason := 'Admin reverted installment period ' || p_period;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_customer_id::text));

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer record not found.';
  END IF;

  v_records := COALESCE(v_customer.installment_records, '[]'::jsonb);
  FOR v_idx IN 0..(GREATEST(jsonb_array_length(v_records), 0) - 1) LOOP
    v_entry := v_records->v_idx;
    IF COALESCE((v_entry->>'period')::integer, -1) = p_period THEN
      v_due_date := NULLIF(v_entry->>'dueDate', '')::date;
      v_reverted_status := CASE WHEN v_due_date IS NOT NULL AND v_due_date < v_today THEN 'due' ELSE 'pending' END;
      v_entry := (v_entry - 'paidDate' - 'paidAmountUSD' - 'paidAmountLAK' - 'paymentMethod' - 'bankName' - 'transferRef' - 'receiptNo' - 'notes' - 'collectedBy')
        || jsonb_build_object('status', v_reverted_status);
    END IF;
    v_new_records := v_new_records || jsonb_build_array(v_entry);
    IF COALESCE(v_entry->>'status', '') = 'paid' THEN
      v_total_paid_usd := v_total_paid_usd + COALESCE((v_entry->>'paidAmountUSD')::numeric, (v_entry->>'amountUSD')::numeric, 0);
      v_total_paid_lak := v_total_paid_lak + COALESCE((v_entry->>'paidAmountLAK')::numeric, (v_entry->>'amountLAK')::numeric, 0);
    END IF;
  END LOOP;

  v_total_paid_usd := (
    CASE
      WHEN v_customer.payment_type IN ('installment', 'finance') OR COALESCE(v_customer.down_payment_usd, 0) > 0
        THEN COALESCE(v_customer.down_payment_usd, 0)
      ELSE 0
    END
  ) + v_total_paid_usd;
  v_total_paid_lak := pg_catalog.round(
    (
      CASE
        WHEN v_customer.payment_type IN ('installment', 'finance') OR COALESCE(v_customer.down_payment_usd, 0) > 0
          THEN COALESCE(v_customer.down_payment_usd, 0)
        ELSE 0
      END
    ) * public._get_lak_exchange_rate()
  ) + v_total_paid_lak;

  UPDATE public.customers
  SET installment_records = v_new_records,
      paid_amount_usd = v_total_paid_usd,
      paid_amount_lak = v_total_paid_lak,
      installment_status = 'active_repaying',
      is_payment_completed = false,
      last_follow_up = now(),
      updated_at = now()
  WHERE id = p_customer_id;

  FOR v_bill_row IN
    SELECT id, bill_number FROM public.bills
    WHERE customer_id = p_customer_id
      AND installment_period = p_period
      AND type::text = 'installment'
      AND COALESCE(status::text, 'completed') <> 'voided'
    FOR UPDATE
  LOOP
    UPDATE public.bills
    SET status = 'voided', updated_at = now()
    WHERE id = v_bill_row.id;

    INSERT INTO public.bill_void_logs (bill_id, bill_number, reason, voided_by, voided_by_name, voided_at)
    VALUES (v_bill_row.id, v_bill_row.bill_number, pg_catalog.left(v_reason, 1000), v_caller_id, v_caller_name, now())
    ON CONFLICT (bill_id) DO UPDATE
      SET bill_number = EXCLUDED.bill_number,
          reason = EXCLUDED.reason,
          voided_by = EXCLUDED.voided_by,
          voided_by_name = EXCLUDED.voided_by_name,
          voided_at = EXCLUDED.voided_at;

    v_voided_bill_ids := v_voided_bill_ids || v_bill_row.id;
  END LOOP;

  RETURN jsonb_build_object(
    'updated_records', v_new_records,
    'paid_amount_usd', v_total_paid_usd,
    'paid_amount_lak', v_total_paid_lak,
    'voided_bill_ids', to_jsonb(v_voided_bill_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revert_installment_payment(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_installment_payment(uuid, integer, text) TO authenticated;

-- 13. Admin-only confirm_installment_payoff & confirm_customer_payment RPCs (B-02)
CREATE OR REPLACE FUNCTION public.confirm_installment_payoff(
  p_customer_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_name text;
  v_customer public.customers%ROWTYPE;
  v_total_count integer;
  v_paid_count integer;
BEGIN
  IF v_caller_id IS NULL OR NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Permission denied: only administrators can confirm full installment payoff.';
  END IF;

  SELECT COALESCE(name, email, 'Admin') INTO v_caller_name FROM public.staff_profiles WHERE id = v_caller_id;

  SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer record not found.';
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE COALESCE(elem->>'status', '') = 'paid')
  INTO v_total_count, v_paid_count
  FROM jsonb_array_elements(COALESCE(v_customer.installment_records, '[]'::jsonb)) AS elem;

  IF v_total_count = 0 OR v_paid_count < v_total_count THEN
    RAISE EXCEPTION 'Customer must pay all % periods before payoff confirmation (% paid).', v_total_count, v_paid_count;
  END IF;

  UPDATE public.customers
  SET installment_status = 'completed',
      is_payment_completed = true,
      status = 'delivered',
      payment_type_confirmed = 'installment_completed',
      paid_date = to_char((now() AT TIME ZONE 'Asia/Vientiane')::date, 'YYYY-MM-DD'),
      notes = COALESCE(NULLIF(btrim(p_notes), ''), notes),
      payment_confirmed_by = v_caller_name,
      last_follow_up = now(),
      updated_at = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_customer;

  RETURN to_jsonb(v_customer);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_installment_payoff(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_installment_payoff(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_customer_payment(
  p_customer_id uuid,
  p_payment jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_name text;
  v_customer public.customers%ROWTYPE;
  v_rate numeric := public._get_lak_exchange_rate();
  v_amount_usd numeric := GREATEST(COALESCE(NULLIF(btrim(COALESCE(p_payment->>'paidAmountUSD', '')), '')::numeric, 0), 0);
  v_amount_lak numeric := GREATEST(COALESCE(NULLIF(btrim(COALESCE(p_payment->>'paidAmountLAK', '')), '')::numeric, pg_catalog.round(v_amount_usd * v_rate)), 0);
  v_pay_type_confirmed text := NULLIF(btrim(COALESCE(p_payment->>'paymentTypeConfirmed', '')), '');
BEGIN
  IF v_caller_id IS NULL OR NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Permission denied: only administrators can manually confirm customer payments.';
  END IF;

  SELECT COALESCE(name, email, 'Admin') INTO v_caller_name FROM public.staff_profiles WHERE id = v_caller_id;

  SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer record not found.';
  END IF;

  UPDATE public.customers
  SET status = 'delivered',
      installment_status = COALESCE(NULLIF(p_payment->>'installmentStatus', ''), installment_status),
      paid_amount_usd = v_amount_usd,
      paid_amount_lak = v_amount_lak,
      payment_date = COALESCE(NULLIF(p_payment->>'paymentDate', ''), to_char(now() AT TIME ZONE 'Asia/Vientiane', 'YYYY-MM-DD HH24:MI')),
      payment_method_ref = COALESCE(NULLIF(p_payment->>'paymentMethodRef', ''), payment_method_ref),
      payment_bank = COALESCE(NULLIF(p_payment->>'paymentBank', ''), payment_bank),
      payment_receipt_no = COALESCE(NULLIF(p_payment->>'paymentReceiptNo', ''), payment_receipt_no),
      payment_confirmed_by = COALESCE(NULLIF(p_payment->>'paymentConfirmedBy', ''), v_caller_name),
      payment_type_confirmed = COALESCE(v_pay_type_confirmed, payment_type_confirmed),
      is_payment_completed = COALESCE(v_pay_type_confirmed = 'full', is_payment_completed),
      notes = COALESCE(NULLIF(p_payment->>'notes', ''), notes),
      last_follow_up = now(),
      updated_at = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_customer;

  RETURN to_jsonb(v_customer);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_customer_payment(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_customer_payment(uuid, jsonb) TO authenticated;

-- 14. attach_bill_payment_slip & update_bill_after_sales RPCs (B-02)
CREATE OR REPLACE FUNCTION public.attach_bill_payment_slip(
  p_bill_id uuid,
  p_slip_path text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_role text;
  v_bill public.bills%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  SELECT role::text INTO v_caller_role FROM public.staff_profiles WHERE id = v_caller_id AND status = 'active';
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin', 'sales') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  IF NULLIF(btrim(COALESCE(p_slip_path, '')), '') IS NULL
     OR p_slip_path !~ '^sales/slip_[a-zA-Z0-9_-]+_[0-9]+\.(jpg|png|webp|pdf)$' THEN
    RAISE EXCEPTION 'Invalid payment slip storage path.';
  END IF;

  SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found.';
  END IF;

  IF v_caller_role = 'sales'
     AND v_bill.sales_rep IS DISTINCT FROM v_caller_id
     AND v_bill.recorded_by IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'Permission denied: you may only attach slips to your own bills.';
  END IF;

  UPDATE public.bills
  SET payment_slip_path = p_slip_path,
      updated_at = now()
  WHERE id = p_bill_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_bill_payment_slip(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_bill_payment_slip(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_bill_after_sales(
  p_bill_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_role text;
  v_bill public.bills%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  SELECT role::text INTO v_caller_role FROM public.staff_profiles WHERE id = v_caller_id AND status = 'active';
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin', 'sales') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found.';
  END IF;

  IF COALESCE(v_bill.status::text, 'completed') = 'voided' THEN
    RAISE EXCEPTION 'Voided bills cannot be modified.';
  END IF;

  IF v_caller_role = 'sales'
     AND v_bill.sales_rep IS DISTINCT FROM v_caller_id
     AND v_bill.recorded_by IS DISTINCT FROM v_caller_id
     AND NOT EXISTS (
       SELECT 1 FROM public.customers c
       WHERE c.id = v_bill.customer_id AND c.assigned_to = v_caller_id
     ) THEN
    RAISE EXCEPTION 'Permission denied: you do not own this customer bill.';
  END IF;

  UPDATE public.bills
  SET warranty_start_date = CASE WHEN p_payload ? 'warranty_start_date' THEN NULLIF(btrim(p_payload->>'warranty_start_date'), '') ELSE warranty_start_date END,
      warranty_expiry_date = CASE WHEN p_payload ? 'warranty_expiry_date' THEN NULLIF(btrim(p_payload->>'warranty_expiry_date'), '') ELSE warranty_expiry_date END,
      warranty_years = CASE WHEN p_payload ? 'warranty_years' THEN NULLIF(p_payload->>'warranty_years', '')::integer ELSE warranty_years END,
      warranty_distance_km = CASE WHEN p_payload ? 'warranty_distance_km' THEN NULLIF(p_payload->>'warranty_distance_km', '')::numeric ELSE warranty_distance_km END,
      warranty_terms = CASE WHEN p_payload ? 'warranty_terms' THEN NULLIF(btrim(p_payload->>'warranty_terms'), '') ELSE warranty_terms END,
      current_mileage_km = CASE WHEN p_payload ? 'current_mileage_km' THEN NULLIF(p_payload->>'current_mileage_km', '')::numeric ELSE current_mileage_km END,
      battery_health_soh = CASE WHEN p_payload ? 'battery_health_soh' THEN NULLIF(p_payload->>'battery_health_soh', '')::numeric ELSE battery_health_soh END,
      after_sales_notes = CASE WHEN p_payload ? 'after_sales_notes' THEN NULLIF(btrim(p_payload->>'after_sales_notes'), '') ELSE after_sales_notes END,
      notes = CASE WHEN p_payload ? 'notes' THEN NULLIF(btrim(p_payload->>'notes'), '') ELSE notes END,
      customer_name = CASE WHEN p_payload ? 'customer_name' THEN COALESCE(NULLIF(btrim(p_payload->>'customer_name'), ''), customer_name) ELSE customer_name END,
      customer_phone = CASE WHEN p_payload ? 'customer_phone' THEN COALESCE(NULLIF(btrim(p_payload->>'customer_phone'), ''), customer_phone) ELSE customer_phone END,
      customer_id_card = CASE WHEN p_payload ? 'customer_id_card' THEN NULLIF(btrim(p_payload->>'customer_id_card'), '') ELSE customer_id_card END,
      customer_province = CASE WHEN p_payload ? 'customer_province' THEN NULLIF(btrim(p_payload->>'customer_province'), '') ELSE customer_province END,
      updated_at = now()
  WHERE id = p_bill_id;

  UPDATE public.bill_items
  SET plate_number = CASE WHEN p_payload ? 'plate_number' THEN NULLIF(btrim(p_payload->>'plate_number'), '') ELSE plate_number END,
      engine_number = CASE WHEN p_payload ? 'engine_number' THEN NULLIF(btrim(p_payload->>'engine_number'), '') ELSE engine_number END,
      color = CASE WHEN p_payload ? 'color' THEN NULLIF(btrim(p_payload->>'color'), '') ELSE color END,
      model_name = CASE
        WHEN v_caller_role IN ('super_admin', 'admin') AND p_payload ? 'model_name'
          THEN COALESCE(NULLIF(btrim(p_payload->>'model_name'), ''), model_name)
        ELSE model_name
      END
  WHERE bill_id = p_bill_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_bill_after_sales(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_bill_after_sales(uuid, jsonb) TO authenticated;

-- 15. Extend void_bill_with_reason to revert monthly installment records OR customer sale delivery atomically (H-03)
CREATE OR REPLACE FUNCTION public.void_bill_with_reason(
  p_bill_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_name text;
  v_reason text := NULLIF(pg_catalog.btrim(p_reason), '');
  v_bill public.bills%ROWTYPE;
  v_bill_vin text;
  v_customer public.customers%ROWTYPE;
  v_records jsonb;
  v_new_records jsonb := '[]'::jsonb;
  v_entry jsonb;
  v_due_date date;
  v_today date := (now() AT TIME ZONE 'Asia/Vientiane')::date;
  v_idx integer;
  v_total_paid_usd numeric := 0;
  v_total_paid_lak numeric := 0;
  v_reverted_customer_id uuid := NULL;
  v_entry_id text := 'void-' || p_bill_id::text;
BEGIN
  IF v_reason IS NULL OR pg_catalog.char_length(v_reason) < 3 THEN
    RAISE EXCEPTION 'Void reason must be at least 3 characters.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = v_caller_id AND role::text IN ('super_admin', 'admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only an active admin can void bills.';
  END IF;

  SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found.';
  END IF;

  SELECT vehicle_vin INTO v_bill_vin
  FROM public.bill_items
  WHERE bill_id = p_bill_id
  ORDER BY line_number ASC
  LIMIT 1;

  -- Perform core bill status void + stock return / import_void movement
  PERFORM public.delete_vehicle_bill(p_bill_id);

  SELECT COALESCE(name, email, 'Admin')
  INTO v_caller_name
  FROM public.staff_profiles
  WHERE id = v_caller_id;

  INSERT INTO public.bill_void_logs (bill_id, bill_number, reason, voided_by, voided_by_name, voided_at)
  VALUES (p_bill_id, v_bill.bill_number, pg_catalog.left(v_reason, 1000), v_caller_id, v_caller_name, now())
  ON CONFLICT (bill_id) DO UPDATE
    SET bill_number = EXCLUDED.bill_number,
        reason = EXCLUDED.reason,
        voided_by = EXCLUDED.voided_by,
        voided_by_name = EXCLUDED.voided_by_name,
        voided_at = EXCLUDED.voided_at;

  -- Atomically revert linked customer state inside the same transaction
  IF v_bill.customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id = v_bill.customer_id FOR UPDATE;
  ELSIF NULLIF(pg_catalog.regexp_replace(COALESCE(v_bill.customer_phone, ''), '[^0-9]', '', 'g'), '') IS NOT NULL THEN
    SELECT * INTO v_customer
    FROM public.customers
    WHERE pg_catalog.regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')
        = pg_catalog.regexp_replace(COALESCE(v_bill.customer_phone, ''), '[^0-9]', '', 'g')
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_customer.id IS NOT NULL THEN
    IF v_bill.type::text = 'installment' AND COALESCE(v_bill.installment_period, 0) >= 1 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.bills
        WHERE customer_id = v_customer.id
          AND installment_period = v_bill.installment_period
          AND type::text = 'installment'
          AND COALESCE(status::text, 'completed') <> 'voided'
      ) THEN
        v_records := COALESCE(v_customer.installment_records, '[]'::jsonb);
        FOR v_idx IN 0..(GREATEST(jsonb_array_length(v_records), 0) - 1) LOOP
          v_entry := v_records->v_idx;
          IF COALESCE((v_entry->>'period')::integer, -1) = v_bill.installment_period THEN
            v_due_date := NULLIF(v_entry->>'dueDate', '')::date;
            v_entry := (v_entry - 'paidDate' - 'paidAmountUSD' - 'paidAmountLAK' - 'paymentMethod' - 'bankName' - 'transferRef' - 'receiptNo' - 'notes' - 'collectedBy')
              || jsonb_build_object('status', CASE WHEN v_due_date IS NOT NULL AND v_due_date < v_today THEN 'due' ELSE 'pending' END);
          END IF;
          v_new_records := v_new_records || jsonb_build_array(v_entry);
          IF COALESCE(v_entry->>'status', '') = 'paid' THEN
            v_total_paid_usd := v_total_paid_usd + COALESCE((v_entry->>'paidAmountUSD')::numeric, (v_entry->>'amountUSD')::numeric, 0);
            v_total_paid_lak := v_total_paid_lak + COALESCE((v_entry->>'paidAmountLAK')::numeric, (v_entry->>'amountLAK')::numeric, 0);
          END IF;
        END LOOP;

        v_total_paid_usd := (
          CASE
            WHEN v_customer.payment_type IN ('installment', 'finance') OR COALESCE(v_customer.down_payment_usd, 0) > 0
              THEN COALESCE(v_customer.down_payment_usd, 0)
            ELSE 0
          END
        ) + v_total_paid_usd;
        v_total_paid_lak := pg_catalog.round(
          (
            CASE
              WHEN v_customer.payment_type IN ('installment', 'finance') OR COALESCE(v_customer.down_payment_usd, 0) > 0
                THEN COALESCE(v_customer.down_payment_usd, 0)
              ELSE 0
            END
          ) * public._get_lak_exchange_rate()
        ) + v_total_paid_lak;

        UPDATE public.customers
        SET installment_records = v_new_records,
            paid_amount_usd = v_total_paid_usd,
            paid_amount_lak = v_total_paid_lak,
            installment_status = 'active_repaying',
            is_payment_completed = false,
            last_follow_up = now(),
            updated_at = now()
        WHERE id = v_customer.id;
        v_reverted_customer_id := v_customer.id;
      END IF;
    ELSIF v_bill.type::text IN ('sale', 'installment') AND COALESCE(v_bill.installment_period, 0) = 0 THEN
      -- Opening POS sale bill voided: revert customer unless another active opening sale bill exists
      IF NOT EXISTS (
        SELECT 1 FROM public.bills
        WHERE customer_id = v_customer.id
          AND type::text IN ('sale', 'installment')
          AND COALESCE(installment_period, 0) = 0
          AND COALESCE(status::text, 'completed') <> 'voided'
      ) THEN
        UPDATE public.customers
        SET status = 'negotiation',
            vin = CASE WHEN v_bill_vin IS NOT NULL AND vin = v_bill_vin THEN NULL ELSE vin END,
            engine_number = CASE WHEN v_bill_vin IS NOT NULL AND vin = v_bill_vin THEN NULL ELSE engine_number END,
            vehicle_delivered_at = NULL,
            vehicle_delivered_by = NULL,
            delivery_note = NULL,
            installment_records = '[]'::jsonb,
            payment_type_confirmed = NULL,
            is_payment_completed = false,
            paid_amount_usd = NULL,
            paid_amount_lak = NULL,
            payment_receipt_no = NULL,
            installment_status = NULL,
            contact_history = CASE
              WHEN NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(COALESCE(contact_history, '[]'::jsonb)) elem
                WHERE elem->>'id' = v_entry_id
              ) THEN COALESCE(contact_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                'id', v_entry_id,
                'at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'type', 'status',
                'note', 'Voided bill ' || COALESCE(v_bill.bill_number, p_bill_id::text) || ': ' || v_reason,
                'by', v_caller_name
              ))
              ELSE contact_history
            END,
            last_follow_up = now(),
            updated_at = now()
        WHERE id = v_customer.id;
        v_reverted_customer_id := v_customer.id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'bill_id', p_bill_id,
    'bill_number', v_bill.bill_number,
    'voided_by', v_caller_id,
    'voided_by_name', v_caller_name,
    'voided_at', now(),
    'reason', v_reason,
    'reverted_customer_id', v_reverted_customer_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.void_bill_with_reason(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_bill_with_reason(uuid, text) TO authenticated;

-- 16. Atomic upsert_customer_pipeline with contact_history merge & sales financial guard (B-02, H-03)
CREATE OR REPLACE FUNCTION public.upsert_customer_pipeline(
  p_customer jsonb,
  p_removed_contact_ids jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_caller_role text;
  v_customer_id uuid := COALESCE(NULLIF(p_customer->>'id', '')::uuid, gen_random_uuid());
  v_existing public.customers%ROWTYPE;
  v_has_existing boolean := false;
  v_client_history jsonb := CASE WHEN jsonb_typeof(p_customer->'contact_history') = 'array' THEN p_customer->'contact_history' ELSE '[]'::jsonb END;
  v_db_history jsonb := '[]'::jsonb;
  v_merged_history jsonb := '[]'::jsonb;
  v_removed_ids text[];
  v_is_admin boolean;
  v_model_id text := NULLIF(btrim(COALESCE(p_customer->>'interested_model_id', '')), '');
  v_req_vin text := NULLIF(btrim(COALESCE(p_customer->>'vin', '')), '');
  v_can_set_sale_vin boolean := false;
  v_next_status text;
  v_assigned_to uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  SELECT role::text INTO v_caller_role FROM public.staff_profiles WHERE id = v_caller_id AND status = 'active';
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin', 'sales') THEN
    RAISE EXCEPTION 'Permission denied: active admin or sales role required.';
  END IF;

  v_is_admin := v_caller_role IN ('super_admin', 'admin');

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_customer_id::text));

  SELECT * INTO v_existing FROM public.customers WHERE id = v_customer_id FOR UPDATE;
  v_has_existing := FOUND;

  SELECT COALESCE(array_agg(elem), ARRAY[]::text[])
  INTO v_removed_ids
  FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_removed_contact_ids) = 'array' THEN p_removed_contact_ids ELSE '[]'::jsonb END) AS elem;

  v_db_history := CASE WHEN v_has_existing AND jsonb_typeof(v_existing.contact_history) = 'array' THEN v_existing.contact_history ELSE '[]'::jsonb END;

  -- Union DB + client entries deduplicated by entry id (including legacy items via deterministic hash) in chronological order
  WITH combined AS (
    SELECT
      CASE WHEN NULLIF(elem->>'id', '') IS NOT NULL THEN elem
           ELSE elem || jsonb_build_object('id', 'legacy-' || pg_catalog.md5(COALESCE(elem->>'at', '') || '|' || COALESCE(elem->>'note', '')))
      END AS elem,
      1 AS ord,
      ordinality AS sub_ord
    FROM jsonb_array_elements(v_db_history) WITH ORDINALITY AS t(elem, ordinality)
    UNION ALL
    SELECT
      CASE WHEN NULLIF(elem->>'id', '') IS NOT NULL THEN elem
           ELSE elem || jsonb_build_object('id', 'legacy-' || pg_catalog.md5(COALESCE(elem->>'at', '') || '|' || COALESCE(elem->>'note', '')))
      END AS elem,
      2 AS ord,
      ordinality AS sub_ord
    FROM jsonb_array_elements(v_client_history) WITH ORDINALITY AS t(elem, ordinality)
  ),
  deduped AS (
    SELECT DISTINCT ON (elem->>'id') elem, ord, sub_ord
    FROM combined
    WHERE NOT ((elem->>'id') = ANY(v_removed_ids))
    ORDER BY elem->>'id', ord DESC, sub_ord ASC
  )
  SELECT COALESCE(
    jsonb_agg(elem ORDER BY COALESCE(NULLIF(elem->>'at', ''), '') ASC, ord ASC, sub_ord ASC),
    '[]'::jsonb
  )
  INTO v_merged_history
  FROM deduped;

  -- Verify whether caller can set delivery/VIN on a newly linked post-sale owner row
  IF v_is_admin THEN
    v_can_set_sale_vin := true;
  ELSIF NOT v_has_existing AND v_req_vin IS NOT NULL THEN
    v_can_set_sale_vin := EXISTS (
      SELECT 1
      FROM public.bills b
      JOIN public.bill_items bi ON bi.bill_id = b.id
      WHERE b.type::text IN ('sale', 'installment')
        AND COALESCE(b.status::text, 'completed') <> 'voided'
        AND COALESCE(b.installment_period, 0) = 0
        AND bi.vehicle_vin = v_req_vin
        AND COALESCE(b.sales_rep, b.recorded_by) = v_caller_id
    );
  END IF;

  -- Resolve safe CRM status: non-admins cannot leave 'delivered' or escalate to 'delivered' without matching own active sale bill
  v_next_status := COALESCE(NULLIF(p_customer->>'status', ''), CASE WHEN v_has_existing THEN v_existing.status ELSE 'new' END);
  IF NOT v_is_admin THEN
    IF v_has_existing AND v_existing.status = 'delivered' THEN
      v_next_status := 'delivered';
    ELSIF v_next_status = 'delivered' AND NOT v_can_set_sale_vin THEN
      v_next_status := COALESCE(NULLIF(v_existing.status, ''), 'negotiation');
    END IF;
  END IF;

  IF v_is_admin THEN
    IF NULLIF(p_customer->>'assigned_to', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_assigned_to := (p_customer->>'assigned_to')::uuid;
    ELSIF v_has_existing THEN
      v_assigned_to := v_existing.assigned_to;
    ELSE
      v_assigned_to := v_caller_id;
    END IF;
  ELSE
    -- Non-admin insert assigns caller; update preserves existing owner unless currently NULL
    v_assigned_to := COALESCE(v_existing.assigned_to, v_caller_id);
  END IF;

  INSERT INTO public.customers (
    id, name, phone, email, category, source, interested_model_id, status, priority, budget,
    assigned_to, notes, last_follow_up, next_test_drive_at, id_card_number, province, district, village,
    next_follow_up_at, contact_history, booking_deposit_usd, booking_payment_method, booking_date, booking_note,
    vehicle_delivered_at, vehicle_delivered_by, delivery_note,
    list_price_usd, discount_usd, delivery_window, gift_items, gift_budget_usd,
    payment_type, down_payment_percent, down_payment_usd, finance_company, tenure_months, monthly_payment_lak,
    installment_status, paid_amount_usd, paid_amount_lak, payment_date, payment_method_ref, payment_bank,
    payment_receipt_no, payment_confirmed_by, payment_type_confirmed, installment_records, paid_date,
    is_payment_completed, plate_number, vin, engine_number, color,
    current_mileage_km, battery_health_soh, warranty_start_date, warranty_expiry_date,
    warranty_years, warranty_distance_km, warranty_terms, after_sales_notes, created_at, updated_at
  ) VALUES (
    v_customer_id,
    COALESCE(NULLIF(btrim(COALESCE(p_customer->>'name', '')), ''), 'Customer'),
    COALESCE(NULLIF(btrim(COALESCE(p_customer->>'phone', '')), ''), 'N/A'),
    NULLIF(btrim(COALESCE(p_customer->>'email', '')), ''),
    COALESCE(NULLIF(p_customer->>'category', ''), 'walk_in'),
    NULLIF(p_customer->>'source', ''),
    v_model_id,
    v_next_status,
    COALESCE(NULLIF(p_customer->>'priority', ''), 'normal'),
    NULLIF(p_customer->>'budget', ''),
    v_assigned_to,
    NULLIF(p_customer->>'notes', ''),
    NULLIF(p_customer->>'last_follow_up', '')::timestamptz,
    NULLIF(p_customer->>'next_test_drive_at', '')::timestamptz,
    NULLIF(p_customer->>'id_card_number', ''),
    NULLIF(p_customer->>'province', ''),
    NULLIF(p_customer->>'district', ''),
    NULLIF(p_customer->>'village', ''),
    NULLIF(p_customer->>'next_follow_up_at', '')::date,
    v_merged_history,
    CASE WHEN NULLIF(p_customer->>'booking_deposit_usd', '') IS NOT NULL THEN GREATEST((p_customer->>'booking_deposit_usd')::numeric, 0) ELSE NULL END,
    CASE WHEN p_customer->>'booking_payment_method' IN ('cash', 'transfer') THEN p_customer->>'booking_payment_method' ELSE NULL END,
    NULLIF(p_customer->>'booking_date', '')::date,
    NULLIF(p_customer->>'booking_note', ''),
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'vehicle_delivered_at', '')::date ELSE NULL END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'vehicle_delivered_by', '') ELSE NULL END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'delivery_note', '') ELSE NULL END,
    CASE WHEN NULLIF(p_customer->>'list_price_usd', '') IS NOT NULL THEN GREATEST((p_customer->>'list_price_usd')::numeric, 0) ELSE NULL END,
    CASE WHEN v_is_admin AND NULLIF(p_customer->>'discount_usd', '') IS NOT NULL THEN GREATEST((p_customer->>'discount_usd')::numeric, 0) ELSE NULL END,
    NULLIF(p_customer->>'delivery_window', ''),
    CASE WHEN jsonb_typeof(p_customer->'gift_items') = 'array' THEN p_customer->'gift_items' ELSE '[]'::jsonb END,
    CASE WHEN NULLIF(p_customer->>'gift_budget_usd', '') IS NOT NULL THEN GREATEST((p_customer->>'gift_budget_usd')::numeric, 0) ELSE NULL END,
    -- Financial / installment / settlement columns: strictly admin-writable or initialized empty for sales
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'payment_type', '') ELSE CASE WHEN p_customer->>'payment_type' IN ('cash','installment','finance') THEN p_customer->>'payment_type' ELSE NULL END END,
    CASE WHEN v_is_admin AND NULLIF(p_customer->>'down_payment_percent', '') IS NOT NULL THEN (p_customer->>'down_payment_percent')::numeric ELSE NULL END,
    CASE WHEN v_is_admin AND NULLIF(p_customer->>'down_payment_usd', '') IS NOT NULL THEN (p_customer->>'down_payment_usd')::numeric ELSE NULL END,
    NULLIF(p_customer->>'finance_company', ''),
    CASE WHEN v_is_admin AND NULLIF(p_customer->>'tenure_months', '') IS NOT NULL THEN (p_customer->>'tenure_months')::integer ELSE NULL END,
    CASE WHEN v_is_admin AND NULLIF(p_customer->>'monthly_payment_lak', '') IS NOT NULL THEN (p_customer->>'monthly_payment_lak')::numeric ELSE NULL END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'installment_status', '') ELSE NULL END,
    CASE WHEN v_is_admin AND NULLIF(p_customer->>'paid_amount_usd', '') IS NOT NULL THEN (p_customer->>'paid_amount_usd')::numeric ELSE NULL END,
    CASE WHEN v_is_admin AND NULLIF(p_customer->>'paid_amount_lak', '') IS NOT NULL THEN (p_customer->>'paid_amount_lak')::numeric ELSE NULL END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'payment_date', '') ELSE NULL END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'payment_method_ref', '') ELSE NULL END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'payment_bank', '') ELSE NULL END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'payment_receipt_no', '') ELSE NULL END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'payment_confirmed_by', '') ELSE NULL END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'payment_type_confirmed', '') ELSE NULL END,
    CASE WHEN v_is_admin AND jsonb_typeof(p_customer->'installment_records') = 'array' THEN p_customer->'installment_records' ELSE '[]'::jsonb END,
    CASE WHEN v_is_admin THEN NULLIF(p_customer->>'paid_date', '') ELSE NULL END,
    CASE WHEN v_is_admin THEN COALESCE((p_customer->>'is_payment_completed')::boolean, false) ELSE false END,
    NULLIF(p_customer->>'plate_number', ''),
    CASE WHEN v_can_set_sale_vin THEN v_req_vin ELSE NULL END,
    NULLIF(p_customer->>'engine_number', ''),
    NULLIF(p_customer->>'color', ''),
    CASE WHEN NULLIF(p_customer->>'current_mileage_km', '') IS NOT NULL THEN (p_customer->>'current_mileage_km')::numeric ELSE NULL END,
    CASE WHEN NULLIF(p_customer->>'battery_health_soh', '') IS NOT NULL THEN (p_customer->>'battery_health_soh')::numeric ELSE NULL END,
    NULLIF(p_customer->>'warranty_start_date', ''),
    NULLIF(p_customer->>'warranty_expiry_date', ''),
    CASE WHEN NULLIF(p_customer->>'warranty_years', '') IS NOT NULL THEN (p_customer->>'warranty_years')::integer ELSE NULL END,
    CASE WHEN NULLIF(p_customer->>'warranty_distance_km', '') IS NOT NULL THEN (p_customer->>'warranty_distance_km')::numeric ELSE NULL END,
    NULLIF(p_customer->>'warranty_terms', ''),
    NULLIF(p_customer->>'after_sales_notes', ''),
    COALESCE(NULLIF(p_customer->>'created_at', '')::timestamptz, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = CASE WHEN p_customer ? 'name' THEN EXCLUDED.name ELSE public.customers.name END,
    phone = CASE WHEN p_customer ? 'phone' THEN EXCLUDED.phone ELSE public.customers.phone END,
    email = CASE WHEN p_customer ? 'email' THEN EXCLUDED.email ELSE public.customers.email END,
    category = CASE WHEN p_customer ? 'category' THEN EXCLUDED.category ELSE public.customers.category END,
    source = CASE WHEN p_customer ? 'source' THEN EXCLUDED.source ELSE public.customers.source END,
    interested_model_id = CASE WHEN (p_customer ? 'interested_model_id') AND (v_is_admin OR COALESCE(v_existing.status, '') <> 'delivered') THEN EXCLUDED.interested_model_id ELSE public.customers.interested_model_id END,
    status = EXCLUDED.status,
    priority = CASE WHEN p_customer ? 'priority' THEN EXCLUDED.priority ELSE public.customers.priority END,
    budget = CASE WHEN p_customer ? 'budget' THEN EXCLUDED.budget ELSE public.customers.budget END,
    assigned_to = EXCLUDED.assigned_to,
    notes = CASE WHEN p_customer ? 'notes' THEN EXCLUDED.notes ELSE public.customers.notes END,
    last_follow_up = CASE WHEN p_customer ? 'last_follow_up' THEN EXCLUDED.last_follow_up ELSE public.customers.last_follow_up END,
    next_test_drive_at = CASE WHEN p_customer ? 'next_test_drive_at' THEN EXCLUDED.next_test_drive_at ELSE public.customers.next_test_drive_at END,
    id_card_number = CASE WHEN p_customer ? 'id_card_number' THEN EXCLUDED.id_card_number ELSE public.customers.id_card_number END,
    province = CASE WHEN p_customer ? 'province' THEN EXCLUDED.province ELSE public.customers.province END,
    district = CASE WHEN p_customer ? 'district' THEN EXCLUDED.district ELSE public.customers.district END,
    village = CASE WHEN p_customer ? 'village' THEN EXCLUDED.village ELSE public.customers.village END,
    next_follow_up_at = CASE WHEN p_customer ? 'next_follow_up_at' THEN EXCLUDED.next_follow_up_at ELSE public.customers.next_follow_up_at END,
    contact_history = v_merged_history,
    booking_deposit_usd = CASE WHEN (p_customer ? 'booking_deposit_usd') AND (v_is_admin OR COALESCE(v_existing.status, '') <> 'delivered') THEN EXCLUDED.booking_deposit_usd ELSE public.customers.booking_deposit_usd END,
    booking_payment_method = CASE WHEN (p_customer ? 'booking_payment_method') AND (v_is_admin OR COALESCE(v_existing.status, '') <> 'delivered') THEN EXCLUDED.booking_payment_method ELSE public.customers.booking_payment_method END,
    booking_date = CASE WHEN (p_customer ? 'booking_date') AND (v_is_admin OR COALESCE(v_existing.status, '') <> 'delivered') THEN EXCLUDED.booking_date ELSE public.customers.booking_date END,
    booking_note = CASE WHEN (p_customer ? 'booking_note') AND (v_is_admin OR COALESCE(v_existing.status, '') <> 'delivered') THEN EXCLUDED.booking_note ELSE public.customers.booking_note END,
    vehicle_delivered_at = CASE WHEN (p_customer ? 'vehicle_delivered_at') AND v_is_admin THEN EXCLUDED.vehicle_delivered_at ELSE public.customers.vehicle_delivered_at END,
    vehicle_delivered_by = CASE WHEN (p_customer ? 'vehicle_delivered_by') AND v_is_admin THEN EXCLUDED.vehicle_delivered_by ELSE public.customers.vehicle_delivered_by END,
    delivery_note = CASE WHEN (p_customer ? 'delivery_note') AND v_is_admin THEN EXCLUDED.delivery_note ELSE public.customers.delivery_note END,
    list_price_usd = CASE WHEN (p_customer ? 'list_price_usd') AND (v_is_admin OR COALESCE(v_existing.status, '') <> 'delivered') THEN EXCLUDED.list_price_usd ELSE public.customers.list_price_usd END,
    discount_usd = CASE WHEN (p_customer ? 'discount_usd') AND v_is_admin THEN EXCLUDED.discount_usd ELSE public.customers.discount_usd END,
    delivery_window = CASE WHEN p_customer ? 'delivery_window' THEN EXCLUDED.delivery_window ELSE public.customers.delivery_window END,
    gift_items = CASE WHEN (p_customer ? 'gift_items') AND (v_is_admin OR COALESCE(v_existing.status, '') <> 'delivered') THEN EXCLUDED.gift_items ELSE public.customers.gift_items END,
    gift_budget_usd = CASE WHEN (p_customer ? 'gift_budget_usd') AND (v_is_admin OR COALESCE(v_existing.status, '') <> 'delivered') THEN EXCLUDED.gift_budget_usd ELSE public.customers.gift_budget_usd END,
    finance_company = CASE WHEN p_customer ? 'finance_company' THEN EXCLUDED.finance_company ELSE public.customers.finance_company END,
    payment_type = CASE WHEN NOT (p_customer ? 'payment_type') THEN public.customers.payment_type WHEN v_is_admin THEN EXCLUDED.payment_type ELSE COALESCE(v_existing.payment_type, EXCLUDED.payment_type) END,
    down_payment_percent = CASE WHEN (p_customer ? 'down_payment_percent') AND v_is_admin THEN EXCLUDED.down_payment_percent ELSE public.customers.down_payment_percent END,
    down_payment_usd = CASE WHEN (p_customer ? 'down_payment_usd') AND v_is_admin THEN EXCLUDED.down_payment_usd ELSE public.customers.down_payment_usd END,
    tenure_months = CASE WHEN (p_customer ? 'tenure_months') AND v_is_admin THEN EXCLUDED.tenure_months ELSE public.customers.tenure_months END,
    monthly_payment_lak = CASE WHEN (p_customer ? 'monthly_payment_lak') AND v_is_admin THEN EXCLUDED.monthly_payment_lak ELSE public.customers.monthly_payment_lak END,
    installment_status = CASE WHEN (p_customer ? 'installment_status') AND v_is_admin THEN EXCLUDED.installment_status ELSE public.customers.installment_status END,
    paid_amount_usd = CASE WHEN (p_customer ? 'paid_amount_usd') AND v_is_admin THEN EXCLUDED.paid_amount_usd ELSE public.customers.paid_amount_usd END,
    paid_amount_lak = CASE WHEN (p_customer ? 'paid_amount_lak') AND v_is_admin THEN EXCLUDED.paid_amount_lak ELSE public.customers.paid_amount_lak END,
    payment_date = CASE WHEN (p_customer ? 'payment_date') AND v_is_admin THEN EXCLUDED.payment_date ELSE public.customers.payment_date END,
    payment_method_ref = CASE WHEN (p_customer ? 'payment_method_ref') AND v_is_admin THEN EXCLUDED.payment_method_ref ELSE public.customers.payment_method_ref END,
    payment_bank = CASE WHEN (p_customer ? 'payment_bank') AND v_is_admin THEN EXCLUDED.payment_bank ELSE public.customers.payment_bank END,
    payment_receipt_no = CASE WHEN (p_customer ? 'payment_receipt_no') AND v_is_admin THEN EXCLUDED.payment_receipt_no ELSE public.customers.payment_receipt_no END,
    payment_confirmed_by = CASE WHEN (p_customer ? 'payment_confirmed_by') AND v_is_admin THEN EXCLUDED.payment_confirmed_by ELSE public.customers.payment_confirmed_by END,
    payment_type_confirmed = CASE WHEN (p_customer ? 'payment_type_confirmed') AND v_is_admin THEN EXCLUDED.payment_type_confirmed ELSE public.customers.payment_type_confirmed END,
    installment_records = CASE WHEN (p_customer ? 'installment_records') AND v_is_admin THEN EXCLUDED.installment_records ELSE public.customers.installment_records END,
    paid_date = CASE WHEN (p_customer ? 'paid_date') AND v_is_admin THEN EXCLUDED.paid_date ELSE public.customers.paid_date END,
    is_payment_completed = CASE WHEN (p_customer ? 'is_payment_completed') AND v_is_admin THEN EXCLUDED.is_payment_completed ELSE public.customers.is_payment_completed END,
    plate_number = CASE WHEN p_customer ? 'plate_number' THEN EXCLUDED.plate_number ELSE public.customers.plate_number END,
    vin = CASE WHEN (p_customer ? 'vin') AND v_is_admin THEN EXCLUDED.vin ELSE public.customers.vin END,
    engine_number = CASE WHEN p_customer ? 'engine_number' THEN EXCLUDED.engine_number ELSE public.customers.engine_number END,
    color = CASE WHEN p_customer ? 'color' THEN EXCLUDED.color ELSE public.customers.color END,
    current_mileage_km = CASE WHEN p_customer ? 'current_mileage_km' THEN EXCLUDED.current_mileage_km ELSE public.customers.current_mileage_km END,
    battery_health_soh = CASE WHEN p_customer ? 'battery_health_soh' THEN EXCLUDED.battery_health_soh ELSE public.customers.battery_health_soh END,
    warranty_start_date = CASE WHEN p_customer ? 'warranty_start_date' THEN EXCLUDED.warranty_start_date ELSE public.customers.warranty_start_date END,
    warranty_expiry_date = CASE WHEN p_customer ? 'warranty_expiry_date' THEN EXCLUDED.warranty_expiry_date ELSE public.customers.warranty_expiry_date END,
    warranty_years = CASE WHEN p_customer ? 'warranty_years' THEN EXCLUDED.warranty_years ELSE public.customers.warranty_years END,
    warranty_distance_km = CASE WHEN p_customer ? 'warranty_distance_km' THEN EXCLUDED.warranty_distance_km ELSE public.customers.warranty_distance_km END,
    warranty_terms = CASE WHEN p_customer ? 'warranty_terms' THEN EXCLUDED.warranty_terms ELSE public.customers.warranty_terms END,
    after_sales_notes = CASE WHEN p_customer ? 'after_sales_notes' THEN EXCLUDED.after_sales_notes ELSE public.customers.after_sales_notes END,
    updated_at = now();

  RETURN jsonb_build_object(
    'id', v_customer_id,
    'contact_history', v_merged_history
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_customer_pipeline(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_customer_pipeline(jsonb, jsonb) TO authenticated;

-- 17. patch_dealership_settings & update_own_staff_profile RPCs (H-03, H-04)
CREATE OR REPLACE FUNCTION public.patch_dealership_settings(
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_config jsonb;
BEGIN
  IF v_caller_id IS NULL OR NOT COALESCE(public.is_active_staff(), false) THEN
    RAISE EXCEPTION 'Unauthorized: active staff required.';
  END IF;

  IF NOT (COALESCE(public.has_permission('canManageUsers'), false) OR COALESCE(public.has_permission('canUploadQR'), false)) THEN
    RAISE EXCEPTION 'Permission denied: settings modification requires user-management or QR permissions.';
  END IF;

  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'Settings patch must be a JSON object.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(99887766);

  INSERT INTO public.dealership_settings (id, config, updated_by, updated_at)
  VALUES (TRUE, p_patch, v_caller_id, now())
  ON CONFLICT (id) DO UPDATE SET
    config = COALESCE(public.dealership_settings.config, '{}'::jsonb) || p_patch,
    updated_by = v_caller_id,
    updated_at = now()
  RETURNING config INTO v_config;

  RETURN v_config;
END;
$$;

REVOKE ALL ON FUNCTION public.patch_dealership_settings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patch_dealership_settings(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_own_staff_profile(
  p_name text,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
BEGIN
  IF v_caller_id IS NULL OR NOT COALESCE(public.is_active_staff(), false) THEN
    RAISE EXCEPTION 'Unauthorized: active staff profile required.';
  END IF;

  IF NULLIF(btrim(COALESCE(p_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Profile name cannot be empty.';
  END IF;

  UPDATE public.staff_profiles
  SET name = btrim(p_name),
      phone = NULLIF(btrim(COALESCE(p_phone, '')), ''),
      department = NULLIF(btrim(COALESCE(p_department, '')), ''),
      updated_at = now()
  WHERE id = v_caller_id
    AND status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_staff_profile(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_staff_profile(text, text, text) TO authenticated;

-- 18. Upgrade get_sales_leaderboard & add get_dashboard_sales_summary (H-04 / B-01 clean visibility)
CREATE OR REPLACE FUNCTION public.get_sales_leaderboard(
  p_period TEXT DEFAULT 'month',
  p_target_date DATE DEFAULT NULL
)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  role TEXT,
  delivered_units BIGINT,
  total_revenue_usd NUMERIC,
  avg_discount_usd NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_ref date := COALESCE(p_target_date, (now() AT TIME ZONE 'Asia/Vientiane')::date);
  v_start date;
  v_end date;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.is_active_staff(), false) THEN
    RAISE EXCEPTION 'Unauthorized: active staff required.';
  END IF;

  IF p_period = 'day' THEN
    v_start := v_ref;
    v_end := v_ref;
  ELSIF p_period = 'week' THEN
    -- ISO week starts Monday
    v_start := v_ref - ((EXTRACT(ISODOW FROM v_ref)::integer) - 1);
    v_end := v_ref;
  ELSIF p_period = 'year' THEN
    v_start := date_trunc('year', v_ref)::date;
    v_end := v_ref;
  ELSIF p_period = 'quarter' THEN
    v_start := date_trunc('quarter', v_ref)::date;
    v_end := (v_start + interval '3 months' - interval '1 day')::date;
  ELSE
    v_start := date_trunc('month', v_ref)::date;
    v_end := v_ref;
  END IF;

  RETURN QUERY
  WITH opening_bills AS (
    SELECT
      b.id,
      b.customer_id,
      COALESCE(b.sales_rep, b.recorded_by) AS rep_id,
      b.total_usd,
      CASE
        WHEN NULLIF(b.bill_date::text, '') IS NOT NULL AND b.bill_date::text ~ '^\d{4}-\d{2}-\d{2}'
          THEN left(b.bill_date::text, 10)::date
        ELSE (b.created_at AT TIME ZONE 'Asia/Vientiane')::date
      END AS close_date,
      COALESCE(
        NULLIF(bi.vehicle_vin, ''),
        'cust:' || COALESCE(b.customer_id::text, b.id::text)
      ) AS deal_key,
      COALESCE(bi.discount_usd, 0) AS discount_usd,
      b.created_at
    FROM public.bills b
    LEFT JOIN LATERAL (
      SELECT bi0.vehicle_vin, bi0.discount_usd
      FROM public.bill_items bi0
      WHERE bi0.bill_id = b.id
      ORDER BY bi0.line_number ASC
      LIMIT 1
    ) bi ON TRUE
    WHERE b.type::text IN ('sale', 'installment')
      AND COALESCE(b.status::text, 'completed') <> 'voided'
      AND COALESCE(b.installment_period, 0) = 0
  ),
  dedup_deals AS (
    SELECT DISTINCT ON (deal_key)
      rep_id,
      NULL::text AS excel_rep_name,
      total_usd,
      discount_usd,
      close_date,
      customer_id,
      deal_key
    FROM opening_bills
    ORDER BY deal_key, close_date ASC, created_at ASC
  ),
  excel_deliveries AS (
    SELECT
      c.assigned_to AS rep_id,
      GREATEST(0, COALESCE(c.list_price_usd - COALESCE(c.discount_usd, 0), c.paid_amount_usd, 0))::numeric AS total_usd,
      0::numeric AS discount_usd,
      c.vehicle_delivered_at AS close_date
    FROM public.customers c
    WHERE c.vehicle_delivered_at IS NOT NULL
      AND c.vehicle_delivered_at BETWEEN v_start AND v_end
      AND NOT EXISTS (SELECT 1 FROM dedup_deals d WHERE d.customer_id = c.id OR (NULLIF(c.vin, '') IS NOT NULL AND d.deal_key = c.vin))
  ),
  all_deals AS (
    SELECT rep_id, total_usd, discount_usd
    FROM dedup_deals
    WHERE close_date BETWEEN v_start AND v_end
    UNION ALL
    SELECT rep_id, total_usd, discount_usd
    FROM excel_deliveries
  )
  SELECT
    sp.id AS staff_id,
    sp.name AS staff_name,
    sp.role::text AS role,
    COUNT(ad.rep_id)::BIGINT AS delivered_units,
    COALESCE(SUM(ad.total_usd), 0)::NUMERIC AS total_revenue_usd,
    CASE
      WHEN COALESCE(public.has_permission('canViewFinancials'), false)
        OR public.is_admin()
        OR public.is_super_admin()
        THEN COALESCE(AVG(ad.discount_usd), 0)::NUMERIC
      ELSE NULL::NUMERIC
    END AS avg_discount_usd
  FROM public.staff_profiles sp
  LEFT JOIN all_deals ad
    ON ad.rep_id = sp.id
  WHERE sp.status = 'active'
    AND sp.role::text IN ('super_admin', 'admin', 'sales')
  GROUP BY sp.id, sp.name, sp.role
  ORDER BY delivered_units DESC, total_revenue_usd DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_sales_summary(
  p_period TEXT DEFAULT 'month',
  p_target_date DATE DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_ref date := COALESCE(p_target_date, (now() AT TIME ZONE 'Asia/Vientiane')::date);
  v_start date;
  v_end date;
  v_units bigint := 0;
  v_vehicle_rev numeric := 0;
  v_excel_units bigint := 0;
  v_excel_rev numeric := 0;
  v_monthly_collected numeric := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.is_active_staff(), false) THEN
    RAISE EXCEPTION 'Unauthorized: active staff required.';
  END IF;

  IF p_period = 'day' THEN
    v_start := v_ref;
    v_end := v_ref;
  ELSIF p_period = 'week' THEN
    v_start := v_ref - ((EXTRACT(ISODOW FROM v_ref)::integer) - 1);
    v_end := v_ref;
  ELSIF p_period = 'year' THEN
    v_start := date_trunc('year', v_ref)::date;
    v_end := v_ref;
  ELSE
    v_start := date_trunc('month', v_ref)::date;
    v_end := v_ref;
  END IF;

  WITH opening_bills AS (
    SELECT
      b.customer_id,
      b.total_usd,
      CASE
        WHEN NULLIF(b.bill_date::text, '') IS NOT NULL AND b.bill_date::text ~ '^\d{4}-\d{2}-\d{2}'
          THEN left(b.bill_date::text, 10)::date
        ELSE (b.created_at AT TIME ZONE 'Asia/Vientiane')::date
      END AS close_date,
      COALESCE(
        NULLIF((SELECT bi0.vehicle_vin FROM public.bill_items bi0 WHERE bi0.bill_id = b.id ORDER BY bi0.line_number ASC LIMIT 1), ''),
        'cust:' || COALESCE(b.customer_id::text, b.id::text)
      ) AS deal_key,
      b.created_at
    FROM public.bills b
    WHERE b.type::text IN ('sale', 'installment')
      AND COALESCE(b.status::text, 'completed') <> 'voided'
      AND COALESCE(b.installment_period, 0) = 0
  ),
  dedup_deals AS (
    SELECT DISTINCT ON (deal_key) customer_id, deal_key, total_usd, close_date
    FROM opening_bills
    ORDER BY deal_key, close_date ASC, created_at ASC
  )
  SELECT COUNT(*), COALESCE(SUM(total_usd), 0)
  INTO v_units, v_vehicle_rev
  FROM dedup_deals
  WHERE close_date BETWEEN v_start AND v_end;

  SELECT
    COUNT(*),
    COALESCE(SUM(GREATEST(0, COALESCE(c.list_price_usd - COALESCE(c.discount_usd, 0), c.paid_amount_usd, 0))), 0)
  INTO v_excel_units, v_excel_rev
  FROM public.customers c
  WHERE c.vehicle_delivered_at IS NOT NULL
    AND c.vehicle_delivered_at BETWEEN v_start AND v_end
    AND NOT EXISTS (
      SELECT 1 FROM public.bills b
      LEFT JOIN public.bill_items bi ON bi.bill_id = b.id
      WHERE b.type::text IN ('sale', 'installment')
        AND COALESCE(b.status::text, 'completed') <> 'voided'
        AND COALESCE(b.installment_period, 0) = 0
        AND (b.customer_id = c.id OR (NULLIF(c.vin, '') IS NOT NULL AND bi.vehicle_vin = c.vin))
    );

  SELECT COALESCE(SUM(b.total_usd), 0)
  INTO v_monthly_collected
  FROM public.bills b
  WHERE COALESCE(b.status::text, 'completed') <> 'voided'
    AND b.type::text = 'installment'
    AND COALESCE(b.installment_period, 0) >= 1
    AND (
      CASE
        WHEN NULLIF(b.bill_date::text, '') IS NOT NULL AND b.bill_date::text ~ '^\d{4}-\d{2}-\d{2}'
          THEN left(b.bill_date::text, 10)::date
        ELSE (b.created_at AT TIME ZONE 'Asia/Vientiane')::date
      END
    ) BETWEEN v_start AND v_end;

  RETURN jsonb_build_object(
    'total_units', v_units + v_excel_units,
    'vehicle_sales_revenue_usd', v_vehicle_rev + v_excel_rev,
    'monthly_installment_collected_usd', v_monthly_collected
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_sales_summary(TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_sales_summary(TEXT, DATE) TO authenticated;

-- 19. Admin-only staff lead handover RPC
CREATE OR REPLACE FUNCTION public.handover_staff_leads(
  p_from_staff_id uuid DEFAULT NULL,
  p_to_staff_id uuid DEFAULT NULL,
  p_lead_ids uuid[] DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_updated integer := 0;
BEGIN
  IF v_caller_id IS NULL OR NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Permission denied: only administrators can hand over staff leads.';
  END IF;

  IF p_to_staff_id IS NULL THEN
    RAISE EXCEPTION 'Target staff ID is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = p_to_staff_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Target staff account must be active.';
  END IF;

  IF p_lead_ids IS NOT NULL AND array_length(p_lead_ids, 1) > 0 THEN
    UPDATE public.customers
    SET assigned_to = p_to_staff_id,
        updated_at = now()
    WHERE id = ANY(p_lead_ids);
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  ELSIF p_from_staff_id IS NOT NULL THEN
    UPDATE public.customers
    SET assigned_to = p_to_staff_id,
        updated_at = now()
    WHERE assigned_to = p_from_staff_id
      AND COALESCE(status, '') NOT IN ('delivered', 'lost');
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.handover_staff_leads(uuid, uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handover_staff_leads(uuid, uuid, uuid[]) TO authenticated;

COMMIT;
