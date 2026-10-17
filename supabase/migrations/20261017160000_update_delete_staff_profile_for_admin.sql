BEGIN;

CREATE INDEX IF NOT EXISTS idx_staff_profiles_active_admins
ON public.staff_profiles (id)
WHERE role IN ('super_admin', 'admin') AND status = 'active';

CREATE OR REPLACE FUNCTION public.delete_staff_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
  v_admin_count INT;
BEGIN
  -- Verify caller is active admin or super_admin
  SELECT role INTO v_caller_role
  FROM public.staff_profiles
  WHERE id = auth.uid() AND status = 'active';

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only an active admin can delete staff accounts.';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  SELECT role INTO v_target_role
  FROM public.staff_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    -- If already absent from staff_profiles, clean up from auth.users
    DELETE FROM auth.users WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true);
  END IF;

  -- Ensure we do not delete the last active admin
  IF v_target_role IN ('super_admin', 'admin') THEN
    PERFORM 1
    FROM public.staff_profiles
    WHERE role IN ('super_admin', 'admin') AND status = 'active'
    FOR UPDATE;

    SELECT count(*) INTO v_admin_count
    FROM public.staff_profiles
    WHERE role IN ('super_admin', 'admin') AND status = 'active';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'The last active admin cannot be deleted.';
    END IF;
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
  DELETE FROM public.staff_profiles WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_staff_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_staff_profile(UUID) TO authenticated;

COMMIT;
