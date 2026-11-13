-- Migration: Pre-delivery security, RBAC, and RPC hardening
-- Fixes:
--   1. Restore SEC-02 on handle_new_auth_user: self-signups always start as 'suspended' with role 'general_user'
--   2. Harden record_vehicle_bill: reject 'removed' VINs on stock_out, guard UUID cast on reserved_for_customer,
--      and persist event_* fields to bill_items
--   3. Fix delete_vehicle_from_inventory: ignore voided sale bills
--   4. Harden get_sales_leaderboard: add pg_temp to search_path and require active staff caller
--   5. Harden archive_fiscal_year_bills: enable RLS and attach SELECT policy on dynamically created partitions

BEGIN;

-- 1. Restore SEC-02 on handle_new_auth_user
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := 'general_user';
  v_meta_role text;
  v_department text;
  v_initial_status text := 'suspended';
BEGIN
  IF NEW.invited_at IS NOT NULL THEN
    v_initial_status := 'active';
    v_meta_role := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'role'), '');
    IF v_meta_role IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.staff_roles WHERE role_code::text = v_meta_role AND is_active = TRUE
    ) THEN
      v_role := v_meta_role;
    END IF;
  END IF;

  v_department := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'department'), '');

  INSERT INTO public.staff_profiles (id, email, name, phone, role, department, role_title, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'name'), ''),
      NULLIF(pg_catalog.split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Staff'
    ),
    NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'phone'), ''),
    v_role,
    v_department,
    v_role,
    v_initial_status
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN EXCLUDED.name <> 'Staff' THEN EXCLUDED.name ELSE public.staff_profiles.name END,
    phone = COALESCE(EXCLUDED.phone, public.staff_profiles.phone),
    role = CASE WHEN NEW.invited_at IS NOT NULL THEN EXCLUDED.role ELSE public.staff_profiles.role END,
    department = COALESCE(EXCLUDED.department, public.staff_profiles.department),
    role_title = CASE WHEN NEW.invited_at IS NOT NULL THEN EXCLUDED.role_title ELSE public.staff_profiles.role_title END,
    updated_at = pg_catalog.now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO postgres, supabase_auth_admin;

-- 2. Harden record_vehicle_bill (guard removed VINs, safe UUID cast, bill_items event_* fields)
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
  v_existing_vehicle_status public.vehicle_status;
  v_phone text;
  v_name text;
  v_province text;
  v_id_card text;
  v_address text;
BEGIN
  v_caller_id := (SELECT auth.uid());
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  SELECT role INTO v_caller_role
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
  v_vin := COALESCE(p_item->>'vehicle_vin', p_vehicle->>'vin');

  IF v_bill_id IS NULL OR (p_bill->>'bill_number') IS NULL THEN
    RAISE EXCEPTION 'Bill ID and bill number are required.';
  END IF;

  IF v_vin IS NULL OR length(btrim(v_vin)) = 0 THEN
    RAISE EXCEPTION 'Vehicle VIN is required.';
  END IF;

  v_phone := NULLIF(btrim(COALESCE(p_bill->>'customer_phone', p_bill->>'phone', '')), '');
  v_name := NULLIF(btrim(COALESCE(p_bill->>'customer_name', '')), '');
  v_province := NULLIF(btrim(COALESCE(p_bill->>'customer_province', p_bill->>'province', '')), '');
  v_id_card := NULLIF(btrim(COALESCE(p_bill->>'customer_id_card', p_bill->>'id_card', '')), '');
  v_address := NULLIF(btrim(COALESCE(p_bill->>'customer_address', p_bill->>'address', '')), '');

  v_customer_id := NULLIF(p_bill->>'customer_id', '')::uuid;
  IF v_customer_id IS NULL AND (p_bill->>'type') = 'sale' AND v_phone IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_phone));

    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE phone = v_phone
    ORDER BY created_at ASC
    LIMIT 1;

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

  IF p_movement_type = 'stock_in' THEN
    IF p_vehicle IS NULL THEN
      RAISE EXCEPTION 'Vehicle payload is required for stock-in.';
    END IF;

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
        WHEN COALESCE(p_vehicle->>'reserved_for_customer', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (p_vehicle->>'reserved_for_customer')::uuid
        ELSE NULL
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

    IF v_existing_vehicle_status = 'removed' THEN
      RAISE EXCEPTION 'Vehicle with VIN % was removed from stock by a voided import bill.', v_vin;
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

-- 3. Fix delete_vehicle_from_inventory to ignore voided sale bills
CREATE OR REPLACE FUNCTION public.delete_vehicle_from_inventory(p_vin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_status text;
  v_bill_ids uuid[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only an active admin can delete vehicles from inventory.';
  END IF;

  SELECT status::text INTO v_status FROM public.vehicles WHERE vin = p_vin FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found.';
  END IF;

  IF v_status = 'sold' OR EXISTS (
    SELECT 1 FROM public.bill_items bi
    JOIN public.bills b ON b.id = bi.bill_id
    WHERE bi.vehicle_vin = p_vin
      AND b.type = 'sale'
      AND COALESCE(b.status::text, 'completed') <> 'voided'
  ) THEN
    RAISE EXCEPTION 'Cannot delete a sold vehicle. Please delete the sale bill first.';
  END IF;

  SELECT array_agg(DISTINCT bill_id) INTO v_bill_ids
  FROM public.bill_items
  WHERE vehicle_vin = p_vin;

  DELETE FROM public.stock_movements WHERE vehicle_vin = p_vin;
  DELETE FROM public.bill_items WHERE vehicle_vin = p_vin;

  IF v_bill_ids IS NOT NULL THEN
    DELETE FROM public.bills b
    WHERE b.id = ANY(v_bill_ids)
      AND NOT EXISTS (SELECT 1 FROM public.bill_items bi WHERE bi.bill_id = b.id);
  END IF;

  DELETE FROM public.vehicles WHERE vin = p_vin;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_vehicle_from_inventory(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_vehicle_from_inventory(text) TO authenticated;

-- 4. Harden get_sales_leaderboard (search_path + active staff guard)
CREATE OR REPLACE FUNCTION public.get_sales_leaderboard(
    p_period TEXT DEFAULT 'month',
    p_target_date DATE DEFAULT CURRENT_DATE
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
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL OR NOT COALESCE(public.is_active_staff(), false) THEN
        RAISE EXCEPTION 'Unauthorized: active staff required.';
    END IF;

    IF p_period = 'year' THEN
        v_start_date := date_trunc('year', p_target_date::timestamptz);
        v_end_date := v_start_date + interval '1 year';
    ELSIF p_period = 'quarter' THEN
        v_start_date := date_trunc('quarter', p_target_date::timestamptz);
        v_end_date := v_start_date + interval '3 months';
    ELSE
        v_start_date := date_trunc('month', p_target_date::timestamptz);
        v_end_date := v_start_date + interval '1 month';
    END IF;

    RETURN QUERY
    SELECT
        sp.id AS staff_id,
        sp.name AS staff_name,
        sp.role AS role,
        COUNT(DISTINCT b.id)::BIGINT AS delivered_units,
        COALESCE(SUM(b.total_usd), 0)::NUMERIC AS total_revenue_usd,
        COALESCE(AVG(bi.discount_usd), 0)::NUMERIC AS avg_discount_usd
    FROM public.staff_profiles sp
    LEFT JOIN public.bills b ON (
        (b.recorded_by = sp.id OR b.sales_rep = sp.id)
        AND b.type IN ('sale', 'installment')
        AND COALESCE(b.status, 'completed') <> 'voided'
        AND b.created_at >= v_start_date
        AND b.created_at < v_end_date
    )
    LEFT JOIN public.bill_items bi ON bi.bill_id = b.id
    WHERE sp.status = 'active'
    GROUP BY sp.id, sp.name, sp.role
    ORDER BY delivered_units DESC, total_revenue_usd DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) TO authenticated;

-- 5. Harden archive_fiscal_year_bills dynamic partition RLS
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
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff());', v_bills_part || '_select', v_bills_part);

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_items_part);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', v_items_part || '_select', v_items_part);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff());', v_items_part || '_select', v_items_part);

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

COMMIT;
