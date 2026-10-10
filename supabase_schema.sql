-- =============================================================
-- AVATR AUTO SERVICE LAOS - SUPABASE DATABASE SCHEMA SETUP
-- LEGACY ONLY — DO NOT RUN.
-- This file describes the old schema and grants public anon access. It does
-- not match the live application database and is not a production bootstrap.
-- Kept only as a historical reference; use reviewed migrations for changes.
-- =============================================================

-- 1. Create Tables

-- Table: inventory (ລາຍການສະຕ໋ອກລົດ)
CREATE TABLE IF NOT EXISTS public.inventory (
  vin TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  trim TEXT,
  plate_number TEXT,
  color TEXT NOT NULL,
  interior_color TEXT,
  battery TEXT,
  price_usd NUMERIC NOT NULL,
  price_lak NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  stock_quantity INTEGER NOT NULL DEFAULT 1,
  pdi_status TEXT DEFAULT 'passed',
  pdi_inspector TEXT,
  arrival_date TEXT,
  destination_warehouse TEXT,
  import_doc_number TEXT,
  image TEXT,
  notes TEXT,
  event_campaign TEXT,
  event_start_date TEXT,
  event_end_date TEXT,
  event_location TEXT,
  reserved_for_customer JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: vehicle_models (ລຸ້ນລົດຍົນ)
CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  category TEXT,
  price_usd NUMERIC NOT NULL,
  price_lak NUMERIC NOT NULL,
  power TEXT,
  acceleration TEXT,
  range_cltc TEXT,
  battery TEXT,
  charging TEXT,
  colors JSONB,
  features JSONB,
  stock_count INTEGER DEFAULT 0,
  hero_image TEXT,
  gallery JSONB,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: bills (ບັນທຶກບິນ ແລະ ໃບຮັບ)
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  bill_type TEXT NOT NULL,
  bill_number TEXT NOT NULL,
  date TEXT NOT NULL,
  vin TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  plate_number TEXT,
  color TEXT NOT NULL,
  interior_color TEXT,
  battery TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_usd NUMERIC NOT NULL,
  unit_price_lak NUMERIC NOT NULL,
  discount_usd NUMERIC DEFAULT 0,
  discount_lak NUMERIC DEFAULT 0,
  net_total_usd NUMERIC NOT NULL,
  net_total_lak NUMERIC NOT NULL,
  amount_usd NUMERIC NOT NULL,
  amount_lak NUMERIC NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_id_card TEXT,
  customer_address TEXT,
  customer_province TEXT,
  payment_method TEXT,
  qr_used TEXT,
  bank_name TEXT,
  transfer_ref TEXT,
  finance_company TEXT,
  down_payment_percent NUMERIC,
  down_payment_usd NUMERIC,
  tenure_months INTEGER,
  monthly_payment_lak NUMERIC,
  free_gifts JSONB,
  warranty_terms TEXT,
  sales_rep TEXT,
  supplier_name TEXT,
  customs_doc_number TEXT,
  import_entry_port TEXT,
  destination_warehouse TEXT,
  inspector_name TEXT,
  pdi_status_initial TEXT,
  status_initial TEXT,
  event_campaign TEXT,
  event_start_date TEXT,
  event_end_date TEXT,
  event_location TEXT,
  recorded_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: dealership_config (ການຕັ້ງຄ່າສູນ, QR Code, ສະກຸນເງິນ, ແພັກເກດ)
CREATE TABLE IF NOT EXISTS public.dealership_config (
  id TEXT PRIMARY KEY DEFAULT 'main_settings',
  company_qr_image_url TEXT,
  currencies JSONB,
  campaign_categories JSONB,
  uploaded_by TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: users (ບັນຊີຜູ້ໃຊ້ລະບົບ)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'general_user',
  role_title_lo TEXT,
  department TEXT,
  avatar_initials TEXT,
  permissions JSONB,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  last_login TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Real-Time Replication on Tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_models;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dealership_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- 3. Row Level Security (RLS) Policies
-- Allow public anon read/write for seamless operation in client app
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealership_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access on inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on vehicle_models" ON public.vehicle_models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on bills" ON public.bills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on dealership_config" ON public.dealership_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 4. Storage Bucket for Company QR & Assets (avatr-assets)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatr-assets', 'avatr-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public asset reads" ON storage.objects FOR SELECT USING (bucket_id = 'avatr-assets');
CREATE POLICY "Allow public asset uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatr-assets');
CREATE POLICY "Allow public asset updates" ON storage.objects FOR UPDATE USING (bucket_id = 'avatr-assets');
CREATE POLICY "Allow public asset deletes" ON storage.objects FOR DELETE USING (bucket_id = 'avatr-assets');
