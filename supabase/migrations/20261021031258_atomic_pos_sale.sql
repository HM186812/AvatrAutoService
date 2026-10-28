-- Migration: 20261021031258_atomic_pos_sale.sql
-- Description: Combined customer creation, sale bill recording, and stock movement in a single atomic transaction.

CREATE OR REPLACE FUNCTION public.record_pos_sale(
  p_customer jsonb,
  p_bill jsonb,
  p_item jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  column_list text;
  update_list text;
BEGIN
  IF auth.uid() IS NULL
    OR NOT COALESCE(public.is_active_staff(), false)
    OR NOT COALESCE(public.has_permission('canDeductPOS'), false)
  THEN
    RAISE EXCEPTION 'Not authorized to record a sale';
  END IF;

  IF NULLIF(p_customer->>'id', '') IS NULL
    OR (p_bill->>'type') IS DISTINCT FROM 'sale'
    OR (p_bill->>'customer_id')
       IS DISTINCT FROM (p_customer->>'id')
  THEN
    RAISE EXCEPTION 'Invalid sale/customer relationship';
  END IF;

  -- New customers belong to the authenticated seller.
  -- Existing assignment is preserved by the conflict update below.
  p_customer := p_customer || jsonb_build_object(
    'assigned_to', auth.uid()
  );

  p_bill := p_bill || jsonb_build_object(
    'sales_rep', auth.uid(),
    'recorded_by', auth.uid()
  );

  p_item := p_item || jsonb_build_object(
    'bill_id', p_bill->>'id'
  );

  SELECT
    string_agg(format('%I', field_name), ',' ORDER BY field_name),
    string_agg(
      format('%1$I = EXCLUDED.%1$I', field_name),
      ',' ORDER BY field_name
    ) FILTER (
      WHERE field_name NOT IN ('id', 'created_at', 'assigned_to')
    )
  INTO column_list, update_list
  FROM jsonb_object_keys(p_customer) AS fields(field_name);

  IF update_list IS NULL THEN
    RAISE EXCEPTION 'Customer payload is incomplete';
  END IF;

  EXECUTE format(
    'INSERT INTO public.customers (%1$s)
     SELECT %1$s
     FROM pg_catalog.jsonb_populate_record(
       NULL::public.customers, $1
     )
     WHERE true
     ON CONFLICT (id) DO UPDATE SET %2$s',
    column_list,
    update_list
  )
  USING p_customer;

  PERFORM public.record_vehicle_bill(
    p_bill => p_bill,
    p_item => p_item,
    p_movement_type => 'stock_out'
  );
END;
$$;

REVOKE ALL ON FUNCTION
  public.record_pos_sale(jsonb, jsonb, jsonb)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.record_pos_sale(jsonb, jsonb, jsonb)
  TO authenticated;
