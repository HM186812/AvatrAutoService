-- Migration: 20261024124500_strip_base64_from_showroom_rpc.sql
-- Description: Clean 11.5MB base64 bloat from vehicle_models and guard get_showroom_initial_data RPC

BEGIN;

-- 1. Clean giant base64 images from legacy test vehicle_models (reducing row size from 5.4MB to <1KB)
UPDATE public.vehicle_models
SET hero_image = NULL
WHERE length(hero_image) > 2000 OR hero_image LIKE 'data:image%';

-- 2. Update get_showroom_initial_data to never serialize base64 payload (>2000 chars) over WAN
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

  -- 2. Vehicles (recent 500)
  SELECT COALESCE(jsonb_agg(v), '[]'::jsonb) INTO v_vehicles
  FROM (
    SELECT *
    FROM public.vehicles
    ORDER BY created_at DESC
    LIMIT 500
  ) v;

  -- 3. Customers (recent 250)
  SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_customers
  FROM (
    SELECT *
    FROM public.customers
    ORDER BY created_at DESC
    LIMIT 250
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
