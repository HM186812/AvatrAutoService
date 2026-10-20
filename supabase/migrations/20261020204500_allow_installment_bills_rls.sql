-- Allow staff with canDeductPOS to record installment payment receipts (bills.type = 'installment').
-- Previously bills_insert / bills_update only allowed 'sale' and 'import', so direct receipt inserts hit RLS.

BEGIN;

DROP POLICY IF EXISTS "bills_insert" ON public.bills;
CREATE POLICY "bills_insert"
  ON public.bills FOR INSERT TO authenticated
  WITH CHECK (
    ((type = 'sale'::public.bill_type OR type = 'installment'::public.bill_type) AND public.has_permission('canDeductPOS'))
    OR (type = 'import'::public.bill_type AND public.has_permission('canEditInventory'))
  );

DROP POLICY IF EXISTS "bills_update" ON public.bills;
CREATE POLICY "bills_update"
  ON public.bills FOR UPDATE TO authenticated
  USING (
    ((type = 'sale'::public.bill_type OR type = 'installment'::public.bill_type) AND public.has_permission('canDeductPOS'))
    OR (type = 'import'::public.bill_type AND public.has_permission('canEditInventory'))
  )
  WITH CHECK (
    ((type = 'sale'::public.bill_type OR type = 'installment'::public.bill_type) AND public.has_permission('canDeductPOS'))
    OR (type = 'import'::public.bill_type AND public.has_permission('canEditInventory'))
  );

COMMIT;
