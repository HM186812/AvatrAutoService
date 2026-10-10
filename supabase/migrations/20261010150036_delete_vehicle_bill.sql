-- ==============================================================================
-- AVATR AUTO SERVICE LAOS - DELETE VEHICLE BILL RPC & ROLLBACK LOGIC
-- Migration to introduce safe vehicle bill deletion.
-- ==============================================================================

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
  -- Permission check: super_admin only
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only an active super admin can delete bills.';
  END IF;

  SELECT type INTO v_type FROM public.bills WHERE id = p_bill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found.';
  END IF;

  SELECT array_agg(vehicle_vin) INTO v_vins FROM public.bill_items WHERE bill_id = p_bill_id;

  -- If it was a sale bill, return vehicle to ready status
  IF v_type = 'sale' THEN
    UPDATE public.vehicles SET status = 'ready', updated_at = NOW()
    WHERE vin = ANY(v_vins) AND status = 'sold';
  END IF;

  -- Delete movements, items, and bill
  DELETE FROM public.stock_movements WHERE bill_id = p_bill_id;
  DELETE FROM public.bill_items WHERE bill_id = p_bill_id;
  DELETE FROM public.bills WHERE id = p_bill_id;

  -- If it was an import bill, remove the vehicle if no other bills refer to it
  IF v_type = 'import' THEN
    DELETE FROM public.vehicles v
    WHERE v.vin = ANY(v_vins)
      AND NOT EXISTS (SELECT 1 FROM public.bill_items bi WHERE bi.vehicle_vin = v.vin);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_vehicle_bill(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_vehicle_bill(uuid) TO authenticated;
