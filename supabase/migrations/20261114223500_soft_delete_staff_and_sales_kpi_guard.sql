-- Soft-delete (archive) lifecycle for staff_profiles + session revocation helper + Sales Dashboard KPI 4 redaction
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE OR REPLACE FUNCTION public.revoke_staff_sessions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    IF to_regclass('auth.refresh_tokens') IS NOT NULL THEN
      DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id::text;
    END IF;
    IF to_regclass('auth.sessions') IS NOT NULL THEN
      DELETE FROM auth.sessions WHERE user_id = p_user_id;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table THEN
      -- GoTrue ban_duration + public.is_active_staff() still block all subsequent calls cleanly.
      NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_staff_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_staff_sessions(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_staff_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
  v_target_status text;
  v_admin_count int;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.staff_profiles
  WHERE id = auth.uid() AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only an active admin can archive staff accounts.';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot archive your own account.';
  END IF;

  SELECT role, status INTO v_target_role, v_target_status
  FROM public.staff_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff profile not found.';
  END IF;

  IF v_target_role = 'super_admin' AND v_caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Only a super_admin can archive a super_admin account.';
  END IF;

  IF v_target_status = 'active' THEN
    RAISE EXCEPTION 'Deactivate this staff account before archiving it from the web.';
  END IF;

  IF v_target_status = 'archived' THEN
    RETURN jsonb_build_object('success', true, 'archived', true);
  END IF;

  IF v_target_role IN ('super_admin', 'admin') THEN
    PERFORM 1
    FROM public.staff_profiles
    WHERE role IN ('super_admin', 'admin') AND status = 'active'
    FOR UPDATE;

    SELECT count(*) INTO v_admin_count
    FROM public.staff_profiles
    WHERE role IN ('super_admin', 'admin') AND status = 'active';

    IF v_admin_count <= 0 THEN
      RAISE EXCEPTION 'The last active admin cannot be archived.';
    END IF;
  END IF;

  -- Soft-archive: hide from web UI while preserving database identity & 10-year audit trails
  UPDATE public.staff_profiles
  SET
    status = 'archived',
    archived_at = COALESCE(archived_at, now()),
    updated_at = now()
  WHERE id = p_user_id;

  BEGIN
    UPDATE auth.users
    SET banned_until = '2125-01-01 00:00:00+00'::timestamptz, updated_at = now()
    WHERE id = p_user_id;
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  PERFORM public.revoke_staff_sessions(p_user_id);

  RETURN jsonb_build_object('success', true, 'archived', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_staff_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_staff_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_sales_summary(
  p_period text DEFAULT 'month',
  p_target_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_ref date := COALESCE(p_target_date, (now() AT TIME ZONE 'Asia/Vientiane')::date);
  v_start date;
  v_end date;
  v_units bigint := 0;
  v_vehicle_rev numeric := 0;
  v_excel_units bigint := 0;
  v_excel_rev numeric := 0;
  v_monthly_collected numeric := 0;
  v_can_view_financials boolean :=
    COALESCE(public.has_permission('canViewFinancials'), false)
    OR public.is_admin()
    OR public.is_super_admin();
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.is_active_staff(), false) THEN
    RAISE EXCEPTION 'Unauthorized: active staff required.';
  END IF;

  IF p_period = 'day' THEN
    v_start := v_ref;
    v_end := v_ref;
  ELSIF p_period = 'week' THEN
    v_start := v_ref - ((EXTRACT(ISODOW FROM v_ref)::integer) - 1);
    v_end := v_ref;
  ELSIF p_period = 'year' THEN
    v_start := date_trunc('year', v_ref)::date;
    v_end := v_ref;
  ELSE
    v_start := date_trunc('month', v_ref)::date;
    v_end := v_ref;
  END IF;

  WITH opening_bills AS (
    SELECT
      b.customer_id,
      b.total_usd,
      CASE
        WHEN NULLIF(b.bill_date::text, '') IS NOT NULL AND b.bill_date::text ~ '^\d{4}-\d{2}-\d{2}'
          THEN left(b.bill_date::text, 10)::date
        ELSE (b.created_at AT TIME ZONE 'Asia/Vientiane')::date
      END AS close_date,
      COALESCE(
        NULLIF((SELECT bi0.vehicle_vin FROM public.bill_items bi0 WHERE bi0.bill_id = b.id ORDER BY bi0.line_number ASC LIMIT 1), ''),
        'cust:' || COALESCE(b.customer_id::text, b.id::text)
      ) AS deal_key,
      b.created_at
    FROM public.bills b
    WHERE b.type::text IN ('sale', 'installment')
      AND COALESCE(b.status::text, 'completed') <> 'voided'
      AND COALESCE(b.installment_period, 0) = 0
  ),
  dedup_deals AS (
    SELECT DISTINCT ON (deal_key) customer_id, deal_key, total_usd, close_date
    FROM opening_bills
    ORDER BY deal_key, close_date ASC, created_at ASC
  )
  SELECT COUNT(*), COALESCE(SUM(total_usd), 0)
  INTO v_units, v_vehicle_rev
  FROM dedup_deals
  WHERE close_date BETWEEN v_start AND v_end;

  SELECT
    COUNT(*),
    COALESCE(SUM(GREATEST(0, COALESCE(c.list_price_usd - COALESCE(c.discount_usd, 0), c.paid_amount_usd, 0))), 0)
  INTO v_excel_units, v_excel_rev
  FROM public.customers c
  WHERE c.vehicle_delivered_at IS NOT NULL
    AND c.vehicle_delivered_at BETWEEN v_start AND v_end
    AND NOT EXISTS (
      SELECT 1 FROM public.bills b
      LEFT JOIN public.bill_items bi ON bi.bill_id = b.id
      WHERE b.type::text IN ('sale', 'installment')
        AND COALESCE(b.status::text, 'completed') <> 'voided'
        AND COALESCE(b.installment_period, 0) = 0
        AND (b.customer_id = c.id OR (NULLIF(c.vin, '') IS NOT NULL AND bi.vehicle_vin = c.vin))
    );

  SELECT COALESCE(SUM(b.total_usd), 0)
  INTO v_monthly_collected
  FROM public.bills b
  WHERE COALESCE(b.status::text, 'completed') <> 'voided'
    AND b.type::text = 'installment'
    AND COALESCE(b.installment_period, 0) >= 1
    AND (
      CASE
        WHEN NULLIF(b.bill_date::text, '') IS NOT NULL AND b.bill_date::text ~ '^\d{4}-\d{2}-\d{2}'
          THEN left(b.bill_date::text, 10)::date
        ELSE (b.created_at AT TIME ZONE 'Asia/Vientiane')::date
      END
    ) BETWEEN v_start AND v_end;

  RETURN jsonb_build_object(
    'total_units', v_units + v_excel_units,
    'vehicle_sales_revenue_usd', CASE WHEN v_can_view_financials THEN v_vehicle_rev + v_excel_rev ELSE 0 END,
    'monthly_installment_collected_usd', CASE WHEN v_can_view_financials THEN v_monthly_collected ELSE 0 END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_sales_summary(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_sales_summary(text, date) TO authenticated;
