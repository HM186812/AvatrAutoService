-- Use an empty search_path for SECURITY DEFINER functions whose references
-- are schema-qualified, preventing objects in writable schemas from shadowing them.
BEGIN;

ALTER FUNCTION public.delete_vehicle_bill(uuid) SET search_path = '';
ALTER FUNCTION public.handle_auth_login_update() SET search_path = '';
ALTER FUNCTION public.is_active_staff() SET search_path = '';

-- This function is only needed by the auth.users trigger, not as a Data API RPC.
REVOKE ALL ON FUNCTION public.handle_auth_login_update()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_auth_login_update()
  TO postgres, supabase_auth_admin;

COMMIT;
