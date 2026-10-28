-- Migration: 20261025152000_bills_and_customers_date_range_indexes.sql
-- Description:
-- 1. Add composite/descending indexes on bills(bill_date), bills(type, bill_date), and customers(payment_date)
--    for fast date-range queries as total records scale beyond 50,000+ rows.
-- 2. Unlock the hardcoded LIMIT 500 on vehicles and LIMIT 250 on customers inside get_showroom_initial_data() RPC.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_bills_bill_date_desc ON public.bills (bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_type_bill_date_desc ON public.bills (type, bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_customers_payment_date_desc ON public.customers (payment_date DESC);

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

  -- 1. Vehicle Models (strictly capped URL, preventing giant base64 payloads)
  SELECT COALESCE(jsonb_agg(m), '[]'::jsonb) INTO v_models
  FROM (
    SELECT id, name, subtitle, tagline, category, price_starting_usd, price_starting_lak,
           CASE 
             WHEN length(hero_image) > 2000 THEN NULL 
             ELSE hero_image 
           END AS hero_image,
           is_custom, colors, features, description, created_at
    FROM public.vehicle_models
    ORDER BY created_at ASC
  ) m;

  -- 2. Vehicles (unlocked limit)
  SELECT COALESCE(jsonb_agg(v), '[]'::jsonb) INTO v_vehicles
  FROM (
    SELECT *
    FROM public.vehicles
    ORDER BY created_at DESC
  ) v;

  -- 3. Customers (unlocked limit)
  SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_customers
  FROM (
    SELECT *
    FROM public.customers
    ORDER BY created_at DESC
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
