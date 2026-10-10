# รายงานการวิเคราะห์ความปลอดภัย (Supabase Security Advisor Analysis)
**โปรเจกต์:** AvatrAutoService Laos (Supabase Backend)
**วันที่:** 10 ตุลาคม 2026

> **อัปเดตก่อน deploy:** ไฟล์ baseline ใน `supabase/migrations/` ยังไม่ใช่ schema พร้อมสร้างระบบใหม่ เพราะไม่มีการเปิด RLS และไม่มี policies/grants สำหรับตาราง จึงห้ามนำไปรันกับฐานข้อมูลจริงหรือใช้ bootstrap โปรเจกต์ใหม่ในสภาพปัจจุบัน ส่วน `delete_vehicle_bill` ติดตั้งในฐานข้อมูลจริงแล้วผ่าน SQL Editor แต่ยังไม่ได้ reconcile กับ migration history; CLI ในเครื่องยังไม่ได้ link กับโปรเจกต์

> สถานะ migration ปัจจุบัน: `20261010150031_baseline_schema.sql` เป็น draft ที่ต้องเติม security configuration ก่อนใช้งาน; `20261010150036_delete_vehicle_bill.sql` เป็น migration ของ RPC ที่ติดตั้งแล้วใน production. อย่ารัน `supabase db push` จนกว่าจะจัดการ migration history และ baseline ให้ตรงกับฐานข้อมูลจริง

---

## 1. การประเมิน Security Advisor Warnings (9 รายการ)

| ประเภท / หัวข้อ | สถานะการใช้งาน | คำอธิบายและคำแนะนำ |
| :--- | :---: | :--- |
| **1. Storage: Public Buckets (`dealership-assets`)** | **ตั้งใจใช้ (Intended)** | รูปภาพรถยนต์และ QR โค้ดของศูนย์ต้องให้หน้าเว็บดึงมาแสดงผลแก่ผู้ใช้งานทั่วไปได้โดยไม่ต้องล็อกอิน (Public Read is required) |
| **2. Storage: Payment Slips (`payment-slips`)** | **ควรระวัง/ควรปิด Public** | สลิปการโอนเงินของลูกค้าและสัญญาไฟแนนซ์ไม่ควรเป็น Public Bucket เพื่อป้องกันข้อมูลส่วนบุคคลรั่วไหล ควรกำหนดให้อ่านได้เฉพาะผู้ใช้ที่มีสิทธิ์ (Authenticated Staff) |
| **3. RLS on `dealership_settings`** | **ตั้งใจใช้ (Intended)** | ข้อมูลการตั้งค่าศูนย์ (เช่น สกุลเงิน, อัตราแลกเปลี่ยน, ข้อมูลธนาคาร) ระบบอนุญาตให้อ่านได้เพื่อให้หน้าแคชเชียร์และหน้าเลือกรถคำนวณราคาได้ |
| **4. RLS DELETE Policies ขาดในบางตาราง** | **ยังไม่ต้องเพิ่ม** | ตาราง `customers`, `test_drives`, `service_appointments` ไม่มี Policy สำหรับ `DELETE`; ตรวจโค้ด backend แล้วไม่มี direct delete path ที่ใช้งานกับตารางเหล่านี้ จึงยังไม่ควรเพิ่ม policy จนกว่าจะมีฟังก์ชันลบที่ต้องใช้จริง |
| **5. Auth: Leaked-Password Protection** | **ควรเปิดใช้งาน (Recommended)** | แนะนำให้เปิดฟีเจอร์ "Prevent use of leaked passwords" ใน Supabase Dashboard > Authentication > Security เพื่อป้องกันการตั้งรหัสผ่านง่ายหรือรหัสที่เคยหลุดในฐานข้อมูลแฮกเกอร์ |
| **6. Function Security: `SECURITY DEFINER` view search_path** | **แก้ไขแล้ว (Fixed)** | ในฟังก์ชัน `record_vehicle_bill` และ `delete_vehicle_bill` มีการกำหนด `SET search_path = public` ไว้อย่างถูกต้องเพื่อป้องกัน Search-path injection attack |

---

## 2. สถานะ Migration Files ปัจจุบันใน Git
ไฟล์ migration ปัจจุบัน:
1. `20261010150031_baseline_schema.sql` — draft มี 11 ตารางและ `record_vehicle_bill`; ยังขาด RLS, policies และ grants, จึงห้ามใช้ deploy/bootstrap
2. `20261010150036_delete_vehicle_bill.sql` — RPC ลบบิล; SQL เดียวกันติดตั้งใน production แล้ว แต่ยังไม่ได้บันทึกใน migration history ของ Supabase

---

## 3. สรุปข้อมูลทดสอบ (TEST / AUDIT Data) ที่ค้างอยู่ในระบบ

จากการสแกนฐานข้อมูลล่าสุด พบข้อมูลทดสอบดังนี้:
* **customers (ลูกค้า):** ค้าง 6 แถว (จากทั้งหมด 12 แถว)
* **vehicles (รถยนต์):** ค้าง 5 คัน (จากทั้งหมด 7 คัน)
* **bills (บิล):** ค้าง 3 บิล (จากทั้งหมด 10 บิล)
* **bill_items:** ค้าง 7 รายการ
* **stock_movements:** ค้าง 7 รายการ
* **service_appointments:** ค้าง 2 รายการ
* **test_drives:** ค้าง 4 รายการ
* **vehicle_models:** ค้าง 3 รุ่น

> *หมายเหตุ: หากต้องการลบข้อมูลทดสอบเหล่านี้ สามารถใช้สคริปต์ `docs/qa/cleanup_test_data.sql` รันใน Supabase SQL Editor ได้ทันทีเมื่อพร้อมครับ*
