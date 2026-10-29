-- Migration: Ensure bill numbers are strictly unique
-- Description: Adds a unique index on public.bills(bill_number) to prevent invoice collision

CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_unique_bill_number
  ON public.bills (bill_number)
  WHERE bill_number IS NOT NULL;
