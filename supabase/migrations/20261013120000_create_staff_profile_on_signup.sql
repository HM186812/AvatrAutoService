BEGIN;

INSERT INTO public.staff_roles (
  role_code,
  display_name_lo,
  display_name_en,
  display_name_th,
  description,
  permissions,
  sort_order,
  is_active
)
VALUES (
  'general_user',
  'ຜູ້ໃຊ້ທົ່ວໄປ',
  'General User',
  'ผู้ใช้ทั่วไป',
  'Default role for self-registered staff accounts.',
  '{}'::jsonb,
  5,
  TRUE
)
ON CONFLICT (role_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := 'general_user';
  v_meta_role text;
  v_department text;
BEGIN
  -- If user was invited by an admin, allow the role from invite metadata if valid and active
  IF NEW.invited_at IS NOT NULL THEN
    v_meta_role := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'role'), '');
    IF v_meta_role IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.staff_roles WHERE role_code = v_meta_role AND is_active = TRUE
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
    'active'
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
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO postgres, supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created_staff_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_staff_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;
