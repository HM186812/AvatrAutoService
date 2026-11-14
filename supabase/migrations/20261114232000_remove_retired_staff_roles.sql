-- Remove retired staff_roles ('technician', 'general_user') cleanly after updating auth trigger fallback
BEGIN;

DO $$
DECLARE
  v_active_legacy text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_roles WHERE role_code = 'sales' AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Active sales role must exist before removing general_user fallback.';
  END IF;

  SELECT string_agg(email || ' (' || role || ')', ', ')
  INTO v_active_legacy
  FROM public.staff_profiles
  WHERE status = 'active'
    AND role IN ('technician', 'general_user');

  IF v_active_legacy IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot delete retired roles while active staff accounts hold them: %', v_active_legacy;
  END IF;
END $$;

-- Preserve suspended/archived status on any historical inactive accounts before removing FK target rows
UPDATE public.staff_profiles
SET
  role = 'sales',
  role_title = 'sales',
  updated_at = now()
WHERE role IN ('technician', 'general_user');

-- Replace 'general_user' trigger fallback with 'sales' while keeping self-signup / non-invited accounts strictly suspended
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := 'sales';
  v_meta_role text;
  v_department text;
  v_initial_status text := 'suspended';
BEGIN
  IF NEW.invited_at IS NOT NULL THEN
    v_initial_status := 'active';
    v_meta_role := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'role'), '');
    IF v_meta_role IS NOT NULL AND EXISTS (
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
    COALESCE(
      NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'name'), ''),
      NULLIF(pg_catalog.split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Staff'
    ),
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
    role = CASE WHEN NEW.invited_at IS NOT NULL THEN EXCLUDED.role ELSE public.staff_profiles.role END,
    department = COALESCE(EXCLUDED.department, public.staff_profiles.department),
    role_title = CASE WHEN NEW.invited_at IS NOT NULL THEN EXCLUDED.role_title ELSE public.staff_profiles.role_title END,
    updated_at = pg_catalog.now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated, service_role;

DELETE FROM public.staff_roles
WHERE role_code IN ('technician', 'general_user');

COMMIT;
