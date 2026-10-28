-- Use an empty search_path for SECURITY DEFINER functions whose references
-- are schema-qualified, preventing objects in writable schemas from shadowing them.
BEGIN;

ALTER FUNCTION public.delete_vehicle_bill(uuid) SET search_path = '';
ALTER FUNCTION public.is_active_staff() SET search_path = '';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_auth_login_update') THEN
    ALTER FUNCTION public.handle_auth_login_update() SET search_path = '';
    REVOKE ALL ON FUNCTION public.handle_auth_login_update()
      FROM PUBLIC, anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.handle_auth_login_update()
      TO postgres, supabase_auth_admin;
  END IF;
END $$;

COMMIT;
