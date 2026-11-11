-- Migration: 20261111130000_void_bill_stock_consistency.sql
-- Description: Make voiding a bill leave stock and stock history consistent with what the app shows.
--   * Voided SALE bill: the car returns to stock as 'pdi' / pdi_status 'pending' (checked again before
--     it is sold), reservation cleared, and a 'stock_return' movement is recorded (as before).
--   * Voided IMPORT bill: the car leaves stock. It cannot be deleted (the voided bill and the stock history
--     still reference its VIN), so it gets the new status 'removed', which the app hides from stock, and an
--     'import_void' movement is recorded. Refused while the car is sold (void the sale bill first).
--   * record_vehicle_bill: a 'removed' VIN may be imported again (re-entering a car after a wrong entry).
-- Requires: 20261024120000_void_bill_and_stock_return, 20261111120000_bill_void_reason (uses delete_vehicle_bill).

-- 1. New vehicle status and movement type
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status' AND typnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS ''removed''';
  END IF;
END $$;

ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN ('stock_in', 'stock_out', 'stock_return', 'import_void'));

-- 2. Void logic (soft delete + stock effects). Same signature, so void_bill_with_reason keeps working.
CREATE OR REPLACE FUNCTION public.delete_vehicle_bill(p_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $fn$
DECLARE
  v_type text;
  v_status text;
  v_vins text[];
  v_caller_id uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = v_caller_id AND role IN ('super_admin', 'admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only an active admin can void/delete bills.';
  END IF;

  SELECT type::text, status::text INTO v_type, v_status FROM public.bills WHERE id = p_bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found.';
  END IF;
  IF v_status = 'voided' THEN
    RAISE EXCEPTION 'Bill is already voided.';
  END IF;

  SELECT array_agg(vehicle_vin) INTO v_vins
  FROM public.bill_items
  WHERE bill_id = p_bill_id AND vehicle_vin IS NOT NULL;

  IF v_vins IS NOT NULL AND array_length(v_vins, 1) > 0 THEN
    IF v_type = 'sale' THEN
      -- Back to stock, to be inspected again before it is sold
      UPDATE public.vehicles
      SET status = 'pdi', pdi_status = 'pending', reserved_for_customer = NULL, updated_at = pg_catalog.now()
      WHERE vin = ANY(v_vins) AND status::text = 'sold';

      INSERT INTO public.stock_movements (vehicle_vin, movement_type, bill_id, recorded_by, notes)
      SELECT vin, 'stock_return', p_bill_id, v_caller_id, 'Returned to stock due to voided sale bill'
      FROM unnest(v_vins) AS vin;

    ELSIF v_type = 'import' THEN
      IF EXISTS (SELECT 1 FROM public.vehicles WHERE vin = ANY(v_vins) AND status::text = 'sold') THEN
        RAISE EXCEPTION 'This car has already been sold. Void the sale bill first.';
      END IF;

      UPDATE public.vehicles
      SET status = 'removed', reserved_for_customer = NULL, updated_at = pg_catalog.now()
      WHERE vin = ANY(v_vins);

      INSERT INTO public.stock_movements (vehicle_vin, movement_type, bill_id, recorded_by, notes)
      SELECT vin, 'import_void', p_bill_id, v_caller_id, 'Removed from stock due to voided import bill'
      FROM unnest(v_vins) AS vin;
    END IF;
  END IF;

  UPDATE public.bills
  SET status = 'voided', updated_at = pg_catalog.now()
  WHERE id = p_bill_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.delete_vehicle_bill(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_vehicle_bill(uuid) TO authenticated;

-- 3. Stock-in: allow re-importing a 'removed' VIN (copied from 20261017213000; only the duplicate check
--    and an ON CONFLICT clause on the vehicle insert differ)
CREATE OR REPLACE FUNCTION public.record_vehicle_bill(
  p_bill jsonb,
  p_item jsonb,
  p_movement_type text,
  p_vehicle jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_bill_id uuid;
  v_vin text;
  v_customer_id uuid;
  v_existing_vehicle_status public.vehicle_status;
  v_phone text;
  v_name text;
  v_province text;
  v_id_card text;
  v_address text;
BEGIN
  -- 1. Authentication check
  v_caller_id := (SELECT auth.uid());
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  -- 2. Authorization check: caller must be an active staff member
  SELECT role INTO v_caller_role
  FROM public.staff_profiles
  WHERE id = v_caller_id AND status = 'active';

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an active staff member.';
  END IF;

  -- 3. Role-based permission check and strict bill type alignment (SEC-02: general_user excluded from stock_out)
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

  -- 4. Parameter sanity checks
  v_bill_id := NULLIF(p_bill->>'id', '')::uuid;
  v_vin := COALESCE(p_item->>'vehicle_vin', p_vehicle->>'vin');

  IF v_bill_id IS NULL OR (p_bill->>'bill_number') IS NULL THEN
    RAISE EXCEPTION 'Bill ID and bill number are required.';
  END IF;

  IF v_vin IS NULL OR length(btrim(v_vin)) = 0 THEN
    RAISE EXCEPTION 'Vehicle VIN is required.';
  END IF;

  -- Normalize customer fields with backward compatibility
  v_phone := NULLIF(btrim(COALESCE(p_bill->>'customer_phone', p_bill->>'phone', '')), '');
  v_name := NULLIF(btrim(COALESCE(p_bill->>'customer_name', '')), '');
  v_province := NULLIF(btrim(COALESCE(p_bill->>'customer_province', p_bill->>'province', '')), '');
  v_id_card := NULLIF(btrim(COALESCE(p_bill->>'customer_id_card', p_bill->>'id_card', '')), '');
  v_address := NULLIF(btrim(COALESCE(p_bill->>'customer_address', p_bill->>'address', '')), '');

  -- 5. ATOMIC CUSTOMER RESOLUTION (Single ACID transaction for POS with advisory lock)
  v_customer_id := NULLIF(p_bill->>'customer_id', '')::uuid;
  IF v_customer_id IS NULL AND (p_bill->>'type') = 'sale' AND v_phone IS NOT NULL THEN
    -- INT-03: Serialize concurrent customer creation by phone within this transaction
    PERFORM pg_advisory_xact_lock(hashtext(v_phone));

    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE phone = v_phone
    ORDER BY created_at ASC
    LIMIT 1;

    -- INT-01: Populate complete CRM metadata when creating a POS customer
    IF v_customer_id IS NULL AND v_name IS NOT NULL THEN
      INSERT INTO public.customers (
        name, phone, province, id_card_number,
        category, source, status, priority, assigned_to, notes
      )
      VALUES (
        v_name,
        v_phone,
        v_province,
        v_id_card,
        'walk_in',
        'POS sale',
        'delivered',
        'normal',
        v_caller_id,
        NULLIF(btrim(COALESCE(p_bill->>'notes', '')), '')
      )
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  -- 6. Stock-In: Create vehicle record
  IF p_movement_type = 'stock_in' THEN
    IF p_vehicle IS NULL THEN
      RAISE EXCEPTION 'Vehicle payload is required for stock-in.';
    END IF;

    -- A car whose import bill was voided (status 'removed') may be imported again under the same VIN
    IF EXISTS (SELECT 1 FROM public.vehicles WHERE vin = v_vin AND status::text <> 'removed') THEN
      RAISE EXCEPTION 'Vehicle with VIN % already exists in inventory.', v_vin;
    END IF;

    INSERT INTO public.vehicles (
      vin, engine_number, model_id, plate_number, color, color_hex, interior_color,
      trim, battery, price_usd, price_lak, status, pdi_status,
      pdi_inspector, pdi_notes, location, image_url, reserved_for_customer,
      arrival_date, mileage_km, event_campaign, event_start_date,
      event_end_date, event_location, promotion_discount_usd, promotion_notes,
      updated_at
    ) VALUES (
      v_vin,
      NULLIF(btrim(COALESCE(p_vehicle->>'engine_number', p_item->>'engine_number', '')), ''),
      p_vehicle->>'model_id',
      p_vehicle->>'plate_number',
      p_vehicle->>'color',
      p_vehicle->>'color_hex',
      p_vehicle->>'interior_color',
      p_vehicle->>'trim',
      p_vehicle->>'battery',
      COALESCE((p_vehicle->>'price_usd')::numeric, 0),
      COALESCE((p_vehicle->>'price_lak')::numeric, 0),
      COALESCE(NULLIF(p_vehicle->>'status', '')::public.vehicle_status, 'ready'::public.vehicle_status),
      COALESCE(NULLIF(p_vehicle->>'pdi_status', '')::public.pdi_status, 'pending'::public.pdi_status),
      p_vehicle->>'pdi_inspector',
      p_vehicle->>'pdi_notes',
      p_vehicle->>'location',
      p_vehicle->>'image_url',
      CASE
        WHEN p_vehicle->>'reserved_for_customer' IS NULL OR p_vehicle->>'reserved_for_customer' IN ('', 'null') THEN NULL
        ELSE (p_vehicle->>'reserved_for_customer')::uuid
      END,
      COALESCE(NULLIF(p_vehicle->>'arrival_date', '')::date, CURRENT_DATE),
      COALESCE((p_vehicle->>'mileage_km')::integer, 0),
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
      event_campaign = EXCLUDED.event_campaign,
      event_start_date = EXCLUDED.event_start_date,
      event_end_date = EXCLUDED.event_end_date,
      event_location = EXCLUDED.event_location,
      promotion_discount_usd = EXCLUDED.promotion_discount_usd,
      promotion_notes = EXCLUDED.promotion_notes,
      updated_at = now()
    WHERE public.vehicles.status::text = 'removed';
  END IF;

  -- 7. Insert the Bill record
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
    NULLIF(p_bill->>'sales_rep', '')::uuid,
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
    COALESCE((p_bill->>'total_usd')::numeric, 0),
    COALESCE((p_bill->>'total_lak')::numeric, 0),
    p_bill->>'notes',
    now()
  );

  -- 8. Insert the Bill Item record with explicit enum casting
  INSERT INTO public.bill_items (
    id, bill_id, line_number, vehicle_vin, engine_number, model_name, trim,
    plate_number, color, interior_color, battery, unit_price_usd,
    unit_price_lak, discount_usd, discount_lak, pdi_status_initial,
    status_initial, inspector_name
  ) VALUES (
    COALESCE(NULLIF(p_item->>'id', '')::uuid, gen_random_uuid()),
    v_bill_id,
    COALESCE((p_item->>'line_number')::integer, 1),
    v_vin,
    NULLIF(btrim(COALESCE(p_item->>'engine_number', p_vehicle->>'engine_number', '')), ''),
    p_item->>'model_name',
    p_item->>'trim',
    p_item->>'plate_number',
    p_item->>'color',
    p_item->>'interior_color',
    p_item->>'battery',
    COALESCE((p_item->>'unit_price_usd')::numeric, 0),
    COALESCE((p_item->>'unit_price_lak')::numeric, 0),
    COALESCE((p_item->>'discount_usd')::numeric, 0),
    COALESCE((p_item->>'discount_lak')::numeric, 0),
    NULLIF(p_item->>'pdi_status_initial', '')::public.pdi_status,
    NULLIF(p_item->>'status_initial', '')::public.vehicle_status,
    p_item->>'inspector_name'
  );

  -- 9. Insert Stock Movement record with correct column recorded_by
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

  -- 10. Stock-Out: Update vehicle status to sold
  IF p_movement_type = 'stock_out' THEN
    SELECT status INTO v_existing_vehicle_status
    FROM public.vehicles
    WHERE vin = v_vin
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vehicle with VIN % not found in inventory.', v_vin;
    END IF;

    IF v_existing_vehicle_status = 'sold' THEN
      RAISE EXCEPTION 'Vehicle with VIN % is already sold.', v_vin;
    END IF;

    UPDATE public.vehicles
    SET status = 'sold',
        updated_at = now()
    WHERE vin = v_vin;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) TO authenticated;
ALTER FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) SET search_path = public, pg_catalog, pg_temp;
