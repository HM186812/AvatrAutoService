-- Migration: 20261111120000_bill_void_reason.sql
-- Description: Record why a bill was voided, who voided it and when.
--
-- Stored in its own table (not new columns on public.bills) so the fiscal-year archive
-- (archive_fiscal_year_bills, bills_archive, v_bills_10_year_audit) keeps working unchanged:
-- archiving deletes rows from public.bills, so this table has no foreign key to it.

CREATE TABLE IF NOT EXISTS public.bill_void_logs (
  bill_id UUID PRIMARY KEY,
  bill_number TEXT,
  reason TEXT NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(reason)) >= 3),
  voided_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  voided_by_name TEXT,
  voided_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.bill_void_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bill_void_logs_select" ON public.bill_void_logs;
CREATE POLICY "bill_void_logs_select" ON public.bill_void_logs
  FOR SELECT TO authenticated
  USING (public.is_active_staff());
-- No insert/update/delete policies: rows are written only by void_bill_with_reason().

REVOKE ALL ON public.bill_void_logs FROM anon;
GRANT SELECT ON public.bill_void_logs TO authenticated;

-- Void a bill with a mandatory reason. Reuses delete_vehicle_bill() for the existing void
-- behaviour (soft delete + return sold cars to stock + stock_return movement).
CREATE OR REPLACE FUNCTION public.void_bill_with_reason(p_bill_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_name text;
  v_bill_number text;
  v_status text;
  v_reason text := pg_catalog.btrim(coalesce(p_reason, ''));
  v_voided_at timestamptz := pg_catalog.now();
BEGIN
  IF pg_catalog.length(v_reason) < 3 THEN
    RAISE EXCEPTION 'A void reason (at least 3 characters) is required.';
  END IF;

  SELECT name INTO v_caller_name
  FROM public.staff_profiles
  WHERE id = v_caller_id AND role IN ('super_admin', 'admin') AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only an active admin can void bills.';
  END IF;

  SELECT bill_number, status INTO v_bill_number, v_status
  FROM public.bills WHERE id = p_bill_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found.';
  END IF;
  IF v_status = 'voided' THEN
    -- Voiding twice would return the same car to stock twice
    RAISE EXCEPTION 'Bill % is already voided.', v_bill_number;
  END IF;

  PERFORM public.delete_vehicle_bill(p_bill_id);

  INSERT INTO public.bill_void_logs (bill_id, bill_number, reason, voided_by, voided_by_name, voided_at)
  VALUES (p_bill_id, v_bill_number, pg_catalog.left(v_reason, 1000), v_caller_id, v_caller_name, v_voided_at)
  ON CONFLICT (bill_id) DO UPDATE
    SET reason = EXCLUDED.reason,
        voided_by = EXCLUDED.voided_by,
        voided_by_name = EXCLUDED.voided_by_name,
        voided_at = EXCLUDED.voided_at;

  RETURN jsonb_build_object(
    'bill_id', p_bill_id,
    'reason', v_reason,
    'voided_by_name', v_caller_name,
    'voided_at', v_voided_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.void_bill_with_reason(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_bill_with_reason(uuid, text) TO authenticated;
