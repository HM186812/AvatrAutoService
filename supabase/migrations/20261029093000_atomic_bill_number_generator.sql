-- Migration: Atomic Bill Number Generator via PostgreSQL Sequence
-- Replaces client-side Math.random() with guaranteed collision-free, monotonic sequence numbers

CREATE SEQUENCE IF NOT EXISTS public.bill_number_seq START WITH 1001;

-- Set sequence to at least MAX existing bill number suffix + 1
DO $$
DECLARE
  v_max_id BIGINT;
BEGIN
  -- Safe initial offset
  PERFORM setval('public.bill_number_seq', GREATEST(1001, (SELECT COUNT(*) + 1001 FROM public.bills)));
END $$;

CREATE OR REPLACE FUNCTION public.generate_next_bill_number(p_prefix TEXT DEFAULT 'INV')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_year TEXT;
    v_seq BIGINT;
    v_result TEXT;
    v_exists BOOLEAN;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    LOOP
        v_seq := nextval('public.bill_number_seq');
        v_result := p_prefix || '-' || v_year || '-' || lpad(v_seq::text, 5, '0');
        
        SELECT EXISTS(SELECT 1 FROM public.bills WHERE bill_number = v_result) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_bill_number(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_next_bill_number(TEXT) TO authenticated;
