-- ==============================================================================
-- AVATR AUTO SERVICE LAOS - BASELINE DATABASE SCHEMA (PRODUCTION V1.3)
-- Created for initial setup & reproducing live schema accurately.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. VEHICLE MODELS (ລຸ້ນລົດຍົນ)
CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT,
  tagline TEXT,
  category TEXT,
  price_starting_usd NUMERIC NOT NULL,
  price_starting_lak NUMERIC,
  range_cltc TEXT,
  acceleration TEXT,
  battery_capacity TEXT,
  battery_supplier TEXT,
  charging_speed TEXT,
  smart_driving TEXT,
  powertrain TEXT,
  colors JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  gallery JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  hero_image TEXT,
  extra_specs JSONB DEFAULT '{}'::jsonb,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VEHICLES (ລົດໃນສະຕ໋ອກ)
CREATE TABLE IF NOT EXISTS public.vehicles (
  vin TEXT PRIMARY KEY CHECK (length(vin) = 17),
  model_id TEXT NOT NULL REFERENCES public.vehicle_models(id) ON UPDATE CASCADE,
  plate_number TEXT,
  color TEXT,
  color_hex TEXT,
  interior_color TEXT,
  trim TEXT,
  battery TEXT,
  price_usd NUMERIC NOT NULL,
  price_lak NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  pdi_status TEXT DEFAULT 'pending',
  pdi_inspector TEXT,
  pdi_notes TEXT,
  location TEXT,
  image_url TEXT,
  reserved_for_customer JSONB,
  arrival_date TEXT,
  mileage_km NUMERIC DEFAULT 0,
  event_campaign TEXT,
  event_start_date TEXT,
  event_end_date TEXT,
  event_location TEXT,
  promotion_discount_usd NUMERIC DEFAULT 0,
  promotion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMERS & LEADS (ລູກຄ້າ ແລະ ຜູ້ສົນໃຈ)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  category TEXT DEFAULT 'walk_in',
  source TEXT,
  interested_model_id TEXT REFERENCES public.vehicle_models(id) ON UPDATE CASCADE,
  status TEXT DEFAULT 'new',
  priority TEXT DEFAULT 'normal',
  budget TEXT,
  assigned_to UUID,
  notes TEXT,
  last_follow_up TIMESTAMPTZ,
  next_test_drive_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BILLS (ບັນທຶກບິນຂາຍ ແລະ ບິນຮັບເຂົ້າ)
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('sale', 'import')),
  status TEXT DEFAULT 'completed',
  bill_date TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_id_card TEXT,
  customer_address TEXT,
  customer_province TEXT,
  sales_rep UUID,
  recorded_by UUID,
  payment_method TEXT,
  qr_used TEXT,
  bank_name TEXT,
  transfer_ref TEXT,
  finance_company TEXT,
  down_payment_percent NUMERIC,
  down_payment_usd NUMERIC,
  tenure_months INTEGER,
  monthly_payment_lak NUMERIC,
  free_gifts JSONB DEFAULT '[]'::jsonb,
  warranty_terms TEXT,
  supplier_name TEXT,
  customs_doc_number TEXT,
  import_entry_port TEXT,
  destination_warehouse TEXT,
  total_usd NUMERIC NOT NULL,
  total_lak NUMERIC NOT NULL,
  payment_slip_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BILL ITEMS (ລາຍການລົດໃນແຕ່ລະບິນ)
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL DEFAULT 1,
  vehicle_vin TEXT NOT NULL REFERENCES public.vehicles(vin) ON UPDATE CASCADE,
  model_name TEXT NOT NULL,
  trim TEXT,
  plate_number TEXT,
  color TEXT,
  interior_color TEXT,
  battery TEXT,
  unit_price_usd NUMERIC NOT NULL,
  unit_price_lak NUMERIC NOT NULL,
  discount_usd NUMERIC DEFAULT 0,
  discount_lak NUMERIC DEFAULT 0,
  pdi_status_initial TEXT,
  status_initial TEXT,
  inspector_name TEXT,
  event_campaign TEXT,
  event_start_date TEXT,
  event_end_date TEXT,
  event_location TEXT
);

-- 7. STOCK MOVEMENTS (ປະຫວັດການເຄື່ອນໄຫວສະຕ໋ອກ)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_vin TEXT NOT NULL REFERENCES public.vehicles(vin) ON UPDATE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('stock_in', 'stock_out')),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SERVICE APPOINTMENTS (ນັດໝາຍສ້ອມບຳລຸງ ແລະ ກວດເຊັກ)
CREATE TABLE IF NOT EXISTS public.service_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  model TEXT NOT NULL,
  plate_number TEXT,
  service_type TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  technician TEXT,
  estimated_cost_usd NUMERIC DEFAULT 0,
  battery_health_percent NUMERIC,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TEST DRIVES (ນັດໝາຍທົດລອງຂັບ)
CREATE TABLE IF NOT EXISTS public.test_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  model TEXT NOT NULL,
  drive_date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  location TEXT NOT NULL,
  sales_rep TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DEALERSHIP SETTINGS (ການຕັ້ງຄ່າສູນ, ສະກຸນເງິນ, ແພັກເກດ)
CREATE TABLE IF NOT EXISTS public.dealership_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. STAFF PROFILES & ROLES (ໂປຣໄຟລ໌ ແລະ ສິດທິພະນັກງານ)
CREATE TABLE IF NOT EXISTS public.staff_roles (
  role_code TEXT PRIMARY KEY,
  display_name_lo TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  display_name_th TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  role TEXT NOT NULL REFERENCES public.staff_roles(role_code) ON UPDATE CASCADE,
  department TEXT,
  role_title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. RPC FUNCTION: record_vehicle_bill (Atomic stock-in / sale transaction)
CREATE OR REPLACE FUNCTION public.record_vehicle_bill(
  p_bill jsonb,
  p_item jsonb,
  p_movement_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill_id uuid;
  v_vin text;
BEGIN
  v_bill_id := (p_bill->>'id')::uuid;
  v_vin := p_item->>'vehicle_vin';

  IF v_bill_id IS NULL OR (p_bill->>'bill_number') IS NULL THEN
    RAISE EXCEPTION 'Bill ID and bill number are required.';
  END IF;

  -- Insert Bill
  INSERT INTO public.bills (
    id, bill_number, type, bill_date, customer_id, customer_name,
    customer_phone, customer_id_card, customer_address, customer_province,
    sales_rep, recorded_by, payment_method, qr_used, bank_name,
    transfer_ref, finance_company, down_payment_percent, down_payment_usd,
    tenure_months, monthly_payment_lak, free_gifts, warranty_terms,
    supplier_name, customs_doc_number, import_entry_port,
    destination_warehouse, total_usd, total_lak, payment_slip_path, notes
  ) VALUES (
    v_bill_id,
    p_bill->>'bill_number',
    p_bill->>'type',
    p_bill->>'bill_date',
    (p_bill->>'customer_id')::uuid,
    p_bill->>'customer_name',
    p_bill->>'phone',
    p_bill->>'id_card',
    p_bill->>'address',
    p_bill->>'province',
    (p_bill->>'sales_rep')::uuid,
    (p_bill->>'recorded_by')::uuid,
    p_bill->>'payment_method',
    p_bill->>'qr_used',
    p_bill->>'bank_name',
    p_bill->>'transfer_ref',
    p_bill->>'finance_company',
    (p_bill->>'down_payment_percent')::numeric,
    (p_bill->>'down_payment_usd')::numeric,
    (p_bill->>'tenure_months')::integer,
    (p_bill->>'monthly_payment_lak')::numeric,
    COALESCE(p_bill->'free_gifts', '[]'::jsonb),
    p_bill->>'warranty_terms',
    p_bill->>'supplier_name',
    p_bill->>'customs_doc_number',
    p_bill->>'import_entry_port',
    p_bill->>'destination_warehouse',
    (p_bill->>'total_usd')::numeric,
    (p_bill->>'total_lak')::numeric,
    p_bill->>'payment_slip_path',
    p_bill->>'notes'
  )
  ON CONFLICT (id) DO UPDATE SET
    total_usd = EXCLUDED.total_usd,
    total_lak = EXCLUDED.total_lak,
    updated_at = NOW();

  -- Insert Bill Item
  INSERT INTO public.bill_items (
    id, bill_id, line_number, vehicle_vin, model_name, trim,
    plate_number, color, interior_color, battery, unit_price_usd,
    unit_price_lak, discount_usd, discount_lak, pdi_status_initial,
    status_initial, inspector_name, event_campaign, event_start_date,
    event_end_date, event_location
  ) VALUES (
    (p_item->>'id')::uuid,
    v_bill_id,
    COALESCE((p_item->>'line_number')::integer, 1),
    v_vin,
    p_item->>'model_name',
    p_item->>'trim',
    p_item->>'plate_number',
    p_item->>'color',
    p_item->>'interior_color',
    p_item->>'battery',
    (p_item->>'unit_price_usd')::numeric,
    (p_item->>'unit_price_lak')::numeric,
    COALESCE((p_item->>'discount_usd')::numeric, 0),
    COALESCE((p_item->>'discount_lak')::numeric, 0),
    p_item->>'pdi_status_initial',
    p_item->>'status_initial',
    p_item->>'inspector_name',
    p_item->>'event_campaign',
    p_item->>'event_start_date',
    p_item->>'event_end_date',
    p_item->>'event_location'
  );

  -- Record Stock Movement
  INSERT INTO public.stock_movements (
    vehicle_vin, movement_type, bill_id, recorded_by, notes
  ) VALUES (
    v_vin,
    p_movement_type,
    v_bill_id,
    (p_bill->>'recorded_by')::uuid,
    p_bill->>'notes'
  );

  -- Update Vehicle status if sold
  IF p_movement_type = 'stock_out' THEN
    UPDATE public.vehicles SET status = 'sold', updated_at = NOW()
    WHERE vin = v_vin;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_vehicle_bill(jsonb, jsonb, text) TO authenticated;
