-- Excel parity: fields the showroom still tracks in spreadsheets.
--  1. Booking price breakdown + gifts with cost against a per-car budget (customers)
--  2. Front/rear motor numbers + BEV/REEV powertrain (vehicles)
--  3. New stock statuses: in_transit, problem, parts_donor (+ incoming batch / ETA / issue note)
--  4. Brand on vehicle models (AVATR, Maxus, Volkswagen…)
-- Additive only; the app falls back gracefully if this is not applied yet.

BEGIN;

-- 1. Booking price + gifts
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS list_price_usd   numeric(14,2),
  ADD COLUMN IF NOT EXISTS discount_usd     numeric(14,2),
  ADD COLUMN IF NOT EXISTS delivery_window  text,
  ADD COLUMN IF NOT EXISTS gift_items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gift_budget_usd  numeric(14,2);

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_booking_price_nonneg,
  ADD CONSTRAINT customers_booking_price_nonneg CHECK (
    (list_price_usd IS NULL OR list_price_usd >= 0)
    AND (discount_usd IS NULL OR discount_usd >= 0)
    AND (gift_budget_usd IS NULL OR gift_budget_usd >= 0)
  );

-- 2 + 3. Vehicle identity and stock tracking
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS front_motor_number    text,
  ADD COLUMN IF NOT EXISTS rear_motor_number     text,
  ADD COLUMN IF NOT EXISTS powertrain_type       text,
  ADD COLUMN IF NOT EXISTS incoming_batch        text,
  ADD COLUMN IF NOT EXISTS expected_arrival_date date,
  ADD COLUMN IF NOT EXISTS issue_note            text;

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_powertrain_type_check,
  ADD CONSTRAINT vehicles_powertrain_type_check CHECK (powertrain_type IS NULL OR powertrain_type IN ('BEV', 'REEV'));

-- 4. Brand
ALTER TABLE public.vehicle_models
  ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT 'AVATR';

COMMIT;

-- 3. Status values. vehicles.status may be TEXT (baseline) or the vehicle_status enum
-- (used by record_vehicle_bill); add the new values only when the enum exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status' AND typnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS ''in_transit''';
    EXECUTE 'ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS ''problem''';
    EXECUTE 'ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS ''parts_donor''';
  END IF;
END $$;

-- Showroom init RPC: include brand in the model list (vehicles/customers already use SELECT *)
CREATE OR REPLACE FUNCTION public.get_showroom_initial_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $fn$
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

  SELECT COALESCE(jsonb_agg(m), '[]'::jsonb) INTO v_models
  FROM (
    SELECT id, name, brand, subtitle, tagline, category, price_starting_usd, price_starting_lak,
           CASE WHEN length(hero_image) > 2000 THEN NULL ELSE hero_image END AS hero_image,
           is_custom, colors, features, description, created_at
    FROM public.vehicle_models
    ORDER BY created_at ASC
  ) m;

  SELECT COALESCE(jsonb_agg(v), '[]'::jsonb) INTO v_vehicles
  FROM (SELECT * FROM public.vehicles ORDER BY created_at DESC) v;

  SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_customers
  FROM (SELECT * FROM public.customers ORDER BY created_at DESC) c;

  SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) INTO v_roles
  FROM (SELECT * FROM public.staff_roles WHERE is_active = TRUE ORDER BY sort_order ASC) r;

  SELECT to_jsonb(s) INTO v_settings
  FROM (SELECT * FROM public.dealership_settings LIMIT 1) s;

  RETURN jsonb_build_object(
    'models', v_models,
    'vehicles', v_vehicles,
    'customers', v_customers,
    'roles', v_roles,
    'settings', COALESCE(v_settings, '{}'::jsonb)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_showroom_initial_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_showroom_initial_data() TO authenticated;
