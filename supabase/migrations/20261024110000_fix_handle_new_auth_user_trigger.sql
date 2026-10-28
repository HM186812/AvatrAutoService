-- Migration: 20261024110000_fix_handle_new_auth_user_trigger.sql
-- Description: Fix handle_new_auth_user trigger function by setting search_path to public, pg_catalog,
-- casting enum types properly, and allowing both public sign-up and admin-created staff to succeed without DB errors.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role text := 'general_user';
  v_meta_role text;
  v_department text;
  v_initial_status text := 'active';
BEGIN
  -- If user was invited or created with a specified role in user_metadata
  v_meta_role := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'role'), '');
  IF v_meta_role IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.staff_roles WHERE role_code::text = v_meta_role AND is_active = TRUE
    ) THEN
      v_role := v_meta_role;
    END IF;
  END IF;

  v_department := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'department'), '');

  INSERT INTO public.staff_profiles (id, email, name, phone, role, department, role_title, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'name'), ''), NULLIF(pg_catalog.split_part(COALESCE(NEW.email, ''), '@', 1), ''), 'Staff'),
    NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'phone'), ''),
    v_role,
    v_department,
    v_role,
    v_initial_status
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN EXCLUDED.name <> 'Staff' THEN EXCLUDED.name ELSE public.staff_profiles.name END,
    phone = COALESCE(EXCLUDED.phone, public.staff_profiles.phone),
    role = CASE WHEN EXCLUDED.role <> 'general_user' THEN EXCLUDED.role ELSE public.staff_profiles.role END,
    department = COALESCE(EXCLUDED.department, public.staff_profiles.department),
    role_title = CASE WHEN EXCLUDED.role_title <> 'general_user' THEN EXCLUDED.role_title ELSE public.staff_profiles.role_title END,
    updated_at = pg_catalog.now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO postgres, supabase_auth_admin;

COMMIT;
