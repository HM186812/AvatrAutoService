# 📝 TODO: รายการปรับปรุงและแก้ไขระบบ Avatr Auto Service (ครบ 13 จุด + งานค้าง)
> **วันที่อัปเดตล่าสุด**: 2026-10-21  
> **สถานะ**: E2E ผ่าน 100% (19/19), Commit เรียบร้อย, ยังไม่ Push GitHub

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

## ⏳ หมวดที่ 5: งานที่ยังค้าง (Pending) — ต้องทำต่อ

- [x] **14. Commit โค้ดและ migration ทั้งหมดเข้า Git**
  - **สถานะ**: Commit ครบทุกไฟล์ รวมทั้ง migration ใหม่ 3 ไฟล์ และ e2e test fixes
- [ ] **14.1 Push ขึ้น GitHub (`git push origin main`)**

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

- [ ] **17. ล้างโค้ดตายใน migration `20261020203000`**
  - **ปัญหา**: ส่วน `DROP/ADD CONSTRAINT bills_type_check` ไม่ทำอะไร เพราะ DB จริงไม่มี constraint ชื่อนี้ (`bills.type` เป็น enum `bill_type` ที่มีค่า `installment` อยู่แล้ว)
  - **ข้อควรระวัง**: migration นี้ถูกรันบน Cloud ไปแล้ว ห้ามแก้ไฟล์เดิม ถ้าจะล้างต้องสร้าง migration ใหม่ หรือปล่อยไว้ได้เพราะไม่มีผลเสีย

- [ ] **18. ตรวจสอบ `bills_payment_method_check`**
  - **ข้อสังเกต**: constraint บน DB จริงอนุญาต `payment_method` แค่ `transfer`, `cash`, `finance` ต้องยืนยันว่าบิลค่างวดไม่ส่งค่าอื่นเข้ามา (โค้ดปัจจุบัน fallback เป็น `transfer`)

- [ ] **19. `supabase/.temp/cli-latest` ถูกไฟล์ CLI แก้เป็นไฟล์ว่าง**
  - **สถานะ**: ก่อนหน้านี้ restore แล้ว ถ้า `git status` โชว์ว่าถูกแก้อีก ให้ `git checkout supabase/.temp/cli-latest` ก่อน commit

---

## 🔍 หมวดที่ 6: ตรวจสอบสะพานข้อมูลหน้าบ้าน ↔ หลังบ้าน (Data Bridge Audit)

> **วัตถุประสงค์**: ตรวจสอบว่าทุก Column ใน Supabase Cloud ถูกส่ง/รับอย่างถูกต้องตั้งแต่ DB → `data.ts` → Component → UI โดยใช้ webapp-testing (Playwright) ร่วมกับการอ่านโค้ด

- [ ] **20. ตรวจสอบสะพาน Column ตาราง `customers` (After-Sales & Warranty Fields)**
  - **คอลัมน์ที่เพิ่มใหม่ใน migration `20261020203000`**:
    - `paid_date`, `is_payment_completed`, `plate_number`, `vin`, `engine_number`, `color`
    - `current_mileage_km`, `battery_health_soh`
    - `warranty_start_date`, `warranty_expiry_date`, `warranty_years`, `warranty_distance_km`, `warranty_terms`
    - `after_sales_notes`
  - **ตรวจว่า `mapLead` ใน `data.ts` ดึงครบไหม และ `saveLead` ส่งขึ้น DB ครบไหม**
  - **ตรวจว่า `CustomerAfterSalesModal.tsx` เขียน/อ่านฟิลด์ถูกต้อง แล้วรีเฟรชแล้วข้อมูลไม่หาย**

- [ ] **21. ตรวจสอบสะพาน Column ตาราง `bills` (Installment & After-Sales Fields)**
  - **คอลัมน์ที่เพิ่มใหม่**:
    - `installment_period`, `warranty_start_date`, `warranty_expiry_date`, `warranty_years`, `warranty_distance_km`
    - `current_mileage_km`, `battery_health_soh`, `after_sales_notes`
  - **ตรวจว่า `mapBill` ใน `data.ts` ดึงครบ และ `saveBillRecord` ส่งครบ**
  - **ตรวจว่าบิลประเภท `installment` ผ่าน RLS ได้จริง (ไม่ติด 403)**

- [ ] **22. ตรวจสอบสะพาน Column ตาราง `service_appointments` (Mileage Field)**
  - **คอลัมน์ใหม่**: `mileage_km`
  - **ตรวจว่า `saveServiceAppointment` ส่ง `mileage_km` ขึ้น DB และ `mapService` ดึงกลับมาถูก**

- [ ] **23. ตรวจสอบ Storage Bucket ในระบบ Upload จริง**
  - **ทดสอบอัปโหลดรูปภาพ QR/รูปรถ** ไปยัง `dealership-assets` ผ่านหน้า Stock-In
  - **ทดสอบอัปโหลดสลิปโอนเงิน** ไปยัง `payment-slips` ผ่านหน้า POS
  - **ตรวจว่า RLS Policy** อนุญาต Active Staff ได้อ่าน/เขียนถูกต้อง
  - **ตรวจว่า Public URL** ของ `dealership-assets` ใช้งานได้จริงโดยไม่ต้อง Auth

- [ ] **24. ตรวจสอบ `bills_payment_method_check` ไม่ให้บิล `installment` ติด DB Constraint**
  - **constraint ปัจจุบัน**: อนุญาต `payment_method` แค่ `transfer`, `cash`, `finance`
  - **ตรวจโค้ด `saveBillRecord`**: ยืนยันว่า fallback เป็น `transfer` ทำงานถูกต้องจริง
  - **ทดสอบสร้างบิลรับเงินงวด** แล้ว verify ว่า `payment_method` ที่ส่งไป DB ไม่ใช่ค่าที่ constraint ปฏิเสธ

- [ ] **14.1 Push โค้ดทั้งหมดขึ้น GitHub (`git push origin main`)**
  - **Commits ที่ค้าง**: 3 commits (`bc12a99`, `119f778`, `13eff2f`) ยังไม่ได้ push
