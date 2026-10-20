-- Migration: 20261019220000_sync_db_types_rls_and_indexes.sql
-- Description: Synchronize missing enum types, enforce RLS on all tables, and add missing foreign key & lookup indexes.
-- Enterprise Standard: Idempotent, zero-downtime, fully non-blocking if objects already exist.

-- ============================================================
-- 1. IDEMPOTENT CUSTOM ENUM TYPES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.staff_role AS ENUM ('super_admin', 'admin', 'sales', 'technician', 'general_user');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.bill_type AS ENUM ('sale', 'import', 'installment');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.vehicle_status AS ENUM ('ready', 'pdi', 'imported', 'reserved', 'sold', 'event', 'promotion');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pdi_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.pdi_status AS ENUM ('passed', 'in_progress', 'pending');
  END IF;
END $$;

-- ============================================================
-- 2. ENFORCE ROW LEVEL SECURITY (RLS) ON ALL 11 ACTIVE TABLES
-- ============================================================
ALTER TABLE IF EXISTS public.vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dealership_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. HELPER FUNCTION: is_active_staff (Safe fallback if missing)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = auth.uid()
      AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated;

-- ============================================================
-- 4. MISSING FOREIGN KEY & LOOKUP INDEXES (PERFORMANCE HARDENING)
-- ============================================================

-- Fast lookup for POS sale duplicate/existing customer detection by phone
CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON public.customers (phone);

-- Vehicles foreign key to vehicle_models
CREATE INDEX IF NOT EXISTS idx_vehicles_model_id
  ON public.vehicles (model_id);

-- Vehicles status lookup for stock availability queries
CREATE INDEX IF NOT EXISTS idx_vehicles_status
  ON public.vehicles (status);

-- Bills foreign key to customer
CREATE INDEX IF NOT EXISTS idx_bills_customer_id
  ON public.bills (customer_id);

-- Bills type and date for reporting and ledger queries
CREATE INDEX IF NOT EXISTS idx_bills_type_date
  ON public.bills (type, bill_date DESC);

-- Bill items foreign keys to bill and vehicle
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id
  ON public.bill_items (bill_id);

CREATE INDEX IF NOT EXISTS idx_bill_items_vehicle_vin
  ON public.bill_items (vehicle_vin);

-- Stock movements foreign keys and chronology
CREATE INDEX IF NOT EXISTS idx_stock_movements_vehicle_vin
  ON public.stock_movements (vehicle_vin);

CREATE INDEX IF NOT EXISTS idx_stock_movements_bill_id
  ON public.stock_movements (bill_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
  ON public.stock_movements (created_at DESC);

-- Customer relationships in CRM appointments & test drives
CREATE INDEX IF NOT EXISTS idx_service_appointments_customer_id
  ON public.service_appointments (customer_id);

CREATE INDEX IF NOT EXISTS idx_test_drives_customer_id
  ON public.test_drives (customer_id);