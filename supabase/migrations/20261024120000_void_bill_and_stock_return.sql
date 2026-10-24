-- Migration: 20261024120000_void_bill_and_stock_return.sql
-- Description: Implement soft-delete for bills (status = 'voided') and audit trail stock return

-- 1. Ensure stock_movements supports 'stock_return'
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_movement_type_check 
  CHECK (movement_type IN ('stock_in', 'stock_out', 'stock_return'));

-- 2. Update delete_vehicle_bill RPC to perform soft-delete instead of hard DELETE
CREATE OR REPLACE FUNCTION public.delete_vehicle_bill(p_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_type text;
  v_vins text[];
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = v_caller_id AND role IN ('super_admin', 'admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only an active admin can void/delete bills.';
  END IF;

  SELECT type INTO v_type FROM public.bills WHERE id = p_bill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found.';
  END IF;

  -- Collect all vehicle VINs associated with this bill
  SELECT array_agg(vehicle_vin) INTO v_vins 
  FROM public.bill_items 
  WHERE bill_id = p_bill_id AND vehicle_vin IS NOT NULL;

  -- 1. If it was a sale bill, return vehicles to stock and record stock_return audit log
  IF v_type = 'sale' AND v_vins IS NOT NULL AND array_length(v_vins, 1) > 0 THEN
    UPDATE public.vehicles
    SET status = 'ready', updated_at = pg_catalog.now()
    WHERE vin = ANY(v_vins) AND status = 'sold';

    INSERT INTO public.stock_movements (vehicle_vin, movement_type, bill_id, recorded_by, notes)
    SELECT vin, 'stock_return', p_bill_id, v_caller_id, 'Returned to stock due to voided bill'
    FROM unnest(v_vins) AS vin;
  END IF;

  -- 2. Soft-delete the bill: mark status as 'voided' and record timestamp
  UPDATE public.bills
  SET status = 'voided', updated_at = pg_catalog.now()
  WHERE id = p_bill_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_vehicle_bill(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_vehicle_bill(uuid) TO authenticated;
