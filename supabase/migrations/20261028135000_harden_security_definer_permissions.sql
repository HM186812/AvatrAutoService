-- Migration: 20261028135000_harden_security_definer_permissions.sql
-- Description: Fix Supabase Linter warnings (0028 & 0029) by revoking anonymous/public execute
--              privileges from SECURITY DEFINER functions and enforcing strict search paths.

BEGIN;

-- ============================================================
-- 1. REVOKE PUBLIC & ANON EXECUTE FROM ALL SECURITY DEFINER FUNCTIONS
-- ============================================================

-- RLS & Role Helper Functions
REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;

-- Showroom & Data Retrieval RPC
REVOKE ALL ON FUNCTION public.get_showroom_initial_data() FROM PUBLIC, anon;

-- Administrative & Inventory Modification RPCs
REVOKE ALL ON FUNCTION public.delete_staff_profile(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reactivate_staff_profile(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_vehicle_bill(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_vehicle_from_inventory(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) FROM PUBLIC, anon;

-- ============================================================
-- 2. GRANT EXECUTE ONLY TO AUTHENTICATED STAFF WHERE REQUIRED
-- ============================================================

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_showroom_initial_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_staff_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_staff_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_vehicle_bill(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_vehicle_from_inventory(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) TO authenticated;

-- ============================================================
-- 3. ENSURE SAFE SEARCH_PATH ON ALL SECURITY DEFINER FUNCTIONS
-- ============================================================

ALTER FUNCTION public.get_current_user_role() SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.is_super_admin() SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.is_active_staff() SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.has_permission(text) SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.get_showroom_initial_data() SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.delete_staff_profile(uuid) SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.reactivate_staff_profile(uuid) SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.delete_vehicle_bill(uuid) SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.delete_vehicle_from_inventory(text) SET search_path = public, pg_catalog, pg_temp;
ALTER FUNCTION public.record_vehicle_bill(jsonb, jsonb, text, jsonb) SET search_path = public, pg_catalog, pg_temp;

COMMIT;
