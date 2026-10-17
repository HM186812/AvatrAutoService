-- ==============================================================================
-- AVATR AUTO SERVICE LAOS - AUDIT FIXES MIGRATION
-- 1. Add engine_number to vehicles and bill_items
-- 2. Update record_vehicle_bill to persist engine_number
-- 3. Update delete_vehicle_bill to allow both super_admin and admin
-- 4. Add delete_vehicle_from_inventory RPC to safely delete unsold vehicles + import bills
-- 5. Add reactivate_staff_profile RPC and ensure all 5 staff_roles exist with permissions
-- ==============================================================================

BEGIN;

-- 1. Add engine_number columns
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS engine_number TEXT;
ALTER TABLE public.bill_items ADD COLUMN IF NOT EXISTS engine_number TEXT;

-- 2. Ensure all 5 staff roles exist with accurate default permissions
INSERT INTO public.staff_roles (role_code, display_name_lo, display_name_en, display_name_th, description, permissions, sort_order, is_active)
VALUES
  ('super_admin', 'ຜູ້ດູແລລະບົບສູງສຸດ', 'Super Admin', 'ผู้ดูแลระบบสูงสุด', 'Full administrative control', '{"canManageUsers":true,"canDeleteUsers":true,"canGrantRoles":true,"canEditInventory":true,"canUploadQR":true,"canAddModels":true,"canDeductPOS":true,"canViewFinancials":true,"canUpdatePDI":true,"canViewVehicles":true}'::jsonb, 1, TRUE),
  ('admin', 'ຜູ້ດູແລລະບົບ (Admin)', 'Admin', 'ผู้ดูแลระบบ (Admin)', 'System administrator', '{"canManageUsers":true,"canDeleteUsers":true,"canGrantRoles":true,"canEditInventory":true,"canUploadQR":true,"canAddModels":true,"canDeductPOS":true,"canViewFinancials":true,"canUpdatePDI":true,"canViewVehicles":true}'::jsonb, 2, TRUE),
  ('sales', 'ຝ່າຍຂາຍ (Sales)', 'Sales Executive', 'ฝ่ายขาย (Sales)', 'POS sales and customer CRM', '{"canManageUsers":false,"canDeleteUsers":false,"canGrantRoles":false,"canEditInventory":false,"canUploadQR":false,"canAddModels":false,"canDeductPOS":true,"canViewFinancials":true,"canUpdatePDI":false,"canViewVehicles":true}'::jsonb, 3, TRUE),
  ('technician', 'ຊ່າງເຕັກນິກ (Technician)', 'Technician / PDI', 'ช่างเทคนิค (Technician)', 'PDI inspection and service', '{"canManageUsers":false,"canDeleteUsers":false,"canGrantRoles":false,"canEditInventory":true,"canUploadQR":false,"canAddModels":false,"canDeductPOS":false,"canViewFinancials":false,"canUpdatePDI":true,"canViewVehicles":true}'::jsonb, 4, TRUE),
  ('general_user', 'ຜູ້ໃຊ້ທົ່ວໄປ (User)', 'General User', 'ผู้ใช้ทั่วไป (User)', 'Standard staff access', '{"canManageUsers":false,"canDeleteUsers":false,"canGrantRoles":false,"canEditInventory":false,"canUploadQR":false,"canAddModels":false,"canDeductPOS":true,"canViewFinancials":false,"canUpdatePDI":false,"canViewVehicles":true}'::jsonb, 5, TRUE)
ON CONFLICT (role_code) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  is_active = TRUE;

-- 3. Update record_vehicle_bill to save engine_number
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
      RAISE EXCEPTION 'Movement type stock_in requires bill type import, but got %', p_bill->>'type';
    END IF;
  ELSIF p_movement_type = 'stock_out' THEN
    IF v_caller_role NOT IN ('super_admin', 'admin', 'sales', 'general_user') THEN
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
      NULLIF(pg_catalog.btrim(COALESCE(p_vehicle->>'engine_number', p_item->>'engine_number', '')), ''),
      p_vehicle->>'model_id',
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
      CASE WHEN p_vehicle->'reserved_for_customer' IS NULL OR p_vehicle->>'reserved_for_customer' = 'null' THEN NULL ELSE p_vehicle->'reserved_for_customer' END,
      COALESCE(p_vehicle->>'arrival_date', pg_catalog.now()::text),
      COALESCE((p_vehicle->>'mileage_km')::numeric, 0),
      p_vehicle->>'event_campaign',
      p_vehicle->>'event_start_date',
      p_vehicle->>'event_end_date',
      p_vehicle->>'event_location',
      COALESCE((p_vehicle->>'promotion_discount_usd')::numeric, 0),
      p_vehicle->>'promotion_notes',
      pg_catalog.now()
    );
  END IF;

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

  INSERT INTO public.bill_items (
    id, bill_id, line_number, vehicle_vin, engine_number, model_name, trim,
    plate_number, color, interior_color, battery, unit_price_usd,
    unit_price_lak, discount_usd, discount_lak, pdi_status_initial,
    status_initial, inspector_name, event_campaign, event_start_date,
    event_end_date, event_location
  ) VALUES (
    (p_item->>'id')::uuid,
    v_bill_id,
    COALESCE((p_item->>'line_number')::integer, 1),
    v_vin,
    NULLIF(pg_catalog.btrim(COALESCE(p_item->>'engine_number', p_vehicle->>'engine_number', '')), ''),
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

  INSERT INTO public.stock_movements (
    vehicle_vin, movement_type, bill_id, recorded_by, notes
  ) VALUES (
    v_vin,
    p_movement_type,
    v_bill_id,
    v_caller_id,
    p_bill->>'notes'
  );

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

-- 4. Update delete_vehicle_bill to allow both super_admin and admin
CREATE OR REPLACE FUNCTION public.delete_vehicle_bill(p_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_vins text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only an active admin can delete bills.';
  END IF;

  SELECT type INTO v_type FROM public.bills WHERE id = p_bill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found.';
  END IF;

  SELECT array_agg(vehicle_vin) INTO v_vins FROM public.bill_items WHERE bill_id = p_bill_id;

  IF v_type = 'sale' THEN
    UPDATE public.vehicles SET status = 'ready', updated_at = NOW()
    WHERE vin = ANY(v_vins) AND status = 'sold';
  END IF;

  DELETE FROM public.stock_movements WHERE bill_id = p_bill_id;
  DELETE FROM public.bill_items WHERE bill_id = p_bill_id;
  DELETE FROM public.bills WHERE id = p_bill_id;

  IF v_type = 'import' THEN
    DELETE FROM public.vehicles v
    WHERE v.vin = ANY(v_vins)
      AND NOT EXISTS (SELECT 1 FROM public.bill_items bi WHERE bi.vehicle_vin = v.vin);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_vehicle_bill(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_vehicle_bill(uuid) TO authenticated;

-- 5. Add delete_vehicle_from_inventory RPC (safe atomic delete for unsold vehicles)
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

  SELECT status INTO v_status FROM public.vehicles WHERE vin = p_vin;
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

-- 6. Add reactivate_staff_profile RPC
CREATE OR REPLACE FUNCTION public.reactivate_staff_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.staff_profiles
  WHERE id = auth.uid() AND status = 'active';

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only an active admin can reactivate staff accounts.';
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

-- 7. Update delete_staff_profile RPC to allow both super_admin and admin
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active_admins
ON public.staff_profiles (id)
WHERE role IN ('super_admin', 'admin') AND status = 'active';

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

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
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

COMMIT;
