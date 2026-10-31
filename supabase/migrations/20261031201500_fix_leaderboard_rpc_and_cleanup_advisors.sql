-- Migration: Fix get_sales_leaderboard RPC column names, drop duplicate indexes on bills,
-- and clean up redundant/unoptimized RLS policies flagged by Supabase Advisors.

-- 1. Fix public.get_sales_leaderboard RPC to reference actual bills & bill_items columns
CREATE OR REPLACE FUNCTION public.get_sales_leaderboard(
    p_period TEXT DEFAULT 'month',
    p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    staff_id UUID,
    staff_name TEXT,
    role TEXT,
    delivered_units BIGINT,
    total_revenue_usd NUMERIC,
    avg_discount_usd NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    IF p_period = 'year' THEN
        v_start_date := date_trunc('year', p_target_date::timestamptz);
        v_end_date := v_start_date + interval '1 year';
    ELSIF p_period = 'quarter' THEN
        v_start_date := date_trunc('quarter', p_target_date::timestamptz);
        v_end_date := v_start_date + interval '3 months';
    ELSE
        v_start_date := date_trunc('month', p_target_date::timestamptz);
        v_end_date := v_start_date + interval '1 month';
    END IF;

    RETURN QUERY
    SELECT
        sp.id AS staff_id,
        sp.name AS staff_name,
        sp.role AS role,
        COUNT(DISTINCT b.id)::BIGINT AS delivered_units,
        COALESCE(SUM(b.total_usd), 0)::NUMERIC AS total_revenue_usd,
        COALESCE(AVG(bi.discount_usd), 0)::NUMERIC AS avg_discount_usd
    FROM public.staff_profiles sp
    LEFT JOIN public.bills b ON (
        (b.recorded_by = sp.id OR b.sales_rep = sp.id)
        AND b.type IN ('sale', 'installment')
        AND COALESCE(b.status, 'completed') <> 'voided'
        AND b.created_at >= v_start_date
        AND b.created_at < v_end_date
    )
    LEFT JOIN public.bill_items bi ON bi.bill_id = b.id
    WHERE sp.status = 'active'
    GROUP BY sp.id, sp.name, sp.role
    ORDER BY delivered_units DESC, total_revenue_usd DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) TO authenticated;

-- 2. Drop duplicate indexes on public.bills
-- idx_bills_type_date is identical to idx_bills_type_bill_date_desc
DROP INDEX IF EXISTS public.idx_bills_type_date;
-- idx_bills_unique_bill_number is redundant with bills_bill_number_key (bill_number is NOT NULL)
DROP INDEX IF EXISTS public.idx_bills_unique_bill_number;

-- 3. Drop duplicate permissive SELECT policies on service_appointments and test_drives
-- (service_appointments_select and test_drives_select already check public.is_active_staff())
DROP POLICY IF EXISTS "service_appointments_read" ON public.service_appointments;
DROP POLICY IF EXISTS "test_drives_read" ON public.test_drives;

-- 4. Harden and optimize document_issuance_logs RLS policies (fixes auth_rls_initplan advisor)
DROP POLICY IF EXISTS "doc_logs_select_authenticated" ON public.document_issuance_logs;
CREATE POLICY "doc_logs_select_authenticated"
    ON public.document_issuance_logs
    FOR SELECT
    TO authenticated
    USING (public.is_active_staff());

DROP POLICY IF EXISTS "doc_logs_insert_authenticated" ON public.document_issuance_logs;
CREATE POLICY "doc_logs_insert_authenticated"
    ON public.document_issuance_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_active_staff());
