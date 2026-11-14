-- ============================================================================
-- Fix record_vehicle_bill COALESCE type mismatch (enum vs text columns)
-- and eliminate PL/pgSQL shadowed loop variable lint warnings.
-- ============================================================================

-- 1. Helper: remove redundant declared loop variable `i`
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

-- 2. record_vehicle_bill: align COALESCE branches to text for bill_items snapshot columns
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
    COALESCE(
      NULLIF(p_item->>'pdi_status_initial', '')::public.pdi_status::text,
      v_vehicle.pdi_status::text,
      NULLIF(p_vehicle->>'pdi_status', '')::public.pdi_status::text
    ),
    COALESCE(
      NULLIF(p_item->>'status_initial', '')::public.vehicle_status::text,
      v_vehicle.status::text,
      NULLIF(p_vehicle->>'status', '')::public.vehicle_status::text
    ),
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

-- 3. record_installment_payment: remove redundant declared loop variable `v_idx`
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

-- 4. revert_installment_payment: remove redundant declared loop variable `v_idx`
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

-- 5. void_bill_with_reason: remove redundant declared loop variable `v_idx`
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
