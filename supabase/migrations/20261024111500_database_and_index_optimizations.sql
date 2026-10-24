-- Migration: 20261024111500_database_and_index_optimizations.sql
-- Description:
-- 1. Drop 5 duplicate indexes (item 49)
-- 2. Add missing sort indexes on vehicles, customers, appointments, test drives (item 45)
-- 3. Add STABLE helper functions to cache role checks and optimize RLS seq-scans (item 51)
-- 4. Create public.get_showroom_initial_data() RPC for 1-RTT app initialization (item 48)

BEGIN;

-- ============================================================
-- 1. DROP DUPLICATE INDEXES (ITEM 49)
-- ============================================================
DROP INDEX IF EXISTS public.idx_customers_phone;
DROP INDEX IF EXISTS public.idx_bills_customer_id;
DROP INDEX IF EXISTS public.idx_service_appointments_customer_id;
DROP INDEX IF EXISTS public.idx_test_drives_customer_id;
DROP INDEX IF EXISTS public.idx_bill_items_vehicle_vin;

-- ============================================================
-- 2. ADD MISSING SORT INDEXES (ITEM 45)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at_desc ON public.vehicles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_created_at_desc ON public.customers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_appointments_scheduled_asc ON public.service_appointments (scheduled_date ASC);
CREATE INDEX IF NOT EXISTS idx_test_drives_date_asc ON public.test_drives (drive_date ASC);

-- ============================================================
-- 3. STABLE HELPER FUNCTIONS FOR RLS OPTIMIZATION (ITEM 51)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT role
  FROM public.staff_profiles
  WHERE id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles
    WHERE id = auth.uid()
      AND status = 'active'
      AND role IN ('super_admin'::public.staff_role, 'admin'::public.staff_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles
    WHERE id = auth.uid()
      AND status = 'active'
      AND role = 'super_admin'::public.staff_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Update RLS policies to use cached STABLE helpers instead of repeated subqueries
DROP POLICY IF EXISTS "customers_delete_admin" ON public.customers;
CREATE POLICY "customers_delete_admin" ON public.customers
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "vehicle_models_delete_admin" ON public.vehicle_models;
CREATE POLICY "vehicle_models_delete_admin" ON public.vehicle_models
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "staff_roles_insert_super_admin" ON public.staff_roles;
CREATE POLICY "staff_roles_insert_super_admin" ON public.staff_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "staff_roles_update_super_admin" ON public.staff_roles;
CREATE POLICY "staff_roles_update_super_admin" ON public.staff_roles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "staff_roles_delete_super_admin" ON public.staff_roles;
CREATE POLICY "staff_roles_delete_super_admin" ON public.staff_roles
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ============================================================
-- 4. SINGLE INIT RPC FOR 1-RTT SHOWROOM INITIALIZATION (ITEM 48)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_showroom_initial_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_models jsonb;
  v_vehicles jsonb;
  v_customers jsonb;
  v_roles jsonb;
  v_settings jsonb;
BEGIN
  IF NOT public.is_active_staff() THEN
    RAISE EXCEPTION 'Access denied. Active staff credentials required.';
  END IF;

  -- 1. Vehicle Models (compact payload without bloated base64 gallery)
  SELECT COALESCE(jsonb_agg(m), '[]'::jsonb) INTO v_models
  FROM (
    SELECT id, name, category, price_starting_usd, price_starting_lak, hero_image, release_year, status
    FROM public.vehicle_models
    ORDER BY created_at ASC
  ) m;

  -- 2. Vehicles
  SELECT COALESCE(jsonb_agg(v), '[]'::jsonb) INTO v_vehicles
  FROM (
    SELECT *
    FROM public.vehicles
    ORDER BY created_at DESC
    LIMIT 500
  ) v;

  -- 3. Customers (recent 200)
  SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_customers
  FROM (
    SELECT *
    FROM public.customers
    ORDER BY created_at DESC
    LIMIT 200
  ) c;

  -- 4. Staff Roles
  SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) INTO v_roles
  FROM (
    SELECT *
    FROM public.staff_roles
    WHERE is_active = TRUE
    ORDER BY sort_order ASC
  ) r;

  -- 5. Dealership Settings
  SELECT to_jsonb(s) INTO v_settings
  FROM (
    SELECT *
    FROM public.dealership_settings
    LIMIT 1
  ) s;

  RETURN jsonb_build_object(
    'models', v_models,
    'vehicles', v_vehicles,
    'customers', v_customers,
    'roles', v_roles,
    'settings', COALESCE(v_settings, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_showroom_initial_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_showroom_initial_data() TO authenticated;

COMMIT;
