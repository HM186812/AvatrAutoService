-- Harden record_vehicle_bill:
-- 1. Drop obsolete 3-parameter overload from baseline schema
-- 2. Prevent double-sale race condition (WHERE status != 'sold')
-- 3. Atomic stock-in with duplicate VIN prevention (fail & rollback, no overwrite)
-- 4. In-function authentication and role authorization (SECURITY DEFINER with strict RBAC)
-- 5. Empty search_path to prevent schema shadowing attacks
BEGIN;

-- Drop obsolete 3-parameter overload from baseline so only the hardened 4-parameter RPC exists
DROP FUNCTION IF EXISTS public.record_vehicle_bill(jsonb, jsonb, text);
DROP FUNCTION IF EXISTS public.record_vehicle_bill(jsonb, jsonb, text, jsonb);

CREATE OR REPLACE FUNCTION public.record_vehicle_bill(
  p_bill jsonb,
  p_item jsonb,
  p_movement_type text,
  p_vehicle jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_bill_id uuid;
  v_vin text;
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

  -- 3. Role-based permission check and strict bill type alignment
  IF p_movement_type = 'stock_in' THEN
    IF v_caller_role NOT IN ('super_admin', 'admin') THEN
      RAISE EXCEPTION 'Permission denied: Only admin or super_admin can record stock-in.';
    END IF;
    IF COALESCE(p_bill->>'type', '') <> 'import' THEN
      RAISE EXCEPTION 'Movement type stock_in requires bill type import, but got %', p_bill->>'type';
    END IF;
  ELSIF p_movement_type = 'stock_out' THEN
    IF v_caller_role NOT IN ('super_admin', 'admin', 'sales') THEN
      RAISE EXCEPTION 'Permission denied: Only sales or admin can record vehicle sales.';
    END IF;
    IF COALESCE(p_bill->>'type', '') <> 'sale' THEN
      RAISE EXCEPTION 'Movement type stock_out requires bill type sale, but got %', p_bill->>'type';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid movement type: %', p_movement_type;
  END IF;

  v_bill_id := (p_bill->>'id')::uuid;
  v_vin := p_item->>'vehicle_vin';

  IF v_bill_id IS NULL OR (p_bill->>'bill_number') IS NULL THEN
    RAISE EXCEPTION 'Bill ID and bill number are required.';
  END IF;

  IF v_vin IS NULL OR pg_catalog.length(pg_catalog.btrim(v_vin)) = 0 THEN
    RAISE EXCEPTION 'Vehicle VIN is required.';
  END IF;

  -- 4. Atomic stock-in: check for duplicate VIN, fail if already exists
  IF p_movement_type = 'stock_in' THEN
    IF p_vehicle IS NULL THEN
      RAISE EXCEPTION 'Vehicle payload is required for stock-in.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.vehicles WHERE vin = v_vin) THEN
      RAISE EXCEPTION 'Vehicle with VIN % already exists in inventory.', v_vin;
    END IF;

    INSERT INTO public.vehicles (
      vin, model_id, plate_number, color, color_hex, interior_color,
      trim, battery, price_usd, price_lak, status, pdi_status,
      pdi_inspector, pdi_notes, location, image_url, reserved_for_customer,
      arrival_date, mileage_km, event_campaign, event_start_date,
      event_end_date, event_location, promotion_discount_usd, promotion_notes,
      updated_at
    ) VALUES (
      v_vin,
      (p_vehicle->>'model_id')::uuid,
      p_vehicle->>'plate_number',
      p_vehicle->>'color',
      p_vehicle->>'color_hex',
      p_vehicle->>'interior_color',
      p_vehicle->>'trim',
      p_vehicle->>'battery',
      COALESCE((p_vehicle->>'price_usd')::numeric, 0),
      COALESCE((p_vehicle->>'price_lak')::numeric, 0),
      COALESCE(p_vehicle->>'status', 'ready'),
      COALESCE(p_vehicle->>'pdi_status', 'pending'),
      p_vehicle->>'pdi_inspector',
      p_vehicle->>'pdi_notes',
      p_vehicle->>'location',
      p_vehicle->>'image_url',
      p_vehicle->>'reserved_for_customer',
      COALESCE((p_vehicle->>'arrival_date')::timestamptz, pg_catalog.now()),
      COALESCE((p_vehicle->>'mileage_km')::numeric, 0),
      p_vehicle->>'event_campaign',
      (p_vehicle->>'event_start_date')::timestamptz,
      (p_vehicle->>'event_end_date')::timestamptz,
      p_vehicle->>'event_location',
      (p_vehicle->>'promotion_discount_usd')::numeric,
      p_vehicle->>'promotion_notes',
      pg_catalog.now()
    );
  END IF;

  -- 5. Insert Bill (recorded_by pinned to caller authenticated ID)
  INSERT INTO public.bills (
    id, bill_number, type, bill_date, customer_id, customer_name,
    customer_phone, customer_id_card, customer_address, customer_province,
    sales_rep, recorded_by, payment_method, qr_used, bank_name,
    transfer_ref, finance_company, down_payment_percent, down_payment_usd,
    tenure_months, monthly_payment_lak, free_gifts, warranty_terms,
    supplier_name, customs_doc_number, import_entry_port,
    destination_warehouse, total_usd, total_lak, payment_slip_path, notes
  ) VALUES (
    v_bill_id,
    p_bill->>'bill_number',
    p_bill->>'type',
    p_bill->>'bill_date',
    (p_bill->>'customer_id')::uuid,
    p_bill->>'customer_name',
    p_bill->>'phone',
    p_bill->>'id_card',
    p_bill->>'address',
    p_bill->>'province',
    COALESCE((p_bill->>'sales_rep')::uuid, v_caller_id),
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
    p_bill->>'supplier_name',
    p_bill->>'customs_doc_number',
    p_bill->>'import_entry_port',
    p_bill->>'destination_warehouse',
    (p_bill->>'total_usd')::numeric,
    (p_bill->>'total_lak')::numeric,
    p_bill->>'payment_slip_path',
    p_bill->>'notes'
  )
  ON CONFLICT (id) DO UPDATE SET
    total_usd = EXCLUDED.total_usd,
    total_lak = EXCLUDED.total_lak,
    updated_at = pg_catalog.now();

  -- 6. Insert Bill Item
  INSERT INTO public.bill_items (
    id, bill_id, line_number, vehicle_vin, model_name, trim,
    plate_number, color, interior_color, battery, unit_price_usd,
    unit_price_lak, discount_usd, discount_lak, pdi_status_initial,
    status_initial, inspector_name, event_campaign, event_start_date,
    event_end_date, event_location
  ) VALUES (
    (p_item->>'id')::uuid,
    v_bill_id,
    COALESCE((p_item->>'line_number')::integer, 1),
    v_vin,
    p_item->>'model_name',
    p_item->>'trim',
    p_item->>'plate_number',
    p_item->>'color',
    p_item->>'interior_color',
    p_item->>'battery',
    (p_item->>'unit_price_usd')::numeric,
    (p_item->>'unit_price_lak')::numeric,
    COALESCE((p_item->>'discount_usd')::numeric, 0),
    COALESCE((p_item->>'discount_lak')::numeric, 0),
    p_item->>'pdi_status_initial',
    p_item->>'status_initial',
    p_item->>'inspector_name',
    p_item->>'event_campaign',
    p_item->>'event_start_date',
    p_item->>'event_end_date',
    p_item->>'event_location'
  );

  -- 7. Record Stock Movement
  INSERT INTO public.stock_movements (
    vehicle_vin, movement_type, bill_id, recorded_by, notes
  ) VALUES (
    v_vin,
    p_movement_type,
    v_bill_id,
    v_caller_id,
    p_bill->>'notes'
  );

  -- 8. Atomic check for double-sale
  IF p_movement_type = 'stock_out' THEN
    UPDATE public.vehicles
    SET status = 'sold', updated_at = pg_catalog.now()
    WHERE vin = v_vin AND status != 'sold';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vehicle VIN % already sold or not in stock', v_vin;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) TO authenticated;

COMMIT;
