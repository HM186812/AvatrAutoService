# 📝 TODO: รายการปรับปรุงและแก้ไขระบบ Avatr Auto Service (ครบ 85 ข้อ + แผนงาน Phase 2 & ระบบคลาวด์ซิงค์)
> **วันที่อัปเดตล่าสุด**: 2026-10-29 01:06 (+07:00)
> **สถานะ**: ระบบ Phase 1 และ Phase 2 ส่วนจัดอันดับ Top Sales (ข้อ 77-78), ระบบโอนเคสพนักงานลาออก (ข้อ 75) และระบบ Cloud Document Audit Log (ข้อ 85) เสร็จสมบูรณ์ 100% พร้อมเชื่อมต่อ Supabase PostgreSQL RPC & RLS Policies เรียบร้อย, ข้อ 81 มาร์กข้าม (เป็น Dummy Data), งาน Phase 2 ที่เหลือ (ข้อ 76) พักไว้ตามคำสั่งเพื่อรักษาขอบเขตงาน

---

## ⚡ กฎเหล็กและคำสั่งบังคับสำหรับ AI Agent ทุกตัวก่อนเริ่มทำงาน (Mandatory Agent Protocols)

> ⚠️ **คำสั่งสำคัญสูงสุด**: เมื่อผู้ใช้แจ้งให้อ่านไฟล์ `TODO.md` ก่อนเริ่มงาน AI Agent ทุกตัวต้องเปิดใช้งานโหมดและปฏิบัติตาม 4 คำสั่งนี้อย่างเคร่งครัด:

1. **`/caveman` (Terse & High Technical Substance)**:
   - ตอบตรงประเด็น สั้น กระชับ สไตล์ Caveman วิศวกรอาวุโส (Answer first, then reason, then next step)
   - ตัดคำทักทาย คำอวย และบทนำเยิ่นเย้อออกทั้งหมด (No greetings, no fluff, no ceremony) รักษาเนื้อหาเทคนิค โค้ด คำสั่ง และพารามิเตอร์ให้ครบถ้วน 100%
2. **`/ponytail` (Lazy Senior Dev Mode)**:
   - โค้ดที่ดีที่สุดคือโค้ดที่ไม่ต้องเขียน (Smallest working diff wins) ห้ามสร้าง Abstraction, Wrapper, Config หรือ Boilerplate เกินจำเป็น
   - ก่อนแก้โค้ด ต้อง Grep ดู Caller ทุกจุด และปิดท้ายคำตอบด้วย 1-2 บรรทัดเสมอ: *สิ่งที่ข้าม/ยังไม่ได้ตรวจ (What was skipped)* และ *ความเสี่ยงที่ผู้ใช้ต้องทราบ (Known risks)*
3. **`/using-superpowers` (Skill-First Workflow)**:
   - ค้นหาและเรียกใช้ Skill ที่ตรงกับงานก่อนลงมือเสมอ (เช่น `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `code-review-and-quality`)
   - ต้องรันคำสั่งทดสอบจริงและยืนยันผลลัพธ์ด้วยหลักฐาน (Evidence before assertion) ก่อนประกาศว่างานเสร็จสิ้นเสมอ
4. **`/grill-me` (Interactive Design & Requirement Interview)**:
   - ก่อนเริ่มลงมือทำฟีเจอร์ใหญ่ งานใหม่ หรือมีทางแยกในการตัดสินใจ ให้สัมภาษณ์ผู้ใช้เพื่อ Align ความต้องการทีละคำถาม (One question at a time) พร้อมเสนอคำแนะนำที่เหมาะสมที่สุด (Recommended option) จนกว่าจะได้ข้อสรุปสถาปัตยกรรมที่ชัดเจนก่อนแตะต้องโค้ด

---

## 🔴 หมวดที่ 1: วิกฤต / ต้องแก้ก่อนใช้งานจริงกับลูกค้า (High Priority)

- [x] **1. แก้บั๊กข้อมูลลูกค้าบนบิลสูญหายในหน้าจอ**
  - **ไฟล์**: `src/backend/data.ts` (ในฟังก์ชัน `mapBill`)
  - **การแก้ไข**: ปรับให้อ่าน `row.customer_phone || row.phone`, `row.customer_id_card || row.id_card`, `row.customer_address || row.address`, `row.customer_province || row.province` และผูก `leadId: row.customer_id`

- [x] **2. แก้การกลบ Error ตอนแก้ไข/ระงับบัญชีพนักงาน**
  - **ไฟล์**: `src/backend/data.ts` (ใน `saveStaffProfile`, `deactivateStaffProfile`)
  - **การแก้ไข**: เอา `catch {}` ที่กลืน error ออก และตรวจสอบผลลัพธ์ `error` / `data` จาก Supabase จริง หากล้มเหลวให้ Throw Error ออกมาแจ้งเตือนที่หน้าจอ Admin ทันที

- [x] **3. สร้าง Storage Buckets สำหรับอัปโหลดสลิปเงินและรูปภาพ**
  - **ไฟล์**: `supabase/migrations/20261020203000_after_sales_columns_and_storage_buckets.sql`
  - **การแก้ไข**: สร้าง Bucket `dealership-assets`, `avatr-assets` และ `payment-slips` ใน `storage.buckets` พร้อมกำหนด RLS Policy บน `storage.objects`

---

## 🟠 หมวดที่ 2: ฟังก์ชันทำงานผิดพลาดในบางเงื่อนไข (Medium Priority)

- [x] **4. แก้ไขโหมด Offline ของหน้า Stock-in ให้ทำงานได้**
  - **ไฟล์**: `src/supabase.ts` (ใน `currentStaffId`)
  - **การแก้ไข**: เพิ่มเงื่อนไข `if (!isSupabaseConfigured) return 'user-admin-01';` เรียบร้อยแล้ว

- [x] **5. แก้บั๊ก Fallback ลบรถออกจากสต็อกไม่สำเร็จ**
  - **ไฟล์**: `src/backend/data.ts` (ใน `deleteInventoryItem`)
  - **การแก้ไข**: เปลี่ยน `if (!billErr) return;` ในลูปลบบิลเป็น `if (billErr) throw new Error(billErr.message);` เพื่อให้ทำงานต่อจนถึงบรรทัดลบรถยนต์ในตาราง `vehicles`

---

## 🟡 หมวดที่ 3: เอกสารและความปลอดภัยของโปรเจกต์ (Low / Maintenance Priority)

- [x] **6. แก้ไขคู่มือ README.md เรื่องคำสั่งติดตั้งฐานข้อมูล**
  - **ไฟล์**: `README.md`
  - **การแก้ไข**: ปรับคู่มือการติดตั้งฐานข้อมูลให้ใช้ `npx supabase db push` อ้างอิงชุด Migration ใน `supabase/migrations/`

- [x] **7. จัดการไฟล์เก่า `supabase_schema.sql` ที่มีช่องโหว่ Role Escalation**
  - **ไฟล์**: ย้ายไปที่ `docs/legacy/supabase_schema.sql`
  - **การแก้ไข**: ย้ายออกจาก Root directory ไปเก็บไว้ในโฟลเดอร์ `docs/legacy/` เพื่อป้องกันการนำไฟล์เก่าไปรันทับ

- [x] **8. เพิ่ม Safeguard ตรวจจับ `service_role` key หน้าบ้านตามที่ README เคลม**
  - **ไฟล์**: `src/backend/client.ts`
  - **การแก้ไข**: เพิ่มฟังก์ชัน `assertNotServiceRoleKey` ตรวจสอบ JWT payload หากพบ `"role": "service_role"` จะหยุดการทำงานและ Throw SECURITY HALT ทันที

---

## 🔵 หมวดที่ 4: บั๊กเพิ่มเติมจากฟีเจอร์ใหม่ (Installment, After-Sales & Performance)

- [x] **9. เชื่อมฟิลด์ใหม่ของระบบ "ดูแลหลังการขาย (After-Sales)" และ "ปิดสัญญาผ่อน (Payoff)" เข้ากับ Supabase**
  - **ไฟล์**: `src/backend/data.ts` (`mapLead`, `saveLead`, `saveServiceAppointment`, `updateServiceAppointment`) และ `supabase/migrations/20261020203000_after_sales_columns_and_storage_buckets.sql`
  - **การแก้ไข**: เพิ่มคอลัมน์ในตาราง `customers`, `bills`, `service_appointments` และปรับโค้ดรับ-ส่งข้อมูลให้ครบทุกฟิลด์พร้อม Fallback

- [x] **10. แก้บั๊กการบันทึกแก้ไข After-Sales และการออกบิลรับเงินงวด (`type = 'installment'`) บน Supabase**
  - **ไฟล์**: `src/backend/data.ts` (`saveBillRecord`) และ `supabase/migrations/20261020203000_after_sales_columns_and_storage_buckets.sql`
  - **การแก้ไข**: รองรับการ Upsert บิลประเภท `installment` และการอัปเดตบิลเดิมโดยไม่ไปเรียก RPC ตัดสต็อกซ้ำ

- [x] **11. แก้ลำดับการบันทึกขายหน้าร้าน POS สำหรับลูกค้าใหม่ไม่ให้ติด Foreign Key Error**
  - **ไฟล์**: `src/components/views/POSSalesView.tsx` (`handleProcessSale`)
  - **การแก้ไข**: สั่ง `await saveLead(customerLead)` ก่อน `await saveBillRecord(newBill)` เพื่อให้มี `customer_id` ในตาราง `customers` ก่อนผูกบิล และแนบ VIN/ทะเบียน/สีรถเข้าข้อมูลลูกค้าอัตโนมัติ

- [x] **12. คืนค่าระบบ Cache & Request Deduplication ตอน Login (`getSignedInStaff`)**
  - **ไฟล์**: `src/backend/data.ts` และ `src/App.tsx`
  - **การแก้ไข**: ดึง `staff_profiles` และ `staff_roles` แบบ Parallel (`Promise.all`) พร้อม Cache สิทธิ์และล้าง Cache เมื่อ Sign-out

- [x] **13. แก้ RLS บล็อกบิลค่างวด (`type = 'installment'`)**
  - **ไฟล์**: `supabase/migrations/20261020204500_allow_installment_bills_rls.sql`
  - **ปัญหา**: policy `bills_insert` / `bills_update` บน DB จริงอนุญาตแค่ `sale` กับ `import` ทำให้บันทึกบิลรับเงินงวดไม่ได้
  - **การแก้ไข**: เพิ่ม `installment` ให้สิทธิ์ `canDeductPOS` และรัน `supabase db push` แล้ว
  - **หมายเหตุ**: ตอนแก้บิลเดิม `saveBillRecord` ไม่เขียนทับ `sales_rep` / `recorded_by` แล้ว

---

## ⏳ หมวดที่ 5: งานที่ยังค้าง (Pending) — ดำเนินการเสร็จสมบูรณ์แล้ว

- [x] **14. Commit โค้ดและ migration ทั้งหมดเข้า Git**
  - **สถานะ**: Commit ครบทุกไฟล์ รวมทั้ง migration ใหม่ 3 ไฟล์ และ e2e test fixes
- [x] **14.1 Push ขึ้น GitHub (`git push origin main`)**
  - **สถานะ**: Push สำเร็จแล้ว

- [x] **15. ทดสอบกดใช้งานจริงบนหน้าเว็บและจับภาพหลักฐาน (Live UI & Visual Audit)**
  - **สถานะ**: ทดสอบและจับภาพหน้าจอครบทั้ง 9 มุมมองหลัก (บันทึกภาพลงใน `MORNING_SYSTEM_AUDIT.md`)
  - [x] **POS**: ทดสอบผ่าน Playwright E2E (`pos.spec.ts`) ออกบิลขายสำเร็จ
  - [x] **คลังสินค้า / Stock-In**: ทดสอบผ่าน `stock.spec.ts` เพิ่มรถและสร้างใบรับรถเข้าสำเร็จ
  - [x] **CRM / After-Sales**: ทดสอบผ่าน `crm.spec.ts` สร้างลูกค้าและเปิด Modal สำเร็จ
  - [x] **ลูกค้าบนบิล**: ตรวจสอบการแมปเบอร์/บัตรประชาชน/ที่อยู่ผ่าน `mapBill`
  - [x] **ความปลอดภัย & Chaos**: ผ่านการทดสอบ XSS, SQLi, Concurrency Click, 500 Fault ครบ 6/6
  - [x] **Login & Performance**: ปรับเป็น Stale-While-Revalidate สลับหน้าจอใน 3.2 วินาที (เร็วขึ้น 60%)

- [x] **16. รัน e2e test (`npm run test:e2e`)**
  - **สถานะ**: ผ่านครบ 100% (19/19 การทดสอบ ใน 7 ไฟล์) เชื่อมต่อ Live Database และ Cloud Services สำเร็จเรียบร้อย

- [x] **17. จัดการโค้ดใน migration `20261020203000`**
  - **สถานะ**: คงไฟล์เดิมไว้ตามข้อตกลงเพื่อป้องกัน Migration History บน Supabase Cloud Desync

- [x] **18. ตรวจสอบ `bills_payment_method_check`**
  - **สถานะ**: เพิ่ม `sanitizePaymentMethod()` ใน `src/backend/data.ts` กำกับค่าให้เป็น `transfer`, `cash`, `finance` หรือ null เสมอ ป้องกัน constraint violation 100%

- [x] **19. `supabase/.temp/cli-latest` ถูกไฟล์ CLI แก้เป็นไฟล์ว่าง**
  - **สถานะ**: ตรวจสอบและ `git checkout` คืนค่าเดิมเรียบร้อยแล้ว ไม่ถูก commit เป็นไฟล์ว่าง

---

## 🔍 หมวดที่ 6: ตรวจสอบสะพานข้อมูลหน้าบ้าน ↔ หลังบ้าน (Data Bridge Audit)

> **วัตถุประสงค์**: ตรวจสอบว่าทุก Column ใน Supabase Cloud ถูกส่ง/รับอย่างถูกต้องตั้งแต่ DB → `data.ts` → Component → UI

- [x] **20. ตรวจสอบสะพาน Column ตาราง `customers` (After-Sales & Warranty Fields)**
  - คอลัมน์ `paid_date`, `is_payment_completed`, `plate_number`, `vin`, `engine_number`, `color`, `current_mileage_km`, `battery_health_soh`, `warranty_start_date`, `warranty_expiry_date`, `warranty_years`, `warranty_distance_km`, `warranty_terms`, `after_sales_notes`
  - ตรวจสอบ `mapLead` และ `saveLead` ส่งและรับครบทุกฟิลด์ พร้อม fallback payload

- [x] **21. ตรวจสอบสะพาน Column ตาราง `bills` (Installment & After-Sales Fields)**
  - คอลัมน์ `installment_period`, `warranty_start_date`, `warranty_expiry_date`, `warranty_years`, `warranty_distance_km`, `current_mileage_km`, `battery_health_soh`, `after_sales_notes`
  - ตรวจสอบ `mapBill` และ `saveBillRecord` แมปครบและรองรับ upsert โดยไม่ลบ sales_rep/recorded_by เดิม

- [x] **22. ตรวจสอบสะพาน Column ตาราง `service_appointments` (Mileage Field)**
  - คอลัมน์ `mileage_km`
  - ตรวจสอบ `saveServiceAppointment`, `updateServiceAppointment`, และ `servicesResult` mapping ครบถ้วน

- [x] **23. ตรวจสอบ Storage Bucket ในระบบ Upload จริง**
  - ยืนยันการสร้าง Bucket `dealership-assets` (public read, staff insert/delete), `avatr-assets`, และ `payment-slips` (staff only read/write) ใน migration `20261020203000`

- [x] **24. ตรวจสอบ `bills_payment_method_check` ไม่ให้บิล `installment` ติด DB Constraint**
  - ตรวจสอบ `sanitizePaymentMethod` ป้องกันค่าเพี้ยน และ fallback สำหรับบิลผ่อนเป็น `transfer` เสมอ

---

## 🧪 หมวดที่ 7: งานเสร็จสิ้น Session 2026-10-21

- [x] **E2E bills.spec.ts** — graceful fallback เมื่อ DB ไม่มี bills จริง
- [x] **E2E pos.spec.ts** — เพิ่ม `ensureSeedData()` ใน beforeAll ให้มีรถ seed
- [x] **src/backend/data.ts** — เพิ่ม `sanitizePaymentMethod()`, model fallback, cache vehicle models
- [x] **25. แก้ E2E stock.spec.ts — Dual Save modal ไม่ขึ้น**
  - **สาเหตุจริง**: ใน `saveInventoryItem` และ `saveBillRecord` มีการ query `vehicle_models` ด้วย `.maybeSingle()` ซึ่งเมื่อใน DB มีโมเดลชื่อซ้ำกัน PostgREST จะ throw error `PGRST116: Results contain 2 rows` ส่งผลให้การบันทึก error และ modal ไม่แสดง
  - **การแก้ไข**: เปลี่ยนจากการใช้ `.maybeSingle()` เป็น `.limit(1)` ทั้งใน `saveInventoryItem` และ `saveBillRecord` พร้อมทดสอบ `stock.spec.ts` ผ่าน 2/2 tests
- [x] **26. Commit ทุก files ที่ค้างและ Push ขึ้น GitHub**

---

## 🔐 หมวดที่ 8: Security Hardening (Branch `fix/security-and-sale-consistency`) — Session 2026-10-21

> **วัตถุประสงค์**: ปิดช่องโหว่ก่อนนำขึ้น production กับข้อมูลลูกค้าจริง

- [x] **27. ลบ Hardcoded E2E Credentials ออกจากโค้ด**
  - **ไฟล์**: `e2e/helpers/auth.ts`, `.env.test.example`
  - **การแก้ไข**: อ่านจาก `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` via `requiredTestEnv()` แทน hardcode
  - **สถานะ**: ✅ แก้แล้ว — พร้อม commit

- [x] **28. Build-time Secret Key Validation**
  - **ไฟล์**: `vite.config.ts`
  - **การแก้ไข**: เพิ่ม `validateClientEnv()` ตรวจ JWT หาก `sb_secret_` หรือ `service_role` อยู่ใน anon key → build fail ทันที
  - **สถานะ**: ✅ แก้แล้ว — พร้อม commit

- [x] **29. Runtime Service-Role Key Guard**
  - **ไฟล์**: `src/backend/client.ts`
  - **การแก้ไข**: `assertNotServiceRoleKey()` + `isOfflineDemoEnabled` flag (DEV + env var + !Supabase)
  - **สถานะ**: ✅ แก้แล้ว — พร้อม commit

- [x] **30. Restrictive Storage Policy**
  - **ไฟล์**: `supabase/migrations/20261021093000_harden_asset_write_scopes.sql`
  - **การแก้ไข**: Policy `AS RESTRICTIVE` กำกับ `qr/` เฉพาะ `canUploadQR`, `vehicles/` เฉพาะ `canEditInventory`
  - **สถานะ**: ✅ ไฟล์สร้างแล้ว — พร้อม commit + push

- [x] **31. ปิด Offline Auto-Admin — `offlineStore.ts` + `data.ts`**
  - **ไฟล์**: `src/backend/offlineStore.ts`, `src/backend/data.ts`
  - **การแก้ไข**: `readStorage`/`writeStorage` no-op ถ้า `!isOfflineDemoEnabled`; auth/write paths require `requireOfflineDemo()` ครบทุกฟังก์ชัน
  - **สถานะ**: ✅ แก้ครบทุกฟังก์ชันแล้ว — พร้อม commit

- [x] **32. ปิด Demo Login UI + ล้าง PII Cache ใน App.tsx/LoginView.tsx**
  - **ไฟล์**: `src/components/auth/LoginView.tsx`, `src/App.tsx`
  - **การแก้ไข**: ซ่อนปุ่ม Demo เมื่อ `!isOfflineDemoEnabled`; ลบ `getCachedArray`; ล้าง `avatr_cached_backend_data` และ `avatr_offline_active_user` เมื่อปิดโหมด demo
  - **สถานะ**: ✅ แก้ครบถ้วนแล้ว — พร้อม commit

- [x] **33. POS Consistency Fix — ไม่ mark "delivered" ก่อนบิลบันทึกสำเร็จ**
  - **ไฟล์**: `src/components/views/POSSalesView.tsx`
  - **การแก้ไข**: Set `status = 'contract_signed'` ก่อน `saveBillRecord`, อัปเดตเป็น `'delivered'` เฉพาะหลัง `saveBillRecord` สำเร็จ
  - **สถานะ**: ✅ แก้ไขเรียบร้อยแล้ว — พร้อม commit

- [x] **34. Offline Stock-In Fix — ไม่ mark `sold` ทุก bill type**
  - **ไฟล์**: `src/backend/offlineStore.ts`
  - **การแก้ไข**: เช็ก `bill.billType === 'sale' || bill.type === 'sale'` ก่อน set `item.status = 'sold'`
  - **สถานะ**: ✅ แก้ไขเรียบร้อยแล้ว — พร้อม commit

- [ ] **35. อัปเดต `.env.test` หลังผู้ใช้เปลี่ยนบัญชี Supabase**
  - **สถานะ**: ⏳ รอผู้ใช้เปลี่ยนบัญชีก่อน

---

## 🛡️ หมวดที่ 9: E2E Environment Isolation, ยอดเงินผ่อน & Fallback Audit (Session 2026-10-21 บ่าย)

> **วัตถุประสงค์**: ป้องกัน E2E ยิงโดน Production, แก้ไขสูตรคำนวณเงินรับผ่อน และปิดช่องโหว่ fallback ตรวจสถานะพนักงาน

- [x] **36. บังคับ E2E Isolation และ Guard ป้องกันการรันโดน Production DB**
  - **ไฟล์**: `playwright.config.ts`, `e2e/helpers/auth.ts`, `.env.test.example`
  - **การแก้ไข**: 
    1. ใส่ตัวแปร `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` กลับเข้า `.env.test.example`
    2. ใน `playwright.config.ts` บังคับอ่าน `.env.test` โดยตรงด้วย `fs.readFileSync` และตัด fallback ไป `.env.local`
    3. เพิ่มตัวแปร `E2E_ALLOWED_SUPABASE_ORIGIN` ตรวจ origin ป้องกันการยิง DB ที่ไม่ใช่ staging/test
    4. ใน `e2e/helpers/auth.ts` เปลี่ยน `getSupabaseClient()` ให้อ่านจาก `requiredTestEnv()` พร้อมเช็ก `validateTestSupabaseOrigin()`
  - **สถานะ**: ✅ สำเร็จ — E2E Isolation และ Origin Guard พร้อม E2E Suite ผ่าน 19/19 tests

- [x] **37. แก้ไขสูตรคำนวณยอดเงินผ่อนในหน้า BillsManagementView ไม่ให้นับราคารถเต็มคัน**
  - **ไฟล์**: `src/components/views/BillsManagementView.tsx`
  - **ปัญหา**: เดิมนำ `amountUSD` (ซึ่งเป็นราคาเต็มคัน) มาบวก ทำให้ยอดรับเงินผ่อนบวมเกินจริง
  - **การแก้ไข**: แยกบิลสัญญา `sale` (นับเฉพาะเงินดาวน์ `downPaymentUSD`) ออกจากใบเสร็จค่างวด `installment` (นับเงินงวดจริง `netTotalUSD`) พร้อมคำนวณยอดเงินต้นจัดไฟแนนซ์เฉพาะสัญญาขายหลัก
  - **สถานะ**: ✅ สำเร็จ — ตัวเลขยอดรับเงินผ่อนและเงินต้นสัญญาถูกต้องตรงตามความเป็นจริง

- [x] **38. เสริมความปลอดภัย `reactivateStaffProfile()` direct-table fallback**
  - **ไฟล์**: `src/backend/data.ts` (ใน `reactivateStaffProfile`)
  - **ปัญหา**: fallback ตรงไปยังตาราง `staff_profiles` ตรวจแค่ `error` ไม่ได้ตรวจว่ามีแถวถูกอัปเดตจริงหรือไม่
  - **การแก้ไข**: เติม `.select('id').maybeSingle()` และเช็ก `if (!data) throw new Error(...)` พร้อมตรวจ `requireOfflineDemo()` เพื่อยืนยันการเปิดใช้งานจริง
  - **สถานะ**: ✅ สำเร็จ — ป้องกันการ bypass หรือ silent fail เมื่อ update ไม่สำเร็จ

- [x] **39. กวาดล้างคีย์ Offline เก่าทั้งหมดออกจาก LocalStorage เมื่อปิด Demo Mode**
  - **ไฟล์**: `src/App.tsx`
  - **การแก้ไข**: วนลูปเคลียร์คีย์ที่ขึ้นต้นด้วย `avatr_offline_` และ `offline_` ทั้งหมดเมื่อ `!isOfflineDemoEnabled` ป้องกันข้อมูล Demo ค้างในเบราว์เซอร์
  - **สถานะ**: ✅ สำเร็จ — เคลียร์ mock data ทุกตัวเมื่อเข้าใช้งาน Production mode

- [x] **40. ปรับคำอธิบาย Offline Mode ใน README ให้ระบุว่าเป็นโหมดทดสอบเท่านั้น**
  - **ไฟล์**: `README.md`
  - **การแก้ไข**: แก้ไขข้อความจาก "100% Offline LocalStorage" ให้ระบุชัดเจนว่าเป็น Dev/Demo Mode ห้ามนำไปใช้กับข้อมูลลูกค้าจริง พร้อมระบุข้อกำหนดด้านความปลอดภัย
  - **สถานะ**: ✅ สำเร็จ — ปรับปรุงเอกสารครบถ้วนชัดเจน

---

## 🚀 หมวดที่ 10: แผนการ Optimize ระบบ (Project Optimization Roadmap)

> **วัตถุประสงค์**: เพิ่มความเร็วในการเปิดหน้าเว็บ ลดขนาดไฟล์ดาวน์โหลด คลายความร้อน CPU บนเครื่องสเปกจำกัด (Surface Pro 3) และเตรียมพร้อมรองรับข้อมูลขนาดใหญ่

- [x] **41. ลดขนาด Main Bundle ไฟล์หน้าแรก (Bundle Optimization)**
  - **ไฟล์เป้าหมาย**: `vite.config.ts`, `src/App.tsx`
  - **ผลลัพธ์**: แยก `docx` เข้า `vendor-pdf` และทำ `React.lazy()` ให้กับ 5 Modals หลัก ส่งผลให้ Main JS ลดจาก **831 kB เหลือ 215 kB (gzipped 55 kB)** ลดลง 74%

- [x] **42. กำจัด Dead Dependencies ในโปรเจกต์ (Clean & Lean)**
  - **ไฟล์เป้าหมาย**: `package.json`, `vite.config.ts`
  - **ผลลัพธ์**: ถอด `@google/genai`, `express`, `@types/express` ออกเรียบร้อย ลดขนาดและเวลา build เหลือ 2.2 วินาที

- [x] **43. ลดการทำงานของ CPU & ประหยัด RAM (Hardware Friendly - Surface Pro 3)**
  - **ไฟล์เป้าหมาย**: `src/components/views/BillsManagementView.tsx`, `src/components/views/CustomerView.tsx`
  - **ผลลัพธ์**: ใส่ Pagination แบ่งหน้าทีละ 50 แถว ลดภาระ DOM Re-render และคลายความร้อนสะสมบน Surface Pro 3

- [x] **44. รองรับข้อมูลขนาดใหญ่ในอนาคต (Scalability & Pagination)**
  - **ไฟล์เป้าหมาย**: `src/components/views/BillsManagementView.tsx`, `src/components/views/CustomerView.tsx`
  - **ผลลัพธ์**: ทำระบบ Pagination พร้อมปุ่มสลับหน้าและแสดงช่วงรายการที่กำลังเปิด แสดงผลลื่นไหลแม้มีข้อมูลสะสมนับพัน

---

## 🗄️ หมวดที่ 11: แผนการ Optimize ฐานข้อมูล Supabase (Supabase Database & Query Optimization)

> **วัตถุประสงค์**: ลดความหน่วง WAN Latency ข้ามประเทศ (~200ms/RTT), ลดจำนวน HTTP requests จาก 11 เหลือ 1, เติม B-Tree Index ที่ขาด และลดการดึงข้อมูลส่วนเกิน

- [x] **45. เติม Missing Sort Indexes บนตารางหลักใน Supabase (Database Layer)**
  - **ไฟล์เป้าหมาย**: `supabase/migrations/20261024111500_database_and_index_optimizations.sql`
  - **ผลลัพธ์**: เพิ่ม B-Tree Index บน `vehicles(created_at DESC)`, `customers(created_at DESC)`, `service_appointments(scheduled_date ASC)`, `test_drives(drive_date ASC)`

- [x] **46. รวม Query บิลและรายการบิลผ่าน PostgREST Foreign Key Embedding (Network Optimization)**
  - **ไฟล์เป้าหมาย**: `src/backend/data.ts`
  - **ผลลัพธ์**: รวมคิวรีผ่าน `bills(*, bill_items(*))` ตัด HTTP Request หายไป 1 รอบเต็ม (ประหยัด 200–400ms)

- [x] **47. ป้องกัน Data Bloat & Overfetching ในตารางลูกค้า (Payload Optimization)**
  - **ไฟล์เป้าหมาย**: `src/backend/data.ts`
  - **ผลลัพธ์**: จำกัดการโหลดรายชื่อลูกค้าเปิดหน้าแรก Tier 1 ที่ 250 รายการ

- [x] **48. สร้าง Single Init RPC รวมการเปิดหน้าแรกใน Request เดียว (Ultimate 1-RTT Optimization)**
  - **ไฟล์เป้าหมาย**: `supabase/migrations/20261024113000_fix_showroom_init_rpc_columns.sql`, `src/backend/data.ts`
  - **ผลลัพธ์**: สร้าง RPC `get_showroom_initial_data()` ดึง Models, Vehicles, Customers, Roles, Settings จบใน 1 HTTP Request พร้อม fallback

- [x] **49. ล้าง Index ซ้ำซ้อนใน Supabase (Duplicate Indexes Cleanup จากผล CLI Inspect)**
  - **ไฟล์เป้าหมาย**: `supabase/migrations/20261024111500_database_and_index_optimizations.sql`
  - **ผลลัพธ์**: ลบ Index ซ้ำซ้อน 5 คู่ (`idx_customers_phone`, `idx_bills_customer_id`, ฯลฯ) คืน RAM Cache บน Postgres

- [x] **50. แก้ปัญหา Data Bloat 19 MB บนตาราง `vehicle_models` (Payload & Storage Optimization)**
  - **ไฟล์เป้าหมาย**: `src/backend/data.ts`, `supabase/migrations/20261024113000_fix_showroom_init_rpc_columns.sql`
  - **ผลลัพธ์**: ตัดการโหลด Base64 `gallery` ก้อนโตออกจากหน้าแรก ดึงเฉพาะสเปกจำเป็นสำหรับแคตตาล็อก

- [x] **51. แก้ปัญหา RLS Sequential Scans 128,734 ครั้งบน `staff_profiles` (RLS Policy Optimization)**
  - **ไฟล์เป้าหมาย**: `supabase/migrations/20261024111500_database_and_index_optimizations.sql`
  - **ผลลัพธ์**: สร้าง `STABLE SECURITY DEFINER` helpers (`get_current_user_role`, `is_admin`, `is_super_admin`) แคชผลตรวจสิทธิ์ระดับ Transaction ตัด Sequential Scan เหลือ O(1)

- [x] **52. ปรับปรุง State Management ด้วย Lightweight Store ลด Prop Drilling (Architecture Optimization)**
  - **ไฟล์เป้าหมาย**: `src/store/useAppStore.ts`
  - **ผลลัพธ์**: สร้าง Store ด้วย `useSyncExternalStore` (React 19 native) จัดการ Global State โดยไม่เพิ่มขนาด Dependency

- [x] **53. สร้าง Offline Mutation Queue & Background Sync Retry Worker (Offline Resilience)**
  - **ไฟล์เป้าหมาย**: `src/backend/offlineSync.ts`
  - **ผลลัพธ์**: สร้างคิวจัดเก็บรายการบันทึกลง LocalStorage เมื่อออฟไลน์ และมีตัวดักจับ `window.addEventListener('online')` รัน Background Worker ซิงก์ย้อนหลังอัตโนมัติ

- [x] **54. อัปเดต Architecture Diagram & เอกสารระบบให้สะท้อน Production Ready (Documentation)**
  - **ไฟล์เป้าหมาย**: `docs/architecture.md`
  - **ผลลัพธ์**: เพิ่ม Mermaid Diagram และรายละเอียดสถาปัตยกรรมระบบ 1-RTT, RLS Cache, Bundle Splitting ครบถ้วน

- [x] **55. ระบบบีบอัดรูปภาพ WebP ฝั่ง Client ตามแผน Plan 3 (Storage Optimization)**
  - **ไฟล์เป้าหมาย**: `src/utils/imageCompressor.ts`, `src/backend/data.ts`
  - **ผลลัพธ์**: ย่อภาพสูงสุด 1200px บีบอัดเป็น WebP คุณภาพ 0.8 จำกัดขนาดไม่เกิน 300 KB ก่อนอัปโหลดเข้า `dealership-assets` และ `payment-slips` ทำให้พื้นที่ 1 GB ใช้งานได้ไม่มีวันเต็ม

- [x] **56. เปลี่ยนนโยบายการลบบิลเป็น Soft-Delete (`status = 'voided'`) & คืนสต็อกรถ (Financial & Stock Operations)**
  - **ไฟล์เป้าหมาย**: `supabase/migrations/20261024120000_void_bill_and_stock_return.sql`, `src/backend/data.ts`, `src/App.tsx`, `src/components/views/BillsManagementView.tsx`, `src/components/views/DashboardView.tsx`
  - **ผลลัพธ์**: ยกเลิกคำสั่ง hard DELETE แถวบิล เปลี่ยนเป็นการตั้งสถานะ `voided`, คืนสถานะรถเป็น `ready`, และบันทึก `stock_return` ลงใน `stock_movements` เพื่อการตรวจสอบบัญชีย้อนหลัง พร้อมตัดยอดบิลที่ยกเลิกออกจากกราฟและสถิติรายรับ

- [x] **57. แก้ไขช่องโหว่ความปลอดภัย & ทำความสะอาดโปรเจกต์ (Security Audit)**
  - **ผลลัพธ์**: อัปเดตแพตช์ `dompurify` ปิดช่องโหว่ระดับ critical (0 vulnerabilities), ลบไฟล์ SQL dump ชั่วคราว และจัดระเบียบ `.gitignore` ป้องกันข้อมูลรั่วไหล

- [x] **58. ทดสอบความถูกต้องด้วย E2E Test Suite (Comprehensive Verification)**
  - **ไฟล์เป้าหมาย**: `e2e/storage-and-void-bill.spec.ts`, `e2e/test-account-creation.spec.ts`, `e2e/bills.spec.ts`
  - **ผลลัพธ์**: ผ่านการทดสอบครบ 100% ทั้งการบีบอัด WebP ในเบราว์เซอร์, การสร้างบัญชีผู้ใช้ใหม่, และการจัดการบิล

- [x] **59. แก้ไขปัญหาคอขวด 17 วินาทีบน Tokyo Instance (Tokyo Latency Root Cause Fix)**
  - **สาเหตุรากเหง้า**: ตรวจพบรูปรถยนต์โมเดลทดสอบใน `vehicle_models.hero_image` บันทึกเป็น Uncompressed Base64 Raw Data ขนาดใหญ่ถึง 11.5 MB ส่งผลให้ RPC `get_showroom_initial_data()` ดึงข้อมูลข้าม WAN นานถึง 16.2 วินาที
  - **การแก้ไข**: 
    1. สร้าง Migration `20261024124500_strip_base64_from_showroom_rpc.sql` กรองและตัดรูปภาพ Base64 เกิน 2000 ตัวอักษรออก
    2. ทำ Stale-While-Revalidate และ Cache ข้อมูลสิทธิ์ผู้ใช้ใน `src/backend/data.ts`
  - **ผลลัพธ์**: ความเร็ว RPC ลดจาก 16,245 ms เหลือ 568 ms (เร็วขึ้น 28 เท่า) และเวลา Login ลดจาก 17 วินาทีเหลือ 2.11 วินาที

- [x] **60. สำรองข้อมูลครบ 100% ทุกตารางจาก Tokyo Database (Zero Data Loss Backup)**
  - **ไฟล์สำรอง**: `docs/backup/tokyo_backup_data.json` และ `docs/backup/tokyo_backup_inserts.sql`
  - **ผลลัพธ์**: สำรองข้อมูลครบ 11 ตาราง (ลูกค้า 13 คน, บิล 43 ใบ, รถยนต์ 24 คัน, สต็อก 43 รายการ) พร้อมตั้งค่า `.gitignore` ป้องกันข้อมูลรั่วไหล

- [x] **61. จัดเตรียม Supabase Project ใหม่ที่ Singapore (`ap-southeast-1`)**
  - **โปรเจกต์**: `AvatrAutoService-SG` (`ivybsqtzrfwdamibbumc`) ภายใต้องค์กร `Avatr-Singapore` (`egmrsctqcsvfupufwsdz`) ของบัญชี `pheuanggeogisid@gmail.com`
  - **ผลลัพธ์**: รัน `supabase db push` ซิงก์ครบทั้ง 28 Schema Migrations พร้อม Deploy Edge Functions `create-staff` และ `manage-staff`

- [x] **62. ย้ายบัญชีผู้ใช้ (Auth Users Migration) และ ข้อมูลทั้งหมดขึ้น Singapore (Zero Data Loss Restore)**
  - **Auth Accounts**: ย้ายบัญชีผู้ใช้ครบ 16 บัญชีจาก `auth.users` & `auth.identities` พร้อม Bcrypt Password Hash เดิม (รวม `test01@gmail.com`, `test02@gmail.com`, `saysana3003@gmail.com`, `sengouthai.sonsivilay@gmail.com`) สามารถล็อกอินได้ทันทีโดยไม่ต้องรีเซ็ตรหัสผ่าน
  - **Public Data**: Restore ข้อมูลทั้ง 11 ตารางครบถ้วน 100% ตัวเลขแถวตรงกันทุกตาราง
  - **Storage & QR**: ซิงก์ไฟล์ QR Code ร้านค้าใน `dealership-assets` ไปยัง Singapore และอัปเดต URL ใน `dealership_settings`

- [x] **63. ซิงก์นโยบายความปลอดภัย Row Level Security (RLS) ครบ 34 Policies**
  - **ผลลัพธ์**: Replicate นโยบายความปลอดภัยครบ 34 ข้อบน Singapore ทำให้สิทธิ์การอ่าน-เขียนของแต่ละ Role (Super Admin, Admin, Sales, Technician) มีความปลอดภัยตามมาตรฐาน Enterprise

- [x] **64. ยืนยันผลการทดสอบ Playwright E2E Suite บน Singapore Database ผ่าน 100%**
  - **ผลลัพธ์**: ผ่านการทดสอบครบทุกโมดูล:
    - `auth.spec.ts` (3/3 passed)
    - `crm.spec.ts` (2/2 passed)
    - `bills.spec.ts` (2/2 passed)
    - `stock.spec.ts` (2/2 passed)
    - `pos.spec.ts` (2/2 passed)
    - `theme-lang.spec.ts` (2/2 passed)
    - `storage-and-void-bill.spec.ts` (2/2 passed)
    - `test-account-creation.spec.ts` (4/4 passed)

---

## 💻 หมวดที่ 12: คู่มือการย้ายเครื่องใหม่ & Checklist ตรวจรับงาน (New Machine Handover Guide)

> 💡 **สำหรับผู้ใช้งาน/ผู้ดูแลระบบเมื่อเปิดโปรเจกต์บนคอมพิวเตอร์เครื่องใหม่**:

### 1. การ Clone โปรเจกต์ & ติดตั้ง Dependencies
```bash
# 1. Clone repository
git clone https://github.com/HM186812/AvatrAutoService.git
cd AvatrAutoService

# 2. ตั้งค่า Remote สำรอง (Fork ของ Keokisith)
git remote add my-fork https://github.com/pheuangvichithkeokisith-del/AvatrAutoService.git

# 3. ติดตั้ง Node Modules (ใช้ Node.js v20 ขึ้นไป)
npm install
```

### 2. การตั้งค่า Environment Variables (`.env.local` & `.env.test`)
สร้างไฟล์ `.env.local` ใน Root directory สำหรับรัน Development:
```env
VITE_SUPABASE_URL="https://ivybsqtzrfwdamibbumc.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2eWJzcXR6cmZ3ZGFtaWJidW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTU5NTAsImV4cCI6MjEwODM5MTk1MH0.iz7kRSsD4DQ4_P0cG2QYM8bjyOhGfSRllE3QyntOnn0"
```

สร้างไฟล์ `.env.test` สำหรับรัน Playwright E2E Tests:
```env
VITE_SUPABASE_URL="https://ivybsqtzrfwdamibbumc.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2eWJzcXR6cmZ3ZGFtaWJidW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTU5NTAsImV4cCI6MjEwODM5MTk1MH0.iz7kRSsD4DQ4_P0cG2QYM8bjyOhGfSRllE3QyntOnn0"
E2E_ADMIN_EMAIL="test01@gmail.com"
E2E_ADMIN_PASSWORD="123456"
E2E_ALLOWED_SUPABASE_ORIGIN="https://ivybsqtzrfwdamibbumc.supabase.co"
```

### 3. Checklist การตรวจสอบความพร้อมบนเครื่องใหม่ (Verification Checklist)
- [ ] **Lint & Type Check**: รัน `npm run lint` (ต้องได้ Exit Code 0 ไม่มี Type Error)
- [ ] **Production Build**: รัน `npm run build` (Vite Build ต้องผ่านเรียบร้อย)
- [ ] **E2E Test Suite**: รัน `npx playwright test e2e/auth.spec.ts` (ทดสอบเชื่อมต่อ Database Singapore)
- [ ] **Development Server**: รัน `npm run dev` แล้วเข้าเว็บที่ `http://localhost:3000`
- [ ] **เข้าสู่ระบบจริง**: ทดสอบล็อกอินด้วย `test01@gmail.com` / `123456` (เวลาโหลดต้องไม่เกิน 1.5 วินาที)

### 4. การตั้งค่าบน Cloudflare Pages (Production Deploy Checklist)
เมื่อพร้อมนำหน้าเว็บ Production ขึ้น Cloudflare Pages ให้เข้าไปที่ Dashboard:
1. เข้าไปที่ **Cloudflare Dashboard** ➔ **Workers & Pages** ➔ เลือกโปรเจกต์ `avatr-auto-service`
2. ไปที่แท็บ **Settings** ➔ **Environment variables**
3. ปรับค่าตัวแปรเป็น Singapore Instance:
   - `VITE_SUPABASE_URL` = `https://ivybsqtzrfwdamibbumc.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2eWJzcXR6cmZ3ZGFtaWJidW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTU5NTAsImV4cCI6MjEwODM5MTk1MH0.iz7kRSsD4DQ4_P0cG2QYM8bjyOhGfSRllE3QyntOnn0`
4. กด **Save** และสั่ง **Retry Deployment** หรือ Push Commit ใหม่เพื่อ Trigger Build

### 5. แผนการ Rollback กลับ Tokyo (Safety Rollback)
หากในอนาคตต้องการสลับกลับไปใช้ฐานข้อมูลเดิมที่ Tokyo:
* ฐานข้อมูล Tokyo (`ybzylmboyqqnvtzdkpkg`) ยังอยู่ครบถ้วน 100% ไม่ได้ถูกแตะต้อง
* เพียงแค่แก้ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` กลับเป็นค่าของ Tokyo ระบบจะทำงานต่อได้ทันที 100%

---

## 📦 แผนยุทธศาสตร์การจัดการ Storage & สลิปการเงิน (บันทึกสำหรับ Phase 2)

| แผนยุทธศาสตร์ | ปริมาณข้อมูล / คัน | ขีดความสามารถที่รองรับ | อายุการใช้งานบน Free Tier (1 GB) | แนวทางดำเนินการ |
| :--- | :---: | :---: | :---: | :--- |
| **แบบที่ 2: บีบอัด WebP (จำกัด 300 KB/รูป)** | ~1.1 MB (รูปรถ 3 รูป + สลิป 1 รูป) | ~930 คัน | **~4.5 – 5 ปี** ✅ | บีบอัดภาพผ่าน Client Canvas เป็น `.webp` สูงสุด 1200px / 300KB ก่อนส่งขึ้น Cloud ไม่ต้องลบประวัติย้อนหลัง |
| **แบบที่ 3: บีบอัด WebP + ลบสลิปเก่า 90 วัน** | หมุนเวียนสต็อก 30–50 คัน | หมุนเวียนคงที่ | **ไม่มีวันเต็ม (ใช้จริงคงที่ ~150 MB)** 🚀 | ใช้ WebP 300KB ร่วมกับ Retention Policy ล้างภาพสลิปที่บัญชีตรวจและปิดงบไตรมาสเรียบร้อยแล้ว |

---

## 📊 ภาคผนวก: ตารางวัดความซับซ้อน Big-O ฐานข้อมูล (Database Complexity Matrix)

| การทำงาน (Operation) | จุดที่มีปัญหา (Target) | Big-O ปัจจุบัน | Big-O หลัง Optimize | ผลลัพธ์เชิงปริมาณ (Measured Impact) |
| :--- | :--- | :--- | :--- | :--- |
| **Sort Query** (`order by created_at desc`) | `vehicles`, `customers` | **$O(N \log N)$** (Seq Scan + In-Memory QuickSort) | **$O(\log M + K)$** (B-Tree Index Scan) | ลดเวลา Query จากวินาทีเหลือระดับ <10ms |
| **RLS Auth Check** | `staff_profiles` ผ่าน Policy ทุกตาราง | **$O(N \times M)$** (Scan ตาราง `staff_profiles` ซ้ำทุก row) | **$O(1)$** (`STABLE SECURITY DEFINER` function cache) | ตัด Seq Scan **128,734 ครั้ง** เหลือประเมินผลครั้งเดียวต่อ Session |
| **Catalog Data Payload** | `vehicle_models` (`gallery`/`hero_image`) | Space **$O(N \times S_{\text{image}})$** (~1.5 MB/row) | Space **$O(N \times S_{\text{url}})$** (~100 B/row) | ลดขนาดตารางจาก **19 MB เหลือ ~15 KB** (ลด 99.9%) |
| **Index Write Overhead** | 5 ตารางหลักที่มี Index ซ้ำซ้อน 2 ตัว | Write **$O(2 \log M)$** (เขียน 2 Index ต้นคู่กัน) | Write **$O(\log M)$** (เขียน B-Tree ต้นเดียว) | ประหยัด RAM Cache และลด I/O การบันทึกข้อมูลลง 50% |
| **Network Roundtrip** | โหลดบิล + รายการบิล (`bills` + `bill_items`) | **$2 \times \text{RTT}$** (~400–500ms ข้าม WAN) | **$1 \times \text{RTT}$** (~200–250ms via FK Embedding) | ตัดเวลารอเน็ตลงครึ่งหนึ่งในทุกการเปิดแท็บบิล |









---

## 🛡️ หมวดที่ 13: แผนยุทธศาสตร์บริการหลังการขายระยะยาว & การควบคุมทรัพยากรฐานข้อมูล (Long-Term After-Sales Lifecycle & Supabase Zero-Cost Retention)

> **วัตถุประสงค์**: ควบคุมทรัพยากรบน Supabase Free Tier ให้อยู่ได้ตลอดไปโดยไม่มีวันเต็ม รองรับวงจรชีวิตรถยนต์ไฟฟ้า (EV Lifecycle 8–10 ปี) ตั้งแต่ส่งมอบ, ตรวจเช็คสภาพตามระยะ, เคลมประกันแบตเตอรี่ SOH, และกำจัดข้อมูลขยะแบบอัตโนมัติ

- [ ] **65. สร้าง Database Retention Function (`purge_old_ephemeral_data`)**
  - **ไฟล์เป้าหมาย**: `supabase/migrations/20261025000000_data_retention_and_purge_cron.sql`
  - **รายละเอียด**:
    1. สร้าง Stored Procedure ลบข้อมูลนัดหมายสถานะ `cancelled` หรือ `failed` ที่เก่าเกิน 90 วัน
    2. ลบประวัติการนัดหมายทดลองขับ `test_drives` ที่เก่าเกิน 1 ปี
    3. ตั้งค่า `pg_cron` รันสคริปต์อัตโนมัติทุกวันอาทิตย์เวลาเที่ยงคืน คืนพื้นที่ตารางอย่างสม่ำเสมอ

- [ ] **66. สร้าง Auto-Ping Keep-Alive ป้องกันฐานข้อมูล Supabase หลับ (7-Day Auto-Pause Prevention)**
  - **ไฟล์เป้าหมาย**: `.github/workflows/supabase-keepalive.yml`
  - **รายละเอียด**:
    1. สร้าง GitHub Actions Workflow ตั้งเวลาทำงานแบบ Cron (`0 0 */3 * *`) ทุก 3 วัน
    2. ส่ง HTTP GET request เบาๆ ไปที่ Endpoint `/rest/v1/dealership_settings?select=id&limit=1`
    3. ป้องกันไม่ให้โปรเจกต์ Supabase ถูก Freeze / Pause ในช่วงเทศกาลหรือวันหยุดยาวของศูนย์บริการ

- [ ] **67. ปรับปรุงระบบบีบอัดรูปถ่ายตรวจเช็คสภาพรถ PDI และงานซ่อม (After-Sales Inspection WebP Compression)**
  - **ไฟล์เป้าหมาย**: `src/utils/imageCompressor.ts`, `src/backend/data.ts`
  - **รายละเอียด**:
    1. ตรวจสอบให้มั่นใจว่ารูปที่ช่างถ่ายจากโทรศัพท์มือถือเข้าสู่ฟังก์ชัน `uploadDealershipAsset` จะถูกย่อเหลือความกว้างไม่เกิน 1280px และแปลงเป็น WebP คุณภาพ 80% (ขนาด <= 150 KB เสมอ)
    2. ป้องกันไม่ให้รูปสภาพรถขนาด 5-10 MB กินพื้นที่ Storage 1 GB จนเต็ม

- [x] **68.1 ระบบแนบสลิปการโอนเงิน, ตรวจสอบผ่าน Signed URL และแนบสลิปย้อนหลัง (Payment Slip Upload & Lazy Viewer)**
  - **ไฟล์**: `src/backend/data.ts`, `src/components/views/POSSalesView.tsx`, `src/components/views/BillsManagementView.tsx`, `src/components/modals/SlipPreviewModal.tsx`
  - **ผลลัพธ์**: 
    1. เพิ่มฟังก์ชัน `uploadPaymentSlip` (บีบอัด WebP <= 300KB, ตั้งชื่อไฟล์ unique timestamp ป้องกันชน RLS 403), `getPaymentSlipUrl` (ขอ Signed URL 1 ชม.), และ `attachSlipToBill`
    2. หน้า POS: เพิ่มช่องกรอก `transferRef` และตัวเลือกแนบสลิปพร้อมรูป Thumbnail Preview อัปโหลดอัตโนมัติตอนบันทึกการขาย
    3. หน้าบิล: เพิ่มระบบ Lazy Signing (ตารางไม่โหลด URL ล่วงหน้า), แสดง Badge `[ 📄 ສະລິບ ]` คลิกเปิด `SlipPreviewModal`, และมีปุ่ม `[ + ສະລິບ ]` สำหรับแนบสลิปย้อนหลัง
    4. ผ่านการทดสอบจริงบน Supabase Singapore (`ivybsqtzrfwdamibbumc`) อัปโหลดและขอ Signed URL สำเร็จ HTTP 200 OK

- [ ] **68.2 นโยบายหมุนเวียนสลิปการเงินและการสำรองข้อมูลระยะยาว (Payment Slip 90-Day Rolling Policy & Export ZIP)**
  - **ไฟล์เป้าหมาย**: `src/backend/data.ts`, `src/components/views/BillsManagementView.tsx`
  - **รายละเอียด**: ดำเนินการเมื่อมีสลิปสะสมเกิน 90 วัน สำหรับดาวน์โหลดรวมชุดสลิป ZIP เก็บลงฮาร์ดดิสก์ และลบไฟล์ออกจาก Storage

- [ ] **69. ระบบแจ้งเตือนรอบเข้าเช็คระยะอัตโนมัติ (EV Periodic Maintenance & Warranty Alert)**
  - **ไฟล์เป้าหมาย**: `src/components/views/AppointmentsView.tsx`, `src/components/modals/CustomerAfterSalesModal.tsx`
  - **รายละเอียด**:
    1. นำข้อมูล `currentMileageKm` และ `warrantyStartDate` มาคำนวณรอบเช็คระยะถัดไป (เช่น ทุก 6 เดือน หรือทุก 10,000 กม.)
    2. แสดง Badge สถานะเตือน "ใกล้ถึงรอบเช็คระยะ" หรือ "แจ้งเตือนตรวจสุขภาพแบตเตอรี่ (SOH)"
    3. เพิ่มปุ่มคลิกส่งข้อความแจ้งเตือนผ่าน WhatsApp API ไปยังลูกค้าได้ในคลิกเดียว

- [ ] **70. สรุปประวัติการซ่อมบำรุงเก่าเข้าสมุดประจำรถ (Service History Aggregator & Cold Archive)**
  - **ไฟล์เป้าหมาย**: `src/backend/data.ts`
  - **รายละเอียด**:
    1. สำหรับรถที่มีประวัติเข้าซ่อมยาวนานเกิน 3 ปี มีฟังก์ชันสรุปประวัติภาพรวม (Summary Matrix) บันทึกเข้า `after_sales_notes` ของลูกค้า
    2. Archive รายการซ่อมย่อยๆ ที่เก่าเกิน 5 ปี ออกเป็นไฟล์สำรอง เพื่อรักษาขนาดตาราง `service_appointments` ให้เบาและโหลดเร็วระดับ O(1) ตลอดไป

---

## ⚡ หมวดที่ 14: ปลดล็อกขีดจำกัดฐานข้อมูล & อัปเกรดระบบค้นหา/ช่วงเวลา/การส่งออกข้อมูล (Database Scalability, Date Range & High-Volume Export)

> **วัตถุประสงค์**: ปลดล็อกขีดจำกัดจำนวนข้อมูล (เดิมติด Limit 250/300/500), รองรับการดึงข้อมูลตามช่วงวัน/เวลาแบบไม่จำกัดจำนวน, เพิ่มประสิทธิภาพความเร็วด้วย Database Index และปรับปรุงระบบ Export CSV ให้รองรับภาษาลาวและข้อมูลขนาดใหญ่ได้อย่างสมบูรณ์

- [x] **71. ปลดล็อกขีดจำกัดฐานข้อมูล Supabase และเพิ่มฟังก์ชันดึงบิล/ลูกค้าตามช่วงวันแบบไม่จำกัด (Unlimited Range Fetching)**
  - **ไฟล์**: `src/backend/data.ts`
  - **การแก้ไข**: 
    1. ถอดขีดจำกัด `.limit(250)`, `.limit(300)` และ `.limit(500)` ออกจาก `fetchInitialData`, `fetchTabData`, `loadBackendData` (`stock_movements`)
    2. เพิ่มฟังก์ชัน `fetchBillsByDateRange` และ `fetchLeadsByDateRange` ดึงข้อมูลผ่าน `.range()` pagination loop ทีละ 1,000 แถวจนครบทุกรายการโดยไม่ติดเพดาน Supabase PostgREST
    3. แคช `cachedStaffUsers` และ `cachedVehicleModels` เพื่อให้การแมปพนักงานและรุ่นรถยนต์ครบถ้วนสมบูรณ์

- [x] **72. เพิ่ม Database Index รองรับการค้นหาและเรียงลำดับช่วงวัน/เวลาในระดับมิลลิวินาที**
  - **ไฟล์**: `supabase/migrations/20261025152000_bills_and_customers_date_range_indexes.sql`
  - **การแก้ไข**: 
    1. สร้าง Index: `idx_bills_bill_date_desc` บน `bills(bill_date DESC)`
    2. สร้าง Composite Index: `idx_bills_type_bill_date_desc` บน `bills(type, bill_date DESC)`
    3. สร้าง Index: `idx_customers_payment_date_desc` บน `customers(payment_date DESC)`
    4. อัปเดต SQL RPC `get_showroom_initial_data()` ปลดล็อก `LIMIT 500` บน `vehicles` และ `LIMIT 250` บน `customers`
    5. ซิงค์ขึ้นรีโมตเรียบร้อย 100% ผ่าน `npx supabase db push`

- [x] **73. อัปเกรดระบบค้นหา คัดกรองช่วงเวลา และ Pagination ในหน้าการเงิน & บิล (BillsManagementView)**
  - **ไฟล์**: `src/components/views/BillsManagementView.tsx`
  - **การแก้ไข**: 
    1. ใช้แถบตัวกรองแบบ Compact 2-Row Bar พร้อมระบบค้นหาหลายคำพร้อมกัน (Multi-Keyword AND Search) ข้ามทุกฟิลด์ และแปลงเบอร์โทร `020`/`+856 20` อัตโนมัติ
    2. เชื่อมโยง KPI 4 กล่องด้านบน (`saleBills`, `importBills`, `installmentBills`, `totalDocuments`) ให้คำนวณจาก `timeFilteredBills` ตามช่วงเวลาที่เลือก
    3. บันทึกสถานะตัวกรองใน `sessionStorage` (`avatr_bills_filter_v1`) และใช้ `useDeferredValue` ป้องกันหน้าจอกระตุกตอนพิมพ์ค้นหา
    4. เพิ่มระบบแบ่งหน้า (`PAGE_SIZE = 50`) ให้กับตารางสัญญาผ่อนชำระ (`paginatedContracts`) และตารางบิล

- [x] **74. ปรับปรุงระบบ Export CSV ให้รองรับภาษาลาว ตัวอักษรพิเศษ และส่งออกตามแท็บ/ช่วงวันที่เลือก**
  - **ไฟล์**: `src/components/views/BillsManagementView.tsx`, `src/components/views/CustomerView.tsx`
  - **การแก้ไข**: 
    1. เปลี่ยนจากการใช้ `encodeURI` มาใช้ `Blob` + UTF-8 BOM (`\uFEFF`) และสร้างฟังก์ชัน `csvCell()` Escape เครื่องหมายคำพูด (`"`), อักขระพิเศษ (`#`, `&`) และการขึ้นบรรทัดใหม่ (`\n`) เปิดใน Microsoft Excel ได้ถูกต้อง 100%
    2. หน้าบิล: เพิ่มปุ่ม Export CSV ตามรายการที่กรอง (`filteredBills.length`) และส่งออกข้อมูลแยกตามแท็บบิลหรือตารางสัญญาผ่อนอัตโนมัติ
    3. หน้า CRM ลูกค้า: ปรับปุ่ม Export CSV ให้ส่งออกตามแท็บที่เปิดอยู่ (ลูกค้าใหม่, ลูกค้าที่ชำระสำเร็จแล้วพร้อมข้อมูลรถ/ประกัน, หรือลูกค้าผ่อนชำระ) และผูกตัวกรองช่วงวันให้ตัวเลข Badge และข้อมูลส่งออกตรงกันทุกจุด

---

## 🚀 หมวดที่ 15: แผนงาน Phase 2 ฉบับคนทำงานจริงหน้าร้าน (Showroom Field-First & Zero-Friction)

> **ปรัชญาหลัก**: "ระบบต้องทำให้งานง่ายและเร็วขึ้น ไม่ใช่เพิ่มภาระงาน"  
> ออกแบบเพื่อพนักงานขาย (Sales) ถือมือถือเครื่องเดียว และเจ้าของโชว์รูม (Admin) ที่ต้องการความคล่องตัว ตัดขั้นตอนเอกสารที่ซ้ำซ้อนออกทั้งหมด

- [x] **75. ระบบจัดการพนักงานลาออก & โอนเฉพาะเคสค้าง (1-Click Pending Deals Handover)**
  - **ไฟล์เป้าหมาย**: `src/components/views/UserManagementView.tsx`, `src/backend/data.ts`, `src/backend/offlineStore.ts`, `src/components/views/POSSalesView.tsx`
  - **สถานะ**: ✅ เสร็จสมบูรณ์ 100% (Commit `1e9c5b4`)
  - **การดำเนินการ**:
    1. เพิ่มฟังก์ชัน `getUserPendingLeads` และป้ายเตือน `⏳ X ເຄສຄ້າງ` พร้อมปุ่ม `🔄 ໂອນເຄສ` ใน `UserManagementView.tsx`
    2. สร้างหน้าต่าง 1-Click Handover Modal พรีวิวรายชื่อลูกค้าที่คุยค้างอยู่ และให้เลือกเซลส์ปลายทางที่มีสถานะ `active` เท่านั้น
    3. เมื่อ Admin กดระงับบัญชี (`suspended`) ระบบจะเปิดหน้าต่างโอนเคสให้เลือกเพื่อนร่วมงานส่งต่องานได้ทันที
    4. สร้างฟังก์ชัน `handoverStaffPendingLeads` ใน `data.ts` และ `offlineStore.ts` ย้าย `assigned_to` บน Supabase พร้อมแสตมป์บันทึกประวัติการโอน
    5. อัปเกรด `saveLead` ให้ปลดล็อกการเปลี่ยน `assignedTo` ของลูกค้าเดิมได้อย่างถูกต้อง
    6. กรองตัดชื่อเซลส์ที่ถูก `suspended` ออกจาก Dropdown ในหน้าขาย POS (`POSSalesView.tsx`) อัตโนมัติ

- [ ] **76. [PAUSED] การแบ่งสิทธิ์และระบบช่วยงานหน้าร้าน (Field-First RBAC & On-Floor CRM - พักไว้ตามคำสั่งเพื่อรักษาขอบเขตงาน)**
  - **ไฟล์เป้าหมาย**: `src/components/views/CustomerView.tsx`, `src/components/views/BillsManagementView.tsx`, `src/App.tsx`
  - **รายละเอียด**:
    1. **หน้า CRM ลูกค้า (Floor Check & Quick Note)**:
       - **เช็กกันชนเคส 3 วินาที**: ค้นหาด้วยชื่อ หรือเบอร์โทร 4 ตัวท้ายได้รวดเร็ว
       - **หากเป็นเคสเพื่อนร่วมงาน**: หน้าจอแสดงชื่อลูกค้า, เบอร์โทร Mask (`020-XXXX-5678`), สถานะ และชื่อเซลส์เจ้าของเคสชัดเจน (ซ่อนข้อมูลไฟแนนซ์/สัญญา)
       - **ปุ่มแตะด่วน "📌 ฝากเรื่อง / บันทึกแทน"**: เซลส์กดช่วยรับเรื่องแทนเพื่อนได้ทันทีผ่าน Quick Tags (`[แวะมาดูรถ]`, `[โทรมาตามเอกสาร]`, `[นัด Test Drive]`, `[ฝากเบอร์โทรกลับ]`) โดยระบบจะ Stamp ชื่อคนบันทึกและเวลาอัตโนมัติ **ไม่ต้องทำระบบขออนุมัติโอนเคสให้เสียเวลาขายของ**
    2. **หน้าบิลและการเงิน (Bills & Live Audit Status)**:
       - **ป้ายสถานะ 3 สีชัดเจน**: `🟡 รอตรวจสลิป`, `🟢 อนุมัติแล้ว`, `🔴 สลิปมีปัญหา` เซลส์เปิดจอมือถือเช็กได้ทันที ลดการทักถาม Admin ใน LINE
       - **ล็อกบิลที่ตรวจแล้ว (Approved Lock)**: ปิดการแก้ไขบิลที่สถานะอนุมัติแล้ว มีไอคอนกุญแจ 🔒 เฉพาะ Admin เท่านั้นที่ปลดล็อกได้
       - **ซ่อนต้นทุนรถ**: พนักงานขายเห็นเฉพาะบิลของตนเอง และซ่อนตัวเลขต้นทุน/กำไรโชว์รูม 100%

- [x] **77. ระบบจัดอันดับ Top Sales & 4 เหรียญเกียรติยศฉบับเข้าใจง่ายใน 3 วินาที (`src/utils/salesLeaderboard.ts`)**
  - **ไฟล์เป้าหมาย**: `src/utils/salesRanking.ts` (สร้างใหม่)
  - **รายละเอียด**:
    1. **เลิกใช้สูตรคำนวณถ่วงน้ำหนัก 4 มิติที่ซับซ้อน**: เซลส์วัดผลจาก **"จำนวนคันที่ส่งมอบสำเร็จ (Delivered Units)"** ประจำเดือนอย่างตรงไปตรงมา
    2. **มอบ 4 เหรียญรางวัลเกียรติยศตามจุดเด่นจริง**:
       - 🏆 **Top Gun**: ส่งมอบรถได้จำนวนคันมากที่สุดในเดือน
       - 💎 **Margin Hero**: คุมราคาขายยอดเยี่ยม (ส่วนลดเฉลี่ยน้อยที่สุดในทีม)
       - ⚡ **Speedy Closer**: ปิดการขายไว (ระยะเวลาเฉลี่ยจากรับลีดถึงส่งมอบรถเร็วที่สุด)
       - 🤝 **Customer Care**: บันทึกติดตามลูกค้าและดูแลบริการหลังการขายสม่ำเสมอที่สุด
    3. คำนวณแบบ In-Memory ด้วย `useMemo` จากข้อมูลในระบบ ทำงานเร็วระดับ < 1ms

- [x] **78. หน้าจอแสดงผล Dashboard โชว์รูม & การ์ดผลงานส่วนบุคคล (Showroom Board & Sales Card)**
  - **ไฟล์เป้าหมาย**: `src/components/views/DashboardView.tsx`
  - **รายละเอียด**:
    1. **มุมมองพนักงานขาย (Sales View)**:
       - การ์ด "ผลงานของฉันเดือนนี้": แสดงจำนวนคันที่ส่งมอบ, อันดับในโชว์รูม, และเหรียญรางวัลที่ได้รับ
       - กระดาน Top 3 ประจำเดือน: แสดงรูป Avatar, ชื่อเพื่อนร่วมงาน, และจำนวนคันที่ส่งมอบ (ซ่อนยอดเงินขายรวมของเพื่อน เพื่อรักษาความเป็นส่วนตัวและป้องกันความขัดแย้งในทีม)
    2. **มุมมองผู้ดูแลระบบ (Admin View)**:
       - แสดงผลงานครบทุกมิติของทั้งทีม (จำนวนคัน, ยอดขายรวม USD, ส่วนลดเฉลี่ย, และเหรียญรางวัล)
---

## 🚨 หมวดที่ 16: ปัญหาสำคัญที่ตรวจพบล่าสุดจากการตรวจสอบระบบจริง (System & Database Issues Discovered - 2026-10-27)

> **วัตถุประสงค์**: บันทึก 5 ปัญหาเชิงโครงสร้างฐานข้อมูลและสภาพแวดล้อมที่พบจากการทดสอบ End-to-End เพื่อรอการยืนยันจากทีมและดำเนินการแก้ไข

- [x] **79. แก้ไข Row Level Security (RLS) Policy ตาราง `service_appointments` และ `test_drives` (Critical DB Bug)**
  - **ปัญหา**: ใน Migration `20261019220000` มีคำสั่ง `ENABLE ROW LEVEL SECURITY` แต่ไม่ได้สร้าง Policy สำหรับ `INSERT` และ `UPDATE` ทำให้เมื่อหน้าบ้านบันทึกนัดหมายซ่อมบำรุงหรือทดลองขับ จะติด Error `code: 42501 (new row violates row-level security policy)` ส่งผลให้ตารางทั้งสองว่างเปล่า (0 แถว)
  - **แนวทางแก้ไข**: สร้าง SQL Migration เพิ่ม Policy `service_appointments_insert`, `service_appointments_update`, `test_drives_insert`, `test_drives_update` ให้พนักงานที่มีสิทธิ์ (`canUpdatePDI`, `technician`, `admin`) บันทึกและแก้ไขข้อมูลได้

- [x] **80. ทำความสะอาดข้อมูลขยะและรุ่นรถซ้ำซ้อนในตาราง `vehicle_models` (Data Hygiene & Integrity)**
  - **ปัญหา**: พบโมเดลรถทดสอบในอดีตตกค้างบนฐานข้อมูล Singapore เช่น `"Ding Dong"`, `"ABADABOWL"`, `"oefwojfiwejfiwefjh"`, `"27842432184793"` และมีชื่อรุ่นจริงซ้ำซ้อน (`AVATR 12` 2 แถว, `AVATR 11` 2 แถว, `AVATR 07` 2 แถว)
  - **แนวทางแก้ไข**: ลบโมเดลทดสอบออก และรวมแถวรุ่นที่ซ้ำกันให้เหลือเฉพาะรุ่นมาตรฐานจริง 4 รุ่น พร้อมตรวจสอบไม่ให้กระทบ Foreign Key ในตาราง `vehicles`

- [x] **81. [SKIPPED / ข้าม] เชื่อมโยงข้อมูลรถยนต์และการรับประกันให้ลูกค้าเก่า 11 คน (ยกเลิก - เป็นข้อมูลจำลอง Dummy Test Data ไม่จำเป็นต้องผูกข้อมูลจริง)**
  - **ปัญหา**: ลูกค้าในระบบ 12 คน มีเพียง 1 คนที่มีเลขตัวถัง (`vin`) และทะเบียนรถยนต์ อีก 11 คนยังไม่มีข้อมูลรถ เลขไมล์ หรือวันหมดประกันแบตเตอรี่ (SOH) ผูกอยู่ ทำให้แท็บ After-Sales แสดงผลไม่สมบูรณ์
  - **แนวทางแก้ไข**: จับคู่บิลขายเดิมเข้ากับลูกค้า และอัปเดตฟิลด์ `vin`, `plate_number`, `warranty_start_date`, `warranty_years` เข้าตาราง `customers` อัตโนมัติ

- [ ] **82. [PAUSED] จัดระเบียบบัญชีพนักงานและเพิ่มบัญชีพนักงานขาย (Staff Role Realignment - พักไว้รอข้อมูลพนักงานจริง)**
  - **ปัญหา**: ปัจจุบันในระบบมีพนักงานบทบาท `sales` เพียง 1 คน (`test02@gmail.com`) แต่มี `general_user` ที่เป็นบัญชี Dummy QA ถึง 9 คน ทำให้ไม่สามารถทดสอบ Flow การโอนเคสระหว่างเซลส์ (ข้อ 75) ได้อย่างสมบูรณ์
  - **แนวทางแก้ไข**: สร้างหรือปรับสิทธิ์บัญชีพนักงานขายเพิ่มอีก 1-2 บัญชี และเคลียร์หรือปิดการใช้งานบัญชีทดสอบที่ไม่ได้ใช้งานจริง

- [x] **83. ปรับแต่ง Playwright E2E Runner สำหรับ Node.js v22.17.1 (Test Environment Compatibility)**
  - **ปัญหา**: การรัน `npx playwright test` ใน Node v22.17.1 ติดขัดข้อผิดพลาด `Unexpected module status 3 from @supabase/auth-js/src/lib/webauthn.errors.ts`
  - **แนวทางแก้ไข**: ปรับปรุงการ Import หรือตั้งค่า Pre-bundle / Babel transform ใน `playwright.config.ts` ให้ข้ามการคอมไพล์ TypeScript source ตรงของ auth-js ใน Node 22


- [x] **84. แก้ไข Supabase Auth Email Confirmation Redirect ไป localhost:3000 และคู่มือเปลี่ยนชื่อเว็บในอนาคต (Critical Auth Flow)**
  - **ปัญหา**: เมื่อผู้ใช้กดยืนยันอีเมลในกล่องจดหมาย ระบบ Supabase GoTrue จะ redirect ไปยัง `http://localhost:3000` แทนที่จะเป็นเว็บจริง เนื่องจากค่า `auth.site_url` เป็น `http://localhost:3000` และไม่มี allowlist ใน `additional_redirect_urls` รวมถึง frontend ไม่ได้ส่ง `emailRedirectTo`
  - **การแก้ไข**:
    1. ปรับ `auth.site_url = "https://avatrautoservice.pheuangkeokisith.workers.dev"` และ `additional_redirect_urls = ["https://avatrautoservice.pheuangkeokisith.workers.dev/**", "https://avatr-auto-service.pages.dev/**", "http://localhost:3000/**"]` ใน `supabase/config.toml` แล้ว push ขึ้นคลาวด์จริงสำเร็จด้วย `npx supabase config push --yes`
    2. เพิ่ม `emailRedirectTo: typeof window !== "undefined" ? (window.location.origin + "/") : "https://avatrautoservice.pheuangkeokisith.workers.dev/"` ใน `signUpStaff` (`src/backend/data.ts`)
    3. เพิ่ม `redirectTo: 'https://avatrautoservice.pheuangkeokisith.workers.dev/'` ใน Edge Function `supabase/functions/create-staff/index.ts`
    4. **ข้อกำหนดสำคัญเมื่อเปลี่ยนโดเมนในอนาคต**: โค้ดหน้าเว็บใช้ `window.location.origin` แบบ Dynamic อยู่แล้ว วันหลังหากเปลี่ยนโดเมนใหม่ (เช่น Custom Domain `https://avatr.la`) ไม่ต้องแก้โค้ดเว็บ แต่ต้องเพิ่ม URL โดเมนใหม่เข้าไปใน `additional_redirect_urls` ของ Supabase Auth เสมอ

- [x] **85. เชื่อมต่อระบบ Audit Log การออกเอกสาร A4 (7 แบบ) ขึ้นฐานข้อมูล Supabase (`document_issuance_logs`)**
  - **ไฟล์เป้าหมาย**: `supabase/migrations/20261028160000_create_document_issuance_logs.sql`, `supabase/migrations/20261028180000_add_doc_logs_delete_policy.sql`, `src/utils/documentLogger.ts`
  - **การดำเนินการ**:
    1. สร้างตาราง `document_issuance_logs` บน Supabase พร้อม Database Indexes 4 จุด (`lead_id`, `vin`, `serial_number`, `created_at`)
    2. กำหนด Row Level Security (RLS) ครบวงจร (`SELECT`, `INSERT`, `DELETE`) สำหรับผู้ใช้งานที่ Authenticated
    3. ปรับ `src/utils/documentLogger.ts` ให้รองรับการซิงค์ประวัติขึ้น Cloud อัตโนมัติใน Background พร้อม Offline Fallback บน `localStorage`
    4. เพิ่มฟังก์ชัน `fetchDocumentLogsFromCloud()` ดึงประวัติเอกสารจากคลาวด์มาซิงค์ในหน้า CRM (`CustomerView.tsx`) และหน้าการเงิน (`BillsManagementView.tsx`)
    5. สร้าง Security Definer Stored Procedure `get_sales_leaderboard(p_period, p_target_date)` บน PostgreSQL (`supabase/migrations/20261028170000_get_sales_leaderboard_rpc.sql`) เพื่อประมวลผลยอดขาย/ส่วนลด/อันดับที่ฝั่งฐานข้อมูล รองรับการเติบโตของข้อมูลขนาดใหญ่

