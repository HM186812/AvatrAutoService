-- Keep authenticated SELECT access on staff_roles unchanged.
-- Split the former ALL policy so it no longer overlaps the SELECT policy.
BEGIN;

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
        AND sp.role = 'super_admin'::public.staff_role
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
        AND sp.role = 'super_admin'::public.staff_role
    )
  )
  WITH CHECK (
    is_active_staff()
    AND EXISTS (
      SELECT 1
      FROM public.staff_profiles AS sp
      WHERE sp.id = (SELECT auth.uid())
        AND sp.role = 'super_admin'::public.staff_role
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
        AND sp.role = 'super_admin'::public.staff_role
    )
  );

COMMIT;
