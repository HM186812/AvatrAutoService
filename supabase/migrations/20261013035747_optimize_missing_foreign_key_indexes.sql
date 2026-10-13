-- Add indexes on the foreign-key columns identified by Supabase's production
-- performance advisor. This changes no rows, columns, or application behavior.

CREATE INDEX IF NOT EXISTS idx_bills_recorded_by
  ON public.bills (recorded_by);

CREATE INDEX IF NOT EXISTS idx_bills_sales_rep
  ON public.bills (sales_rep);

CREATE INDEX IF NOT EXISTS idx_customers_assigned_to
  ON public.customers (assigned_to);

CREATE INDEX IF NOT EXISTS idx_customers_interested_model_id
  ON public.customers (interested_model_id);

CREATE INDEX IF NOT EXISTS idx_dealership_settings_updated_by
  ON public.dealership_settings (updated_by);

CREATE INDEX IF NOT EXISTS idx_service_appointments_created_by
  ON public.service_appointments (created_by);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_role
  ON public.staff_profiles (role);

CREATE INDEX IF NOT EXISTS idx_stock_movements_recorded_by
  ON public.stock_movements (recorded_by);

CREATE INDEX IF NOT EXISTS idx_test_drives_created_by
  ON public.test_drives (created_by);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_created_by
  ON public.vehicle_models (created_by);

CREATE INDEX IF NOT EXISTS idx_vehicles_reserved_for_customer
  ON public.vehicles (reserved_for_customer);
