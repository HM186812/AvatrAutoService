-- ==============================================================================
-- AVATR AUTO SERVICE LAOS - SUPABASE PRODUCTION DATABASE SCHEMA & SECURITY SETUP
-- ==============================================================================
-- ລຸ້ນ: 2.0 (Security Hardened Edition - Zero Key Leak & Complete RLS Protection)
-- ສຳລັບ: Supabase Cloud PostgreSQL (SQL Editor -> New Query -> Run)
-- 
-- ຈຸດປະສົງດ້ານຄວາມປອດໄພ:
-- 1. ປ້ອງກັນຂໍ້ມູນຮົ່ວໄຫຼ (Data Leak Prevention) ດ້ວຍ Row-Level Security (RLS) ແບບເຂັ້ມງວດ
-- 2. ປ້ອງກັນການລັກປ່ຽນ BCEL QR Code ຂອງບໍລິສັດໂດຍອະນຸຍາດສະເພາະ Super Admin ເທົ່ານັ້ນ
-- 3. ປ້ອງກັນການລັກເບິ່ງ ຫຼື ລົບຂໍ້ມູນໃບບິນ ແລະ ຂໍ້ມູນສ່ວນຕົວຂອງລູກຄ້າ (Bills / Customer PII)
-- 4. ແຍກສິດບົດບາດຊັດເຈນ (RBAC): super_admin, admin, sales, technician
-- 5. Storage Bucket ປ້ອງກັນການອັບໂຫລດໄຟລ໌ຈາກບຸກຄົນພາຍນອກທີ່ບໍ່ໄດ້ຮັບອະນຸຍາດ
-- ==============================================================================

-- -------------------------------------------------------------
-- 1. ສ້າງຕາຕະລາງຖານຂໍ້ມູນ (TABLE DEFINITIONS)
-- -------------------------------------------------------------

-- 1.1 Table: vehicle_models (ລາຍການລຸ້ນລົດຍົນໃນໂຊຣູມ)
CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sub_title TEXT,
  tagline TEXT,
  category TEXT,
  price_starting_usd NUMERIC NOT NULL DEFAULT 0,
  price_starting_lak NUMERIC NOT NULL DEFAULT 0,
  acceleration TEXT,
  range_cltc TEXT,
  battery_capacity TEXT,
  battery_supplier TEXT,
  charging_speed TEXT,
  smart_driving TEXT,
  powertrain TEXT,
  colors JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  stock_count INTEGER DEFAULT 0,
  hero_image TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Table: inventory (ສະຕ໋ອກລົດຍົນ ແລະ ໝາຍເລກຕົວຖັງ VIN)
CREATE TABLE IF NOT EXISTS public.inventory (
  vin TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  trim TEXT,
  plate_number TEXT,
  color TEXT NOT NULL,
  color_hex TEXT DEFAULT '#0a0a0b',
  interior_color TEXT,
  battery TEXT,
  price_usd NUMERIC NOT NULL DEFAULT 0,
  price_lak NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready',
  stock_quantity INTEGER NOT NULL DEFAULT 1,
  pdi_status TEXT DEFAULT 'passed',
  pdi_inspector TEXT,
  pdi_notes TEXT,
  location TEXT DEFAULT 'ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ',
  image_url TEXT,
  image TEXT,
  reserved_for_customer TEXT,
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

-- 1.3 Table: bills (ໃບບິນ, ໃບຮັບລົດ, ຂໍ້ມູນການເງິນ ແລະ ຂໍ້ມູນລູກຄ້າ)
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  bill_number TEXT NOT NULL,
  bill_type TEXT NOT NULL DEFAULT 'sale',
  type TEXT NOT NULL DEFAULT 'sale',
  date TEXT NOT NULL,
  vin TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  plate_number TEXT,
  color TEXT NOT NULL,
  interior_color TEXT,
  battery TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_usd NUMERIC NOT NULL DEFAULT 0,
  unit_price_lak NUMERIC NOT NULL DEFAULT 0,
  discount_usd NUMERIC DEFAULT 0,
  discount_lak NUMERIC DEFAULT 0,
  net_total_usd NUMERIC NOT NULL DEFAULT 0,
  net_total_lak NUMERIC NOT NULL DEFAULT 0,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  amount_lak NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT,
  customer_phone TEXT,
  customer_id_card TEXT,
  customer_address TEXT,
  customer_province TEXT,
  payment_method TEXT DEFAULT 'transfer',
  qr_used TEXT DEFAULT 'official_qr',
  bank_name TEXT,
  transfer_ref TEXT,
  finance_company TEXT,
  down_payment_percent NUMERIC,
  down_payment_usd NUMERIC,
  tenure_months INTEGER,
  monthly_payment_lak NUMERIC,
  free_gifts JSONB DEFAULT '[]'::jsonb,
  warranty_terms TEXT,
  sales_rep TEXT,
  supplier_name TEXT,
  customs_doc_number TEXT,
  import_entry_port TEXT,
  destination_warehouse TEXT,
  inspector_name TEXT,
  pdi_status_initial TEXT,
  status_initial TEXT,
  recorded_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS lead_id TEXT;

-- 1.4 Table: dealership_config (ການຕັ້ງຄ່າສູນ, BCEL OnePay QR Code, ສະກຸນເງິນ, ແພັກເກດ)
CREATE TABLE IF NOT EXISTS public.dealership_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_qr_image_url TEXT,
  currencies JSONB DEFAULT '[{"code":"LAK","name":"Lao Kip","symbol":"₭","rate":1,"isBase":true},{"code":"USD","name":"US Dollar","symbol":"$","rate":0.000045,"isBase":false},{"code":"THB","name":"Thai Baht","symbol":"฿","rate":0.0016,"isBase":false},{"code":"CNY","name":"Chinese Yuan","symbol":"¥","rate":0.00033,"isBase":false}]'::jsonb,
  campaign_categories JSONB DEFAULT '["ງານ Motor Show 2026","ງານ Vientiane Motor Expo 2026","Mid-Year EV Special"]'::jsonb,
  color_options JSONB DEFAULT '[{"name":"Obsidian Black","hex":"#0a0a0b","previewClass":"bg-zinc-950 border border-zinc-700"},{"name":"Ceramic White","hex":"#f4f4f5","previewClass":"bg-zinc-100 border border-zinc-300"},{"name":"Liquid Titanium","hex":"#71717a","previewClass":"bg-zinc-500 border border-zinc-400"}]'::jsonb,
  account_name TEXT DEFAULT 'AVATR AUTO SERVICE LAOS CO., LTD',
  bank_name TEXT DEFAULT 'BANQUE POUR LE COMMERCE EXTERIEUR LAO (BCEL)',
  usd_account TEXT DEFAULT '010-12-00-01234567-001',
  lak_account TEXT DEFAULT '010-12-00-07654321-001',
  cny_account TEXT DEFAULT '010-12-00-09876543-001',
  thb_account TEXT DEFAULT '010-12-00-05432109-001',
  hotline TEXT DEFAULT '1800-AVATR / +856 21 456789',
  branch TEXT DEFAULT 'ສຳນັກງານໃຫຍ່ ຖະໜົນທ່າເດື່ອ ຫຼັກ 3, ນະຄອນຫຼວງວຽງຈັນ',
  uploaded_by TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 Table: users (ຂໍ້ມູນໂປຣໄຟລ໌ຜູ້ໃຊ້ລະບົບ & ສິດທິ Role)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'general_user',
  role_title_lo TEXT DEFAULT 'ຜູ້ໃຊ້ທົ່ວໄປ (General User)',
  department TEXT DEFAULT 'General Staff',
  avatar_initials TEXT DEFAULT 'US',
  avatar_url TEXT,
  permissions JSONB DEFAULT '{"canManageUsers":false,"canDeleteUsers":false,"canGrantRoles":false,"canEditInventory":false,"canUploadQR":false,"canAddModels":false,"canDeductPOS":false,"canViewFinancials":false}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  last_login TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- -------------------------------------------------------------
-- 2. REAL-TIME REPLICATION SETUP
-- -------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vehicle_models'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_models;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bills'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'dealership_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dealership_config;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END $$;

-- -------------------------------------------------------------
-- 3. HELPER FUNCTIONS FOR STRICT SECURITY & RBAC (SECURITY DEFINER)
-- -------------------------------------------------------------

-- 3.1 ດຶງສິດບົດບາດຂອງຜູ້ໃຊ້ປັດຈຸບັນ (Current User Role)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (SELECT role FROM public.users WHERE id = auth.uid()::text),
    'authenticated'
  );
$$;

-- 3.2 ກວດສອບວ່າແມ່ນ Super Admin ຫຼື ບໍ່
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (public.get_auth_role() = 'super_admin');
$$;

-- 3.3 ກວດສອບວ່າແມ່ນ Admin ຫຼື Super Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (public.get_auth_role() IN ('super_admin', 'admin', 'manager'));
$$;

-- 3.4 ກວດສອບວ່າແມ່ນ ພະນັກງານພາຍໃນ (Staff) ຫຼື ບໍ່
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (public.get_auth_role() IN ('super_admin', 'admin', 'manager', 'sales', 'technician'));
$$;

-- -------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES - DATA LEAK PROTECTION
-- -------------------------------------------------------------

-- ເປີດໃຊ້ RLS ໃນທຸກໆຕາຕະລາງ
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealership_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ລຶບ Policies ເກົ່າອອກເພື່ອຄວາມແນ່ນອນ
DROP POLICY IF EXISTS "Allow public all access on vehicle_models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Allow public all access on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public all access on bills" ON public.bills;
DROP POLICY IF EXISTS "Allow public all access on dealership_config" ON public.dealership_config;
DROP POLICY IF EXISTS "Allow public all access on users" ON public.users;

-- =============================================================
-- 4.1 ຕາຕະລາງ: vehicle_models (ລາຍການລຸ້ນລົດຍົນ)
-- =============================================================
-- SELECT: ອະນຸຍາດໃຫ້ທຸກຄົນອ່ານໄດ້ (ລວມທັງແຂກທີ່ມາເບິ່ງລົດໃນໂຊຣູມ)
CREATE POLICY "vehicle_models_select_policy" 
ON public.vehicle_models 
FOR SELECT 
USING (true);

-- INSERT / UPDATE: ສະເພາະ Admin / Super Admin ເທົ່ານັ້ນທີ່ເພີ່ມ ຫຼື ແກ້ໄຂລຸ້ນລົດໄດ້
CREATE POLICY "vehicle_models_insert_policy" 
ON public.vehicle_models 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "vehicle_models_update_policy" 
ON public.vehicle_models 
FOR UPDATE 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DELETE: ສະເພາະ Super Admin ເທົ່ານັ້ນທີ່ມີສິດລົບລຸ້ນລົດຍົນອອກຈາກລະບົບ
CREATE POLICY "vehicle_models_delete_policy" 
ON public.vehicle_models 
FOR DELETE 
TO authenticated
USING (public.is_super_admin());

-- =============================================================
-- 4.2 ຕາຕະລາງ: dealership_config (ການຕັ້ງຄ່າສູນ & BCEL QR Code ບໍລິສັດ)
-- ⚠️ ຈຸດສຳຄັນ: ປ້ອງກັນການລັກປ່ຽນ QR Code ບັນຊີທະນາຄານຢ່າງເດັດຂາດ!
-- =============================================================
-- SELECT: ອະນຸຍາດໃຫ້ອ່ານໄດ້ ເພື່ອສະແດງ QR ຮັບເງິນ ແລະ ອັດຕາແລກປ່ຽນ
CREATE POLICY "dealership_config_select_policy" 
ON public.dealership_config 
FOR SELECT 
USING (true);

-- INSERT / UPDATE: ສະເພາະ Super Admin ເທົ່ານັ້ນທີ່ມີສິດປ່ຽນ QR Code ຫຼື ບັນຊີທະນາຄານ
CREATE POLICY "dealership_config_insert_policy" 
ON public.dealership_config 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "dealership_config_update_policy" 
ON public.dealership_config 
FOR UPDATE 
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- DELETE: ຫ້າມລົບການຕັ້ງຄ່າຫຼັກເດັດຂາດ
-- (ບໍ່ມີ Policy DELETE = ບໍ່ມີໃຜລົບໄດ້)

-- =============================================================
-- 4.3 ຕາຕະລາງ: inventory (ສະຕ໋ອກລົດຍົນ)
-- =============================================================
-- SELECT: ອະນຸຍາດໃຫ້ພະນັກງານທີ່ເຂົ້າສູ່ລະບົບແລ້ວ ຫຼື ລູກຄ້າເບິ່ງລົດສະຖານະ ready
CREATE POLICY "inventory_select_policy" 
ON public.inventory 
FOR SELECT 
USING (
  auth.role() = 'authenticated' OR status = 'ready'
);

-- INSERT: ສະເພາະ Admin / Super Admin (ຮັບລົດເຂົ້າ Stock-In)
CREATE POLICY "inventory_insert_policy" 
ON public.inventory 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin());

-- UPDATE: Admin, Super Admin, ຫຼື Sales ຕັດສະຕ໋ອກ / ຈອງລົດ
CREATE POLICY "inventory_update_policy" 
ON public.inventory 
FOR UPDATE 
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- DELETE: ສະເພາະ Super Admin ເທົ່ານັ້ນທີ່ມີສິດລົບລົດອອກຈາກສະຕ໋ອກຢ່າງຖາວອນ
CREATE POLICY "inventory_delete_policy" 
ON public.inventory 
FOR DELETE 
TO authenticated
USING (public.is_super_admin());

-- =============================================================
-- 4.4 ຕາຕະລາງ: bills (ໃບບິນ, ໃບຮັບ, ຂໍ້ມູນການເງິນ & ຂໍ້ມູນລູກຄ້າ)
-- ⚠️ ຈຸດສຳຄັນ: ປ້ອງກັນຂໍ້ມູນສ່ວນຕົວລູກຄ້າ ແລະ ລາຍຮັບຮົ່ວໄຫຼ (Zero PII Leak)
-- =============================================================
-- SELECT: ຫ້າມ Public ອ່ານເດັດຂາດ! ສະເພາະພະນັກງານພາຍໃນທີ່ Authenticated ເທົ່ານັ້ນ
CREATE POLICY "bills_select_policy" 
ON public.bills 
FOR SELECT 
TO authenticated
USING (public.is_staff());

-- INSERT: ພະນັກງານຂາຍ ຫຼື Admin ເປັນຜູ້ອອກໃບບິນ / ໃບຮັບລົດ
CREATE POLICY "bills_insert_policy" 
ON public.bills 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_staff());

-- UPDATE: ສະເພາະ Admin / Super Admin ແກ້ໄຂຂໍ້ມູນໃບບິນ
CREATE POLICY "bills_update_policy" 
ON public.bills 
FOR UPDATE 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DELETE: ສະເພາະ Super Admin ເທົ່ານັ້ນທີ່ມີສິດລົບບິນອອກຈາກລະບົບ (Sales ຫ້າມລົບ)
CREATE POLICY "bills_delete_policy" 
ON public.bills 
FOR DELETE 
TO authenticated
USING (public.is_super_admin());

-- =============================================================
-- 4.5 ຕາຕະລາງ: users (ຂໍ້ມູນຜູ້ໃຊ້ ແລະ ສິດບົດບາດ)
-- =============================================================
-- SELECT: ຜູ້ໃຊ້ສາມາດເບິ່ງໂປຣໄຟລ໌ຕົວເອງໄດ້, Admin ເບິ່ງໄດ້ທັງໝົດ
CREATE POLICY "users_select_policy" 
ON public.users 
FOR SELECT 
TO authenticated
USING (
  id = auth.uid()::text OR public.is_admin()
);

-- INSERT: ອະນຸຍາດໃຫ້ຜູ້ໃຊ້ໃໝ່ສ້າງໂປຣໄຟລ໌ຕົວເອງຕອນ Register
CREATE POLICY "users_insert_policy" 
ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (
  id = auth.uid()::text OR public.is_super_admin()
);

-- UPDATE: ຜູ້ໃຊ້ແກ້ໄຂຊື່ ແລະ ເບີໂທຕົວເອງໄດ້, ແຕ່ຫ້າມຍົກລະດັບ Role ຕົວເອງ (ຕ້ອງແມ່ນ Super Admin ເທົ່ານັ້ນ)
CREATE POLICY "users_update_policy" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (
  id = auth.uid()::text OR public.is_super_admin()
)
WITH CHECK (
  -- ຖ້າບໍ່ແມ່ນ Super Admin ຈະບໍ່ສາມາດປ່ຽນ role ເປັນ super_admin ຫຼື admin ໄດ້
  CASE 
    WHEN public.is_super_admin() THEN true
    ELSE id = auth.uid()::text AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid()::text)
  END
);

-- DELETE: ສະເພາະ Super Admin ເທົ່ານັ້ນທີ່ມີສິດລົບຜູ້ໃຊ້
CREATE POLICY "users_delete_policy" 
ON public.users 
FOR DELETE 
TO authenticated
USING (public.is_super_admin());

-- -------------------------------------------------------------
-- 5. STORAGE BUCKET SECURITY (avatr-assets)
-- -------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatr-assets', 'avatr-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ລຶບ Policies ເກົ່າຂອງ Storage
DROP POLICY IF EXISTS "Allow public asset reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public asset uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public asset updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public asset deletes" ON storage.objects;
DROP POLICY IF EXISTS "avatr_assets_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatr_assets_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatr_assets_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatr_assets_delete_policy" ON storage.objects;

-- SELECT: ອະນຸຍາດໃຫ້ອ່ານ/ດາວໂຫລດຮູບພາບ QR Code ແລະ ຮູບລົດໄດ້ແບບສາທາລະນະ (CDN)
CREATE POLICY "avatr_assets_read_policy" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatr-assets');

-- INSERT: ສະເພາະ Super Admin ຫຼື Admin ທີ່ເຂົ້າສູ່ລະບົບແລ້ວເທົ່ານັ້ນທີ່ອັບໂຫລດຮູບໄດ້
CREATE POLICY "avatr_assets_upload_policy" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatr-assets' AND public.is_admin()
);

-- UPDATE: ສະເພາະ Super Admin / Admin
CREATE POLICY "avatr_assets_update_policy" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'avatr-assets' AND public.is_admin()
);

-- DELETE: ສະເພາະ Super Admin ເທົ່ານັ້ນທີ່ມີສິດລົບຮູບພາບ/QR Code ຂອງບໍລິສັດ
CREATE POLICY "avatr_assets_delete_policy" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'avatr-assets' AND public.is_super_admin()
);

-- -------------------------------------------------------------
-- 6. DEFAULT SEED DATA (INITIALIZATION)
-- -------------------------------------------------------------
INSERT INTO public.dealership_config (id, uploaded_by, updated_by)
VALUES ('default', 'system', 'System Init')
ON CONFLICT (id) DO NOTHING;

-- ສຳເລັດການຕິດຕັ້ງ Schema ແລະ ລະບົບປ້ອງກັນຄວາມປອດໄພຂອງ Supabase 100%
