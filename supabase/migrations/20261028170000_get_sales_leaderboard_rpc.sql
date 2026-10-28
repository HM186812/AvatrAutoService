-- Migration: Stored Procedure to aggregate sales leaderboard from bills and staff profiles
-- Fast server-side calculation for showroom KPI

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
        -- default to month
        v_start_date := date_trunc('month', p_target_date::timestamptz);
        v_end_date := v_start_date + interval '1 month';
    END IF;

    RETURN QUERY
    SELECT
        sp.id AS staff_id,
        sp.name AS staff_name,
        sp.role AS role,
        COUNT(b.id)::BIGINT AS delivered_units,
        COALESCE(SUM(b.net_total_usd), 0)::NUMERIC AS total_revenue_usd,
        COALESCE(AVG(b.unit_price_usd - b.net_total_usd), 0)::NUMERIC AS avg_discount_usd
    FROM public.staff_profiles sp
    LEFT JOIN public.bills b ON (
        (b.recorded_by = sp.id OR b.sales_rep = sp.id)
        AND b.bill_type IN ('sale', 'installment')
        AND b.created_at >= v_start_date
        AND b.created_at < v_end_date
    )
    WHERE sp.status = 'active'
    GROUP BY sp.id, sp.name, sp.role
    ORDER BY delivered_units DESC, total_revenue_usd DESC;
END;
$$;

-- Grant execution to authenticated staff
REVOKE EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sales_leaderboard(TEXT, DATE) TO authenticated;
