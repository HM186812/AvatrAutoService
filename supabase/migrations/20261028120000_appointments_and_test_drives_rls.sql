-- Migration: 20261028120000_appointments_and_test_drives_rls.sql
-- Description: Comprehensive RLS policies for service_appointments and test_drives (Item 79)

BEGIN;

ALTER TABLE public.service_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 1. POLICIES FOR public.service_appointments
-- ============================================================

DROP POLICY IF EXISTS "service_appointments_select" ON public.service_appointments;
CREATE POLICY "service_appointments_select" ON public.service_appointments
  FOR SELECT TO authenticated
  USING (public.is_active_staff());

DROP POLICY IF EXISTS "service_appointments_insert" ON public.service_appointments;
CREATE POLICY "service_appointments_insert" ON public.service_appointments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "service_appointments_update" ON public.service_appointments;
CREATE POLICY "service_appointments_update" ON public.service_appointments
  FOR UPDATE TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "service_appointments_delete" ON public.service_appointments;
CREATE POLICY "service_appointments_delete" ON public.service_appointments
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 2. POLICIES FOR public.test_drives
-- ============================================================

DROP POLICY IF EXISTS "test_drives_select" ON public.test_drives;
CREATE POLICY "test_drives_select" ON public.test_drives
  FOR SELECT TO authenticated
  USING (public.is_active_staff());

DROP POLICY IF EXISTS "test_drives_insert" ON public.test_drives;
CREATE POLICY "test_drives_insert" ON public.test_drives
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "test_drives_update" ON public.test_drives;
CREATE POLICY "test_drives_update" ON public.test_drives
  FOR UPDATE TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "test_drives_delete" ON public.test_drives;
CREATE POLICY "test_drives_delete" ON public.test_drives
  FOR DELETE TO authenticated
  USING (public.is_admin());

COMMIT;
