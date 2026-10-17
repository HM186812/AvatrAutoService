-- ==============================================================================
-- AVATR AUTO SERVICE LAOS - ENTERPRISE SECURITY & ATOMICITY FIXES
-- Fixes:
--   SEC-01: Fix NULL NOT IN (...) authentication bypass in staff RPCs
--   SEC-02: Require admin activation for self-signup & restrict POS stock_out to sales/admin
--   SEC-03: Block admin from modifying or deleting super_admin in staff RPCs
--   SEC-04: Restore REVOKE EXECUTE on record_vehicle_bill from PUBLIC, anon
--   INT-01: Populate full CRM customer fields atomically inside record_vehicle_bill
--   INT-02: Add FOR UPDATE row lock in delete_vehicle_from_inventory
--   INT-03: Add pg_advisory_xact_lock(hashtext(v_phone)) in record_vehicle_bill
-- ==============================================================================

BEGIN;

-- 1. SEC-02: Remove POS deduction permission from general_user role
UPDATE public.staff_roles
SET permissions = '{"canManageUsers":false,"canDeleteUsers":false,"canGrantRoles":false,"canEditInventory":false,"canUploadQR":false,"canAddModels":false,"canDeductPOS":false,"canViewFinancials":false,"canUpdatePDI":false,"canViewVehicles":true}'::jsonb
WHERE role_code = 'general_user';

-- 2. SEC-02: Self-registered accounts start as 'suspended' (pending admin activation)
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
      SELECT 1 FROM public.staff_roles WHERE role_code = v_meta_role AND is_active = TRUE
    ) THEN
      v_role := v_meta_role;
    END IF;
  END IF;

  v_department := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'department'), '');

  INSERT INTO public.staff_profiles (id, email, name, phone, role, department, role_title, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'name'), ''), NULLIF(pg_catalog.split_part(COALESCE(NEW.email, ''), '@', 1), ''), 'Staff'),
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

-- 3. SEC-01 & SEC-03: Harden reactivate_staff_profile RPC
CREATE OR REPLACE FUNCTION public.reactivate_staff_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.staff_profiles
  WHERE id = auth.uid() AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only an active admin can reactivate staff accounts.';
  END IF;

  SELECT role INTO v_target_role
  FROM public.staff_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff profile not found.';
  END IF;

  IF v_target_role = 'super_admin' AND v_caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Only a super_admin can reactivate a super_admin account.';
  END IF;

  UPDATE public.staff_profiles
  SET status = 'active', updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE auth.users
  SET banned_until = NULL, updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reactivate_staff_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_staff_profile(uuid) TO authenticated;

-- 4. SEC-01 & SEC-03: Harden delete_staff_profile RPC
CREATE OR REPLACE FUNCTION public.delete_staff_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
  v_admin_count INT;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.staff_profiles
  WHERE id = auth.uid() AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only an active admin can delete staff accounts.';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  SELECT role INTO v_target_role
  FROM public.staff_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    DELETE FROM auth.users WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true);
  END IF;

  IF v_target_role = 'super_admin' AND v_caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Only a super_admin can delete a super_admin account.';
  END IF;

  IF v_target_role IN ('super_admin', 'admin') THEN
    PERFORM 1
    FROM public.staff_profiles
    WHERE role IN ('super_admin', 'admin') AND status = 'active'
    FOR UPDATE;

    SELECT count(*) INTO v_admin_count
    FROM public.staff_profiles
    WHERE role IN ('super_admin', 'admin') AND status = 'active';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'The last active admin cannot be deleted.';
    END IF;
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
  DELETE FROM public.staff_profiles WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_staff_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_staff_profile(UUID) TO authenticated;

-- 5. INT-02: Harden delete_vehicle_from_inventory RPC with FOR UPDATE lock
CREATE OR REPLACE FUNCTION public.delete_vehicle_from_inventory(p_vin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    WHERE bi.vehicle_vin = p_vin AND b.type = 'sale'
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

-- 6. SEC-02, SEC-04, INT-01, INT-03: Harden record_vehicle_bill RPC
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

    IF EXISTS (SELECT 1 FROM public.vehicles WHERE vin = v_vin) THEN
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
    );
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

-- SEC-04: Explicitly revoke public/anon execution on record_vehicle_bill
REVOKE ALL ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) TO authenticated;

COMMIT;
