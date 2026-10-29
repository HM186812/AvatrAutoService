-- Migration: Harden Archive Partitions RLS and Bills Financial Constraints
-- Fixes security audit findings:
-- 1. Explicitly enable RLS and attach staff SELECT policies to all 12 cold storage partition child tables
-- 2. Add database check constraint preventing negative or tampered bill and down payment amounts

BEGIN;

-- ============================================================================
-- 1. Enable RLS on all bills_archive child partitions
-- ============================================================================
ALTER TABLE IF EXISTS public.bills_archive_2023 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bills_archive_2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bills_archive_2025 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bills_archive_2026 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bills_archive_2027 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bills_archive_default ENABLE ROW LEVEL SECURITY;

-- Attach active staff SELECT policies to bills_archive partitions
DROP POLICY IF EXISTS "bills_archive_2023_select" ON public.bills_archive_2023;
CREATE POLICY "bills_archive_2023_select" ON public.bills_archive_2023 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bills_archive_2024_select" ON public.bills_archive_2024;
CREATE POLICY "bills_archive_2024_select" ON public.bills_archive_2024 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bills_archive_2025_select" ON public.bills_archive_2025;
CREATE POLICY "bills_archive_2025_select" ON public.bills_archive_2025 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bills_archive_2026_select" ON public.bills_archive_2026;
CREATE POLICY "bills_archive_2026_select" ON public.bills_archive_2026 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bills_archive_2027_select" ON public.bills_archive_2027;
CREATE POLICY "bills_archive_2027_select" ON public.bills_archive_2027 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bills_archive_default_select" ON public.bills_archive_default;
CREATE POLICY "bills_archive_default_select" ON public.bills_archive_default FOR SELECT TO authenticated USING (public.is_active_staff());

-- ============================================================================
-- 2. Enable RLS on all bill_items_archive child partitions
-- ============================================================================
ALTER TABLE IF EXISTS public.bill_items_archive_2023 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_items_archive_2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_items_archive_2025 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_items_archive_2026 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_items_archive_2027 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_items_archive_default ENABLE ROW LEVEL SECURITY;

-- Attach active staff SELECT policies to bill_items_archive partitions
DROP POLICY IF EXISTS "bill_items_archive_2023_select" ON public.bill_items_archive_2023;
CREATE POLICY "bill_items_archive_2023_select" ON public.bill_items_archive_2023 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bill_items_archive_2024_select" ON public.bill_items_archive_2024;
CREATE POLICY "bill_items_archive_2024_select" ON public.bill_items_archive_2024 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bill_items_archive_2025_select" ON public.bill_items_archive_2025;
CREATE POLICY "bill_items_archive_2025_select" ON public.bill_items_archive_2025 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bill_items_archive_2026_select" ON public.bill_items_archive_2026;
CREATE POLICY "bill_items_archive_2026_select" ON public.bill_items_archive_2026 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bill_items_archive_2027_select" ON public.bill_items_archive_2027;
CREATE POLICY "bill_items_archive_2027_select" ON public.bill_items_archive_2027 FOR SELECT TO authenticated USING (public.is_active_staff());

DROP POLICY IF EXISTS "bill_items_archive_default_select" ON public.bill_items_archive_default;
CREATE POLICY "bill_items_archive_default_select" ON public.bill_items_archive_default FOR SELECT TO authenticated USING (public.is_active_staff());

-- ============================================================================
-- 3. Add Financial Integrity Check Constraint on bills table
-- ============================================================================
ALTER TABLE public.bills 
DROP CONSTRAINT IF EXISTS bills_positive_amounts_check;

ALTER TABLE public.bills 
ADD CONSTRAINT bills_positive_amounts_check 
CHECK (
  total_usd >= 0 
  AND total_lak >= 0 
  AND (down_payment_usd IS NULL OR down_payment_usd >= 0)
  AND (down_payment_percent IS NULL OR (down_payment_percent >= 0 AND down_payment_percent <= 100))
);

COMMIT;
