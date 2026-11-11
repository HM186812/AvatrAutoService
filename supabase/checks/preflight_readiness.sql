-- =============================================================================
-- AVATR Auto Service: database readiness check (READ-ONLY)
-- =============================================================================
-- What it does: lists everything the web app needs from the database and shows
--   OK / MISSING for each item. It only reads catalogs: it creates, changes and
--   deletes nothing, so it is safe to run on the production database.
-- How to run: Supabase Dashboard -> SQL Editor -> paste this file -> Run.
-- Expected result: no row with status = 'MISSING'. Each MISSING row says which
--   migration (or manual step) provides the item.
-- Generated from the frontend code on 2026-11-11 (src/backend/data.ts and friends).
-- =============================================================================

WITH
required_tables(tbl) AS (
  VALUES ('customers'), ('vehicles'), ('vehicle_models'), ('bills'), ('bill_items'),
         ('stock_movements'), ('service_appointments'), ('test_drives'), ('staff_profiles'),
         ('staff_roles'), ('dealership_settings'), ('document_issuance_logs'),
         ('bills_archive'), ('bill_items_archive'), ('bill_void_logs')
),
required_columns(tbl, col, source) AS (
  VALUES
  -- customers (base)
  ('customers','id',''),('customers','name',''),('customers','phone',''),('customers','email',''),
  ('customers','status',''),('customers','category',''),('customers','source',''),('customers','priority',''),
  ('customers','notes',''),('customers','province',''),('customers','district',''),('customers','village',''),
  ('customers','budget',''),('customers','color',''),('customers','vin',''),('customers','assigned_to',''),
  ('customers','interested_model_id',''),('customers','id_card_number',''),('customers','created_at',''),
  ('customers','updated_at',''),('customers','last_follow_up',''),('customers','next_test_drive_at',''),
  ('customers','engine_number',''),('customers','plate_number',''),
  -- customers (payment / installment / after-sales)
  ('customers','payment_type',''),('customers','payment_type_confirmed',''),('customers','payment_date',''),
  ('customers','payment_receipt_no',''),('customers','payment_bank',''),('customers','payment_method_ref',''),
  ('customers','payment_confirmed_by',''),('customers','paid_amount_usd',''),('customers','paid_amount_lak',''),
  ('customers','paid_date',''),('customers','is_payment_completed',''),('customers','installment_status',''),
  ('customers','installment_records',''),('customers','down_payment_percent',''),('customers','down_payment_usd',''),
  ('customers','tenure_months',''),('customers','monthly_payment_lak',''),('customers','finance_company',''),
  ('customers','warranty_start_date','20261020203000_after_sales_columns_and_storage_buckets'),
  ('customers','warranty_expiry_date','20261020203000_after_sales_columns_and_storage_buckets'),
  ('customers','warranty_years','20261020203000_after_sales_columns_and_storage_buckets'),
  ('customers','warranty_distance_km','20261020203000_after_sales_columns_and_storage_buckets'),
  ('customers','warranty_terms','20261020203000_after_sales_columns_and_storage_buckets'),
  ('customers','current_mileage_km','20261020203000_after_sales_columns_and_storage_buckets'),
  ('customers','battery_health_soh','20261020203000_after_sales_columns_and_storage_buckets'),
  ('customers','after_sales_notes','20261020203000_after_sales_columns_and_storage_buckets'),
  -- customers (pipeline)
  ('customers','next_follow_up_at','20261109120000_customer_pipeline_fields'),
  ('customers','contact_history','20261109120000_customer_pipeline_fields'),
  ('customers','booking_deposit_usd','20261109120000_customer_pipeline_fields'),
  ('customers','booking_payment_method','20261109120000_customer_pipeline_fields'),
  ('customers','booking_date','20261109120000_customer_pipeline_fields'),
  ('customers','booking_note','20261109120000_customer_pipeline_fields'),
  ('customers','vehicle_delivered_at','20261109120000_customer_pipeline_fields'),
  ('customers','vehicle_delivered_by','20261109120000_customer_pipeline_fields'),
  ('customers','delivery_note','20261109120000_customer_pipeline_fields'),
  -- customers (Excel parity)
  ('customers','list_price_usd','20261110120000_excel_parity_fields'),
  ('customers','discount_usd','20261110120000_excel_parity_fields'),
  ('customers','delivery_window','20261110120000_excel_parity_fields'),
  ('customers','gift_items','20261110120000_excel_parity_fields'),
  ('customers','gift_budget_usd','20261110120000_excel_parity_fields'),
  -- vehicles
  ('vehicles','vin',''),('vehicles','model_id',''),('vehicles','trim',''),('vehicles','color',''),
  ('vehicles','color_hex',''),('vehicles','interior_color',''),('vehicles','battery',''),('vehicles','status',''),
  ('vehicles','location',''),('vehicles','plate_number',''),('vehicles','engine_number',''),
  ('vehicles','price_usd',''),('vehicles','price_lak',''),('vehicles','arrival_date',''),('vehicles','mileage_km',''),
  ('vehicles','pdi_status',''),('vehicles','pdi_inspector',''),('vehicles','pdi_notes',''),
  ('vehicles','reserved_for_customer',''),('vehicles','image_url',''),('vehicles','event_campaign',''),
  ('vehicles','event_start_date',''),('vehicles','event_end_date',''),('vehicles','event_location',''),
  ('vehicles','promotion_discount_usd',''),('vehicles','promotion_notes',''),('vehicles','created_at',''),
  ('vehicles','updated_at',''),
  ('vehicles','front_motor_number','20261110120000_excel_parity_fields'),
  ('vehicles','rear_motor_number','20261110120000_excel_parity_fields'),
  ('vehicles','powertrain_type','20261110120000_excel_parity_fields'),
  ('vehicles','incoming_batch','20261110120000_excel_parity_fields'),
  ('vehicles','expected_arrival_date','20261110120000_excel_parity_fields'),
  ('vehicles','issue_note','20261110120000_excel_parity_fields'),
  -- vehicle_models
  ('vehicle_models','id',''),('vehicle_models','name',''),('vehicle_models','subtitle',''),('vehicle_models','tagline',''),
  ('vehicle_models','category',''),('vehicle_models','price_starting_usd',''),('vehicle_models','price_starting_lak',''),
  ('vehicle_models','is_custom',''),('vehicle_models','colors',''),('vehicle_models','features',''),
  ('vehicle_models','description',''),('vehicle_models','hero_image',''),('vehicle_models','created_at',''),
  ('vehicle_models','brand','20261110120000_excel_parity_fields'),
  -- bills
  ('bills','id',''),('bills','bill_number',''),('bills','type',''),('bills','status',''),('bills','bill_date',''),
  ('bills','customer_id',''),('bills','customer_name',''),('bills','customer_phone',''),('bills','customer_id_card',''),
  ('bills','customer_address',''),('bills','customer_province',''),('bills','sales_rep',''),('bills','recorded_by',''),
  ('bills','payment_method',''),('bills','qr_used',''),('bills','bank_name',''),('bills','transfer_ref',''),
  ('bills','finance_company',''),('bills','down_payment_percent',''),('bills','down_payment_usd',''),
  ('bills','tenure_months',''),('bills','monthly_payment_lak',''),('bills','free_gifts',''),('bills','warranty_terms',''),
  ('bills','supplier_name',''),('bills','customs_doc_number',''),('bills','import_entry_port',''),
  ('bills','destination_warehouse',''),('bills','total_usd',''),('bills','total_lak',''),('bills','payment_slip_path',''),
  ('bills','notes',''),('bills','created_at',''),('bills','updated_at',''),
  ('bills','installment_period','20261020203000_after_sales_columns_and_storage_buckets'),
  ('bills','warranty_start_date','20261020203000_after_sales_columns_and_storage_buckets'),
  ('bills','warranty_expiry_date','20261020203000_after_sales_columns_and_storage_buckets'),
  ('bills','warranty_years','20261020203000_after_sales_columns_and_storage_buckets'),
  ('bills','warranty_distance_km','20261020203000_after_sales_columns_and_storage_buckets'),
  ('bills','current_mileage_km','20261020203000_after_sales_columns_and_storage_buckets'),
  ('bills','battery_health_soh','20261020203000_after_sales_columns_and_storage_buckets'),
  ('bills','after_sales_notes','20261020203000_after_sales_columns_and_storage_buckets'),
  -- bill_items
  ('bill_items','id',''),('bill_items','bill_id',''),('bill_items','line_number',''),('bill_items','vehicle_vin',''),
  ('bill_items','model_name',''),('bill_items','trim',''),('bill_items','plate_number',''),('bill_items','color',''),
  ('bill_items','interior_color',''),('bill_items','battery',''),('bill_items','unit_price_usd',''),
  ('bill_items','unit_price_lak',''),('bill_items','discount_usd',''),('bill_items','discount_lak',''),
  ('bill_items','pdi_status_initial',''),('bill_items','status_initial',''),('bill_items','inspector_name',''),
  ('bill_items','event_campaign',''),('bill_items','event_start_date',''),('bill_items','event_end_date',''),
  ('bill_items','event_location',''),
  ('bill_items','engine_number','20261017190000_complete_audit_fixes'),
  -- other tables
  ('stock_movements','id',''),('stock_movements','vehicle_vin',''),('stock_movements','movement_type',''),
  ('stock_movements','bill_id',''),('stock_movements','recorded_by',''),('stock_movements','notes',''),
  ('stock_movements','created_at',''),
  ('service_appointments','id',''),('service_appointments','customer_id',''),('service_appointments','customer_name',''),
  ('service_appointments','phone',''),('service_appointments','model',''),('service_appointments','plate_number',''),
  ('service_appointments','service_type',''),('service_appointments','scheduled_date',''),
  ('service_appointments','scheduled_time',''),('service_appointments','status',''),('service_appointments','technician',''),
  ('service_appointments','estimated_cost_usd',''),('service_appointments','battery_health_percent',''),
  ('service_appointments','notes',''),
  ('service_appointments','mileage_km','20261020203000_after_sales_columns_and_storage_buckets'),
  ('test_drives','id',''),('test_drives','customer_id',''),('test_drives','customer_name',''),('test_drives','phone',''),
  ('test_drives','model',''),('test_drives','drive_date',''),('test_drives','time_slot',''),('test_drives','location',''),
  ('test_drives','sales_rep',''),('test_drives','status',''),
  ('staff_profiles','id',''),('staff_profiles','email',''),('staff_profiles','name',''),('staff_profiles','phone',''),
  ('staff_profiles','role',''),('staff_profiles','department',''),('staff_profiles','role_title',''),
  ('staff_profiles','status',''),('staff_profiles','created_at',''),('staff_profiles','last_login',''),
  ('staff_roles','role_code',''),('staff_roles','permissions',''),('staff_roles','is_active',''),
  ('dealership_settings','id',''),('dealership_settings','config',''),('dealership_settings','updated_by',''),
  ('document_issuance_logs','id','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','document_type','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','serial_number','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','customer_name','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','customer_phone','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','vin','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','lead_id','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','issued_by_name','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','notes','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','metadata','20261028160000_create_document_issuance_logs'),
  ('document_issuance_logs','created_at','20261028160000_create_document_issuance_logs'),
  ('bill_void_logs','bill_id','20261111120000_bill_void_reason'),
  ('bill_void_logs','reason','20261111120000_bill_void_reason'),
  ('bill_void_logs','voided_by_name','20261111120000_bill_void_reason'),
  ('bill_void_logs','voided_at','20261111120000_bill_void_reason')
),
required_functions(signature, source) AS (
  VALUES
  ('public.get_showroom_initial_data()', '20261110120000_excel_parity_fields (no 250/500 row cap)'),
  ('public.record_pos_sale(jsonb,jsonb,jsonb)', '20261021031258_atomic_pos_sale'),
  ('public.record_vehicle_bill(jsonb,jsonb,text,jsonb)', '20261017213000_enterprise_security_and_atomicity_fixes'),
  ('public.delete_vehicle_bill(uuid)', '20261024120000_void_bill_and_stock_return'),
  ('public.void_bill_with_reason(uuid,text)', '20261111120000_bill_void_reason'),
  ('public.delete_vehicle_from_inventory(text)', 'earlier migrations'),
  ('public.generate_next_bill_number(text)', '20261029093000_atomic_bill_number_generator'),
  ('public.archive_fiscal_year_bills(integer)', '20261029120000_bills_yearly_archive_partitioning'),
  ('public.delete_staff_profile(uuid)', 'earlier migrations'),
  ('public.reactivate_staff_profile(uuid)', 'earlier migrations'),
  ('public.is_admin()', '20261024111500_database_and_index_optimizations'),
  ('public.is_active_staff()', '20261013041052_split_staff_roles_manage_policy'),
  ('public.has_permission(text)', '20261020204500_allow_installment_bills_rls')
),
-- Tables the app READS directly (not through a SECURITY DEFINER RPC): each needs a SELECT policy for staff
required_select_policies(tbl) AS (
  VALUES ('bills'), ('bill_items'), ('stock_movements'), ('service_appointments'), ('test_drives'),
         ('staff_profiles'), ('staff_roles'), ('dealership_settings'), ('document_issuance_logs'),
         ('customers'), ('vehicles'), ('vehicle_models'), ('bill_void_logs')
),
required_buckets(bucket) AS (
  VALUES ('dealership-assets'), ('payment-slips')
),
results AS (
  SELECT 1 AS ord, 'table' AS kind, t.tbl AS item,
         CASE WHEN to_regclass('public.' || t.tbl) IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status,
         'see migrations' AS fix
  FROM required_tables t
  UNION ALL
  SELECT 2, 'column', c.tbl || '.' || c.col,
         CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns ic
           WHERE ic.table_schema = 'public' AND ic.table_name = c.tbl AND ic.column_name = c.col
         ) THEN 'OK' ELSE 'MISSING' END,
         COALESCE(NULLIF(c.source, ''), 'baseline / earlier migrations')
  FROM required_columns c
  UNION ALL
  SELECT 3, 'function', f.signature,
         CASE WHEN to_regprocedure(f.signature) IS NOT NULL THEN 'OK' ELSE 'MISSING' END,
         f.source
  FROM required_functions f
  UNION ALL
  SELECT 4, 'rls enabled', p.tbl,
         CASE WHEN EXISTS (SELECT 1 FROM pg_class pc JOIN pg_namespace n ON n.oid = pc.relnamespace
                           WHERE n.nspname = 'public' AND pc.relname = p.tbl AND pc.relrowsecurity)
              THEN 'OK' ELSE 'MISSING' END,
         'ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY'
  FROM required_select_policies p
  UNION ALL
  SELECT 5, 'select policy', p.tbl,
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies pp
                           WHERE pp.schemaname = 'public' AND pp.tablename = p.tbl AND pp.cmd IN ('SELECT', 'ALL'))
              THEN 'OK' ELSE 'MISSING' END,
         'Not in repo migrations: every active staff account needs SELECT (e.g. USING (public.is_active_staff()))'
  FROM required_select_policies p
  UNION ALL
  SELECT 6, 'storage bucket', b.bucket,
         CASE WHEN EXISTS (SELECT 1 FROM storage.buckets sb WHERE sb.id = b.bucket) THEN 'OK' ELSE 'MISSING' END,
         '20261020203000_after_sales_columns_and_storage_buckets'
  FROM required_buckets b
  UNION ALL
  -- The two app roles must exist with the permissions the RLS policies check
  SELECT 7, 'role', r.role_code || ' can sell (canDeductPOS)',
         CASE WHEN EXISTS (SELECT 1 FROM public.staff_roles sr
                           WHERE sr.role_code::text = r.role_code AND sr.is_active
                             AND (sr.permissions->>'canDeductPOS')::boolean)
              THEN 'OK' ELSE 'MISSING' END,
         'staff_roles rows (20261017190000_complete_audit_fixes)'
  FROM (VALUES ('admin'), ('sales')) AS r(role_code)
  UNION ALL
  SELECT 8, 'admin account', 'at least one active Admin',
         CASE WHEN EXISTS (SELECT 1 FROM public.staff_profiles
                           WHERE role::text IN ('admin', 'super_admin') AND status = 'active')
              THEN 'OK' ELSE 'MISSING' END,
         'Create the first Admin account'
  UNION ALL
  -- Old Technician / General User accounts cannot sign in any more (only Admin and Sales exist)
  SELECT 9, 'legacy role accounts', COALESCE(string_agg(email, ', '), 'none'),
         CASE WHEN count(*) = 0 THEN 'OK' ELSE 'REVIEW' END,
         'Give these accounts the Admin or Sales role in User Management'
  FROM public.staff_profiles
  WHERE role::text NOT IN ('admin', 'super_admin', 'sales')
  UNION ALL
  -- Voiding bills keeps stock and stock history consistent
  SELECT 10, 'vehicle status', 'vehicle_status has removed',
         CASE WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type ty ON ty.oid = e.enumtypid
                           WHERE ty.typname = 'vehicle_status' AND e.enumlabel = 'removed')
              THEN 'OK' ELSE 'MISSING' END,
         '20261111130000_void_bill_stock_consistency'
  UNION ALL
  SELECT 11, 'movement types', 'stock_movements allows stock_return / import_void',
         CASE WHEN EXISTS (SELECT 1 FROM pg_constraint
                           WHERE conname = 'stock_movements_movement_type_check'
                             AND pg_get_constraintdef(oid) LIKE '%import_void%')
              THEN 'OK' ELSE 'MISSING' END,
         '20261111130000_void_bill_stock_consistency'
)
SELECT kind, item, status, fix
FROM results
ORDER BY (status = 'OK'), ord, item;

-- Optional: migrations recorded by the Supabase CLI (only if migrations were applied with the CLI)
-- SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;
