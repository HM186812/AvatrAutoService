-- Migration: 20261020203000_after_sales_columns_and_storage_buckets.sql
-- Description: Add After-Sales, Warranty, and Installment columns to customers, bills, and service_appointments, plus Storage Buckets & RLS policies.

BEGIN;

-- 1. Ensure 'installment' value exists in bill_type enum (if enum exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_type' AND typnamespace = 'public'::regnamespace) THEN
    BEGIN
      ALTER TYPE public.bill_type ADD VALUE IF NOT EXISTS 'installment';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2. Add After-Sales, Warranty & Payoff fields to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS paid_date TEXT,
  ADD COLUMN IF NOT EXISTS is_payment_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plate_number TEXT,
  ADD COLUMN IF NOT EXISTS vin TEXT,
  ADD COLUMN IF NOT EXISTS engine_number TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS current_mileage_km NUMERIC,
  ADD COLUMN IF NOT EXISTS battery_health_soh NUMERIC,
  ADD COLUMN IF NOT EXISTS warranty_start_date TEXT,
  ADD COLUMN IF NOT EXISTS warranty_expiry_date TEXT,
  ADD COLUMN IF NOT EXISTS warranty_years INTEGER,
  ADD COLUMN IF NOT EXISTS warranty_distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS warranty_terms TEXT,
  ADD COLUMN IF NOT EXISTS after_sales_notes TEXT;

-- 3. Add After-Sales & Installment fields to bills and relax type check constraint
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS installment_period INTEGER,
  ADD COLUMN IF NOT EXISTS warranty_start_date TEXT,
  ADD COLUMN IF NOT EXISTS warranty_expiry_date TEXT,
  ADD COLUMN IF NOT EXISTS warranty_years INTEGER,
  ADD COLUMN IF NOT EXISTS warranty_distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS current_mileage_km NUMERIC,
  ADD COLUMN IF NOT EXISTS battery_health_soh NUMERIC,
  ADD COLUMN IF NOT EXISTS after_sales_notes TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bills_type_check' AND conrelid = 'public.bills'::regclass
  ) THEN
    ALTER TABLE public.bills DROP CONSTRAINT bills_type_check;
    ALTER TABLE public.bills ADD CONSTRAINT bills_type_check CHECK (type::text IN ('sale', 'import', 'installment'));
  END IF;
END $$;

-- 4. Add mileage_km to service_appointments
ALTER TABLE public.service_appointments
  ADD COLUMN IF NOT EXISTS mileage_km NUMERIC;

-- 5. Storage Buckets & RLS Policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('dealership-assets', 'dealership-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('avatr-assets', 'avatr-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('payment-slips', 'payment-slips', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "dealership_assets_public_read" ON storage.objects;
CREATE POLICY "dealership_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('dealership-assets', 'avatr-assets'));

DROP POLICY IF EXISTS "dealership_assets_staff_write" ON storage.objects;
CREATE POLICY "dealership_assets_staff_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('dealership-assets', 'avatr-assets') AND public.is_active_staff());

DROP POLICY IF EXISTS "dealership_assets_staff_delete" ON storage.objects;
CREATE POLICY "dealership_assets_staff_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('dealership-assets', 'avatr-assets') AND public.is_active_staff());

DROP POLICY IF EXISTS "payment_slips_staff_read" ON storage.objects;
CREATE POLICY "payment_slips_staff_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-slips' AND public.is_active_staff());

DROP POLICY IF EXISTS "payment_slips_staff_write" ON storage.objects;
CREATE POLICY "payment_slips_staff_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-slips' AND public.is_active_staff());

COMMIT;
