-- Allow staff with canDeductPOS to record installment payment receipts (bills.type = 'installment').
-- Previously bills_insert / bills_update only allowed 'sale' and 'import', so direct receipt inserts hit RLS.

BEGIN;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT (sr.permissions->>p_permission)::boolean
      FROM public.staff_profiles sp
      JOIN public.staff_roles sr ON sr.role_code = sp.role::text
      WHERE sp.id = auth.uid() AND sp.status = 'active'
    ),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

DROP POLICY IF EXISTS "bills_insert" ON public.bills;
CREATE POLICY "bills_insert"
  ON public.bills FOR INSERT TO authenticated
  WITH CHECK (
    ((type::text = 'sale' OR type::text = 'installment') AND public.has_permission('canDeductPOS'))
    OR (type::text = 'import' AND public.has_permission('canEditInventory'))
  );

DROP POLICY IF EXISTS "bills_update" ON public.bills;
CREATE POLICY "bills_update"
  ON public.bills FOR UPDATE TO authenticated
  USING (
    ((type::text = 'sale' OR type::text = 'installment') AND public.has_permission('canDeductPOS'))
    OR (type::text = 'import' AND public.has_permission('canEditInventory'))
  )
  WITH CHECK (
    ((type::text = 'sale' OR type::text = 'installment') AND public.has_permission('canDeductPOS'))
    OR (type::text = 'import' AND public.has_permission('canEditInventory'))
  );

COMMIT;
