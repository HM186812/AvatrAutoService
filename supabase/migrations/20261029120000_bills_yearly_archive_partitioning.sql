-- Migration: 20261029120000_bills_yearly_archive_partitioning.sql
-- Description: Implement Option B (Yearly Partitioning / Cold Storage Archive for bills and bill_items)
-- Compliance: Lao PDR Accounting Law 10-Year retention requirement with zero hard deletion.

-- ============================================================
-- 1. PREVENT ACCIDENTAL INVENTORY AUDIT DESTRUCTION
-- Drop CASCADE delete constraint on stock_movements so archived bills do not destroy stock history
-- ============================================================
ALTER TABLE public.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_bill_id_fkey;

-- ============================================================
-- 2. PARTITIONED COLD STORAGE TABLES
-- ============================================================

-- Master partitioned table for historical bills
CREATE TABLE IF NOT EXISTS public.bills_archive (
  id UUID NOT NULL,
  bill_number TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  bill_date TEXT NOT NULL,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_id_card TEXT,
  customer_address TEXT,
  customer_province TEXT,
  sales_rep UUID,
  recorded_by UUID,
  payment_method TEXT,
  qr_used TEXT,
  bank_name TEXT,
  transfer_ref TEXT,
  finance_company TEXT,
  down_payment_percent NUMERIC,
  down_payment_usd NUMERIC,
  tenure_months INTEGER,
  monthly_payment_lak NUMERIC,
  free_gifts JSONB DEFAULT '[]'::jsonb,
  warranty_terms TEXT,
  supplier_name TEXT,
  customs_doc_number TEXT,
  import_entry_port TEXT,
  destination_warehouse TEXT,
  total_usd NUMERIC NOT NULL,
  total_lak NUMERIC NOT NULL,
  payment_slip_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  installment_period INTEGER,
  warranty_start_date TEXT,
  warranty_expiry_date TEXT,
  warranty_years INTEGER,
  warranty_distance_km NUMERIC,
  current_mileage_km NUMERIC,
  battery_health_soh NUMERIC,
  after_sales_notes TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  fiscal_year INTEGER NOT NULL,
  PRIMARY KEY (id, fiscal_year)
) PARTITION BY LIST (fiscal_year);

-- Master partitioned table for historical bill items
CREATE TABLE IF NOT EXISTS public.bill_items_archive (
  id UUID NOT NULL,
  bill_id UUID NOT NULL,
  line_number INTEGER NOT NULL DEFAULT 1,
  vehicle_vin TEXT NOT NULL,
  model_name TEXT NOT NULL,
  trim TEXT,
  plate_number TEXT,
  color TEXT,
  interior_color TEXT,
  battery TEXT,
  unit_price_usd NUMERIC NOT NULL,
  unit_price_lak NUMERIC NOT NULL,
  discount_usd NUMERIC DEFAULT 0,
  discount_lak NUMERIC DEFAULT 0,
  pdi_status_initial TEXT,
  status_initial TEXT,
  inspector_name TEXT,
  event_campaign TEXT,
  event_start_date TEXT,
  event_end_date TEXT,
  event_location TEXT,
  engine_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  fiscal_year INTEGER NOT NULL,
  PRIMARY KEY (id, fiscal_year)
) PARTITION BY LIST (fiscal_year);

-- ============================================================
-- 3. YEARLY PARTITIONS (Physical cold-storage tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bills_archive_2023 PARTITION OF public.bills_archive FOR VALUES IN (2023);
CREATE TABLE IF NOT EXISTS public.bills_archive_2024 PARTITION OF public.bills_archive FOR VALUES IN (2024);
CREATE TABLE IF NOT EXISTS public.bills_archive_2025 PARTITION OF public.bills_archive FOR VALUES IN (2025);
CREATE TABLE IF NOT EXISTS public.bills_archive_2026 PARTITION OF public.bills_archive FOR VALUES IN (2026);
CREATE TABLE IF NOT EXISTS public.bills_archive_2027 PARTITION OF public.bills_archive FOR VALUES IN (2027);
CREATE TABLE IF NOT EXISTS public.bills_archive_default PARTITION OF public.bills_archive DEFAULT;

CREATE TABLE IF NOT EXISTS public.bill_items_archive_2023 PARTITION OF public.bill_items_archive FOR VALUES IN (2023);
CREATE TABLE IF NOT EXISTS public.bill_items_archive_2024 PARTITION OF public.bill_items_archive FOR VALUES IN (2024);
CREATE TABLE IF NOT EXISTS public.bill_items_archive_2025 PARTITION OF public.bill_items_archive FOR VALUES IN (2025);
CREATE TABLE IF NOT EXISTS public.bill_items_archive_2026 PARTITION OF public.bill_items_archive FOR VALUES IN (2026);
CREATE TABLE IF NOT EXISTS public.bill_items_archive_2027 PARTITION OF public.bill_items_archive FOR VALUES IN (2027);
CREATE TABLE IF NOT EXISTS public.bill_items_archive_default PARTITION OF public.bill_items_archive DEFAULT;

-- ============================================================
-- 4. PARTITION INDEXES (Auto-propagated across all yearly partitions)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bills_archive_bill_number ON public.bills_archive (bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_archive_bill_date ON public.bills_archive (bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_archive_status_date ON public.bills_archive (status, bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_archive_customer ON public.bills_archive USING gin (customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bills_archive_sales_rep ON public.bills_archive (sales_rep);

CREATE INDEX IF NOT EXISTS idx_bill_items_archive_bill_id ON public.bill_items_archive (bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_archive_vin ON public.bill_items_archive (vehicle_vin);

-- ============================================================
-- 5. ROW LEVEL SECURITY ON ARCHIVE TABLES
-- ============================================================

ALTER TABLE public.bills_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bills_archive_select" ON public.bills_archive;
CREATE POLICY "bills_archive_select"
  ON public.bills_archive FOR SELECT TO authenticated
  USING (public.is_active_staff());

DROP POLICY IF EXISTS "bill_items_archive_select" ON public.bill_items_archive;
CREATE POLICY "bill_items_archive_select"
  ON public.bill_items_archive FOR SELECT TO authenticated
  USING (public.is_active_staff());

-- Direct mutation is prohibited from client API
DROP POLICY IF EXISTS "bills_archive_insert" ON public.bills_archive;
DROP POLICY IF EXISTS "bills_archive_update" ON public.bills_archive;
DROP POLICY IF EXISTS "bills_archive_delete" ON public.bills_archive;
DROP POLICY IF EXISTS "bill_items_archive_insert" ON public.bill_items_archive;
DROP POLICY IF EXISTS "bill_items_archive_update" ON public.bill_items_archive;
DROP POLICY IF EXISTS "bill_items_archive_delete" ON public.bill_items_archive;

-- ============================================================
-- 6. 10-YEAR UNIFIED AUDIT VIEWS (For Accounting & Tax Audits)
-- ============================================================

CREATE OR REPLACE VIEW public.v_bills_10_year_audit 
WITH (security_invoker = true) AS
SELECT 
  b.id, b.bill_number, b.type, b.status, b.bill_date, b.customer_id, b.customer_name, b.customer_phone,
  b.customer_id_card, b.customer_address, b.customer_province, b.sales_rep, b.recorded_by,
  b.payment_method, b.qr_used, b.bank_name, b.transfer_ref, b.finance_company, b.down_payment_percent,
  b.down_payment_usd, b.tenure_months, b.monthly_payment_lak, b.free_gifts, b.warranty_terms,
  b.supplier_name, b.customs_doc_number, b.import_entry_port, b.destination_warehouse,
  b.total_usd, b.total_lak, b.payment_slip_path, b.notes, b.created_at, b.updated_at,
  b.installment_period, b.warranty_start_date, b.warranty_expiry_date, b.warranty_years,
  b.warranty_distance_km, b.current_mileage_km, b.battery_health_soh, b.after_sales_notes,
  false AS is_archived,
  (CASE 
    WHEN b.bill_date ~ '^\d{4}' THEN substring(b.bill_date from 1 for 4)::integer 
    ELSE EXTRACT(YEAR FROM b.created_at)::integer 
  END) AS fiscal_year,
  COALESCE((
    SELECT jsonb_agg(to_jsonb(bi))
    FROM public.bill_items bi
    WHERE bi.bill_id = b.id
  ), '[]'::jsonb) AS bill_items
FROM public.bills b
UNION ALL
SELECT 
  ba.id, ba.bill_number, ba.type, ba.status, ba.bill_date, ba.customer_id, ba.customer_name, ba.customer_phone,
  ba.customer_id_card, ba.customer_address, ba.customer_province, ba.sales_rep, ba.recorded_by,
  ba.payment_method, ba.qr_used, ba.bank_name, ba.transfer_ref, ba.finance_company, ba.down_payment_percent,
  ba.down_payment_usd, ba.tenure_months, ba.monthly_payment_lak, ba.free_gifts, ba.warranty_terms,
  ba.supplier_name, ba.customs_doc_number, ba.import_entry_port, ba.destination_warehouse,
  ba.total_usd, ba.total_lak, ba.payment_slip_path, ba.notes, ba.created_at, ba.updated_at,
  ba.installment_period, ba.warranty_start_date, ba.warranty_expiry_date, ba.warranty_years,
  ba.warranty_distance_km, ba.current_mileage_km, ba.battery_health_soh, ba.after_sales_notes,
  true AS is_archived,
  ba.fiscal_year,
  COALESCE((
    SELECT jsonb_agg(to_jsonb(bia))
    FROM public.bill_items_archive bia
    WHERE bia.bill_id = ba.id AND bia.fiscal_year = ba.fiscal_year
  ), '[]'::jsonb) AS bill_items
FROM public.bills_archive ba;

CREATE OR REPLACE VIEW public.v_bill_items_10_year_audit 
WITH (security_invoker = true) AS
SELECT 
  bi.id, bi.bill_id, bi.line_number, bi.vehicle_vin, bi.model_name, bi.trim, bi.plate_number, bi.color,
  bi.interior_color, bi.battery, bi.unit_price_usd, bi.unit_price_lak, bi.discount_usd, bi.discount_lak,
  bi.pdi_status_initial, bi.status_initial, bi.inspector_name, bi.event_campaign, bi.event_start_date,
  bi.event_end_date, bi.event_location, bi.engine_number,
  false AS is_archived,
  (CASE 
    WHEN b.bill_date ~ '^\d{4}' THEN substring(b.bill_date from 1 for 4)::integer 
    ELSE EXTRACT(YEAR FROM b.created_at)::integer 
  END) AS fiscal_year
FROM public.bill_items bi
JOIN public.bills b ON b.id = bi.bill_id
UNION ALL
SELECT 
  bia.id, bia.bill_id, bia.line_number, bia.vehicle_vin, bia.model_name, bia.trim, bia.plate_number, bia.color,
  bia.interior_color, bia.battery, bia.unit_price_usd, bia.unit_price_lak, bia.discount_usd, bia.discount_lak,
  bia.pdi_status_initial, bia.status_initial, bia.inspector_name, bia.event_campaign, bia.event_start_date,
  bia.event_end_date, bia.event_location, bia.engine_number,
  true AS is_archived,
  bia.fiscal_year
FROM public.bill_items_archive bia;

GRANT SELECT ON public.v_bills_10_year_audit TO authenticated;
GRANT SELECT ON public.v_bill_items_10_year_audit TO authenticated;
REVOKE ALL ON public.v_bills_10_year_audit FROM anon, public;
REVOKE ALL ON public.v_bill_items_10_year_audit FROM anon, public;

-- ============================================================
-- 7. ATOMIC FISCAL YEAR ARCHIVING RPC FUNCTION
-- Moves closed fiscal year bills from operational tables to cold partitioned tables
-- ============================================================

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
BEGIN
  -- 1. Authorization check: Admin or Super Admin only
  IF NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can archive fiscal year bills.';
  END IF;

  -- 2. Validate year range
  IF p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'Invalid fiscal year: %', p_year;
  END IF;

  -- 3. Safety Guard: Do not allow archiving current or future active year
  IF p_year >= v_current_year THEN
    RAISE EXCEPTION 'Cannot archive current or future fiscal year (%). Only closed fiscal years can be archived.', p_year;
  END IF;

  -- 4. Dynamically ensure yearly partition exists
  BEGIN
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.bills_archive_%s PARTITION OF public.bills_archive FOR VALUES IN (%s);', p_year, p_year);
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.bill_items_archive_%s PARTITION OF public.bill_items_archive FOR VALUES IN (%s);', p_year, p_year);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 5. Copy items of target year bills into bill_items_archive
  WITH moved_items AS (
    INSERT INTO public.bill_items_archive (
      id, bill_id, line_number, vehicle_vin, model_name, trim, plate_number, color,
      interior_color, battery, unit_price_usd, unit_price_lak, discount_usd, discount_lak,
      pdi_status_initial, status_initial, inspector_name, event_campaign, event_start_date,
      event_end_date, event_location, engine_number, archived_at, fiscal_year
    )
    SELECT 
      bi.id, bi.bill_id, bi.line_number, bi.vehicle_vin, bi.model_name, bi.trim, bi.plate_number, bi.color,
      bi.interior_color, bi.battery, bi.unit_price_usd, bi.unit_price_lak, bi.discount_usd, bi.discount_lak,
      bi.pdi_status_initial, bi.status_initial, bi.inspector_name, bi.event_campaign, bi.event_start_date,
      bi.event_end_date, bi.event_location, bi.engine_number, now(), p_year
    FROM public.bill_items bi
    JOIN public.bills b ON b.id = bi.bill_id
    WHERE (b.bill_date LIKE (p_year::text || '%') OR (b.bill_date IS NULL AND EXTRACT(YEAR FROM b.created_at) = p_year))
    ON CONFLICT (id, fiscal_year) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_items_count FROM moved_items;

  -- 6. Copy target year bills into bills_archive
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
    b.id, b.bill_number, b.type, b.status, b.bill_date, b.customer_id, b.customer_name, b.customer_phone,
    b.customer_id_card, b.customer_address, b.customer_province, b.sales_rep, b.recorded_by,
    b.payment_method, b.qr_used, b.bank_name, b.transfer_ref, b.finance_company, b.down_payment_percent,
    b.down_payment_usd, b.tenure_months, b.monthly_payment_lak, b.free_gifts, b.warranty_terms,
    b.supplier_name, b.customs_doc_number, b.import_entry_port, b.destination_warehouse,
    b.total_usd, b.total_lak, b.payment_slip_path, b.notes, b.created_at, b.updated_at,
    b.installment_period, b.warranty_start_date, b.warranty_expiry_date, b.warranty_years,
    b.warranty_distance_km, b.current_mileage_km, b.battery_health_soh, b.after_sales_notes,
    now(), p_year
  FROM public.bills b
  WHERE (b.bill_date LIKE (p_year::text || '%') OR (b.bill_date IS NULL AND EXTRACT(YEAR FROM b.created_at) = p_year))
  ON CONFLICT (id, fiscal_year) DO NOTHING;

  -- 7. Delete moved bills from active table (cascades to bill_items; stock_movements preserved)
  WITH deleted AS (
    DELETE FROM public.bills b
    WHERE (b.bill_date LIKE (p_year::text || '%') OR (b.bill_date IS NULL AND EXTRACT(YEAR FROM b.created_at) = p_year))
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
