-- Keep authenticated SELECT access on staff_roles unchanged.
-- Split the former ALL policy so it no longer overlaps the SELECT policy.
BEGIN;

DO $$ BEGIN
  CREATE TYPE public.staff_role AS ENUM ('super_admin', 'admin', 'sales', 'technician', 'general_user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

DROP POLICY IF EXISTS "staff_roles_manage_super_admin" ON public.staff_roles;
DROP POLICY IF EXISTS "staff_roles_insert_super_admin" ON public.staff_roles;
DROP POLICY IF EXISTS "staff_roles_update_super_admin" ON public.staff_roles;
DROP POLICY IF EXISTS "staff_roles_delete_super_admin" ON public.staff_roles;

CREATE POLICY "staff_roles_insert_super_admin"
  ON public.staff_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active_staff()
    AND EXISTS (
      SELECT 1
      FROM public.staff_profiles AS sp
      WHERE sp.id = (SELECT auth.uid())
        AND sp.role::text = 'super_admin'
    )
  );

CREATE POLICY "staff_roles_update_super_admin"
  ON public.staff_roles
  FOR UPDATE TO authenticated
  USING (
    is_active_staff()
    AND EXISTS (
      SELECT 1
      FROM public.staff_profiles AS sp
      WHERE sp.id = (SELECT auth.uid())
        AND sp.role::text = 'super_admin'
    )
  )
  WITH CHECK (
    is_active_staff()
    AND EXISTS (
      SELECT 1
      FROM public.staff_profiles AS sp
      WHERE sp.id = (SELECT auth.uid())
        AND sp.role::text = 'super_admin'
    )
  );

CREATE POLICY "staff_roles_delete_super_admin"
  ON public.staff_roles
  FOR DELETE TO authenticated
  USING (
    is_active_staff()
    AND EXISTS (
      SELECT 1
      FROM public.staff_profiles AS sp
      WHERE sp.id = (SELECT auth.uid())
        AND sp.role::text = 'super_admin'
    )
  );

COMMIT;
