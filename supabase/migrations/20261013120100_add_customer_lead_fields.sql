BEGIN;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS id_card_number TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS village TEXT,
  ADD COLUMN IF NOT EXISTS payment_type TEXT,
  ADD COLUMN IF NOT EXISTS down_payment_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS down_payment_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS finance_company TEXT,
  ADD COLUMN IF NOT EXISTS tenure_months INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_payment_lak NUMERIC,
  ADD COLUMN IF NOT EXISTS installment_status TEXT,
  ADD COLUMN IF NOT EXISTS paid_amount_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS paid_amount_lak NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_ref TEXT,
  ADD COLUMN IF NOT EXISTS payment_bank TEXT,
  ADD COLUMN IF NOT EXISTS payment_receipt_no TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by TEXT,
  ADD COLUMN IF NOT EXISTS payment_type_confirmed TEXT,
  ADD COLUMN IF NOT EXISTS installment_records JSONB DEFAULT '[]'::jsonb;

DROP POLICY IF EXISTS "customers_delete_staff" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_admin" ON public.customers;
CREATE POLICY "customers_delete_admin"
  ON public.customers
  FOR DELETE TO authenticated
  USING (
    public.is_active_staff()
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles AS sp
      WHERE sp.id = (SELECT auth.uid())
        AND sp.role::text IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "vehicle_models_delete_staff" ON public.vehicle_models;
DROP POLICY IF EXISTS "vehicle_models_delete_admin" ON public.vehicle_models;
CREATE POLICY "vehicle_models_delete_admin"
  ON public.vehicle_models
  FOR DELETE TO authenticated
  USING (
    public.is_active_staff()
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles AS sp
      WHERE sp.id = (SELECT auth.uid())
        AND sp.role::text IN ('super_admin', 'admin')
    )
  );

COMMIT;
