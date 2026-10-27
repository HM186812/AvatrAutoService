# Payment Slip Upload, Verification & Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้พนักงานขายและฝ่ายบัญชีสามารถแนบสลิปการโอนเงิน (บีบอัด WebP <= 300KB อัตโนมัติ), กรอกเลขอ้างอิงธนาคารในหน้า POS, และเปิดดูสลิปพร้อมแนบสลิปย้อนหลังในหน้าจัดการบิล (Bills Management) ได้อย่างสมบูรณ์

**Architecture:**
- **Storage Layer**: ใช้งาน Private Bucket `payment-slips` ที่มีอยู่แล้วบน Supabase โดยเข้าถึงไฟล์ผ่าน Signed URL (หมดอายุ 1 ชั่วโมง) ป้องกันข้อมูลบัญชีรั่วไหล
- **Backend Service Layer (`src/backend/data.ts`)**: เพิ่มฟังก์ชัน `getPaymentSlipUrl` เพื่อขอ Signed URL และ `attachSlipToBill` เพื่อแนบสลิปเข้ากับบิลที่มีอยู่แล้ว
- **Frontend POS (`POSSalesView.tsx`)**: เพิ่มช่องกรอก `transferRef` (เลขอ้างอิง BCEL) และตัวเลือกแนบไฟล์สลิป พร้อมรูป Preview ทันที
- **Frontend Bills Management (`BillsManagementView.tsx`)**: แสดง Badge/ปุ่มดูสลิปในตารางบิล, ช่องแนบสลิปย้อนหลังสำหรับเคสที่ลูกค้าส่งสลิปตามมาใน LINE, และหน้าต่าง Modal ดูรูปสลิปขยายใหญ่

**Tech Stack:** React 19, TypeScript, Supabase Storage (`payment-slips`), WebP Client Compressor (`src/utils/imageCompressor.ts`), Tailwind CSS, Lucide Icons

**Spec:** `TODO.md` (ข้อ 68 & ทางเลือก B)

## Global Constraints
- ห้ามดึงรูปภาพต้นฉบับเกิน 10 MB เข้าสู่ระบบ (ตัดทิ้งที่ Trust Boundary)
- บังคับแปลงรูปเป็น WebP ความละเอียดไม่เกิน 1200px และขนาด <= 300 KB เสมอผ่าน `compressImageToWebP`
- Bucket `payment-slips` เป็น Private ห้ามใช้ `getPublicUrl` ต้องใช้ `createSignedUrl` เท่านั้น
- ไม่กระทบ Flow การขายเดิม (การแนบสลิปเป็น Optional ไม่บล็อกการออกบิลหากลูกค้าจ่ายเงินสดหรือไฟแนนซ์)

## Review Focus
1. เคสเลือกไฟล์ที่ไม่ใช่รูปภาพหรือ PDF: ต้องแจ้งเตือน Error ชัดเจน ไม่ให้แอป Crash
2. เคสออฟไลน์ (Demo Mode): ต้องไม่พัง มี fallback จำลองรูป preview ได้
3. เคส Signed URL หมดอายุ: ต้องขอ URL ใหม่เมื่อเปิด Modal ดูสลิป
4. เคสแนบสลิปย้อนหลังในหน้าบิล: ต้องอัปเดต State ตารางบิลทันทีโดยไม่ต้อง Refresh หน้าจอ
5. Type safety: TypeScript build (`npm run lint`) ต้องได้ Exit code 0 ไม่มี error

---

### Task 1: Backend Helpers for Private Slip Storage & Signed URLs

**Files:**
- Modify: `src/backend/data.ts`
- Test: Live Supabase API upload & sign verification test

**Steps:**
- [x] เขียนฟังก์ชัน `getPaymentSlipUrl(path: string): Promise<string>` ใน `src/backend/data.ts` เพื่อสร้าง Signed URL อายุ 3600 วินาที
- [x] เขียนฟังก์ชัน `attachSlipToBill(billId: string, file: File, actorId?: string): Promise<string>` เพื่ออัปโหลดสลิปและอัปเดต `bills.payment_slip_path`
- [x] ตรวจสอบ fallback สำหรับโหมดออฟไลน์ (`!isSupabaseConfigured`) คืนค่า Object URL หรือ base64
- [x] รันการทดสอบฟังก์ชัน `getPaymentSlipUrl` และ `uploadPaymentSlip` ยืนยันว่าสร้างและอ่าน Signed URL ได้จริง (HTTP 200 OK)
- [x] Commit การเปลี่ยนแปลง

---

### Task 2: POS Sales View Payment Slip Upload & Transfer Ref Inputs

**Files:**
- Modify: `src/components/views/POSSalesView.tsx`

**Steps:**
- [x] ใน `POSSalesView.tsx` เพิ่ม State สำหรับเก็บไฟล์สลิป `slipFile: File | null` และ `slipPreviewUrl: string | null`
- [x] ในส่วน `paymentMethod === 'transfer'` (ใต้การ์ด QR โค้ด) เพิ่ม:
  - ช่องกรอก `transferRef` (เลขอ้างอิงโอนเงิน เช่น BCEL One Ref)
  - ช่องเลือกไฟล์แนบสลิป พร้อมไอคอน `<Upload className="w-4 h-4" />`
  - กล่องแสดงรูปตัวอย่างสลิป (Thumbnail Preview) พร้อมปุ่มกากบาทลบรูปออก
- [x] ในฟังก์ชัน `handleProcessSale`:
  - หากมี `slipFile` ให้เรียก `await uploadPaymentSlip(slipFile)` เพื่อนำ path ไปใส่ใน `newBill.paymentSlipPath`
  - หากอัปโหลดล้มเหลว ให้แจ้งเตือนผู้ใช้และไม่ตัดสต็อกผิดพลาด
- [x] เคลียร์ค่า `slipFile` และ `slipPreviewUrl` เมื่อการขายเสร็จสิ้นหรือเมื่อกดรีเซ็ตฟอร์ม
- [x] ทดสอบสร้างบิลผ่าน POS และยืนยันว่า `payment_slip_path` ถูกบันทึกลงในฐานข้อมูล
- [x] Commit การเปลี่ยนแปลง

---

### Task 3: Bills Management View Slip Preview & Post-Sale Slip Attachment

**Files:**
- Modify: `src/components/views/BillsManagementView.tsx`
- Create: `src/components/modals/SlipPreviewModal.tsx`

**Steps:**
- [x] สร้าง Modal `SlipPreviewModal.tsx` สำหรับแสดงรูปสลิปขยายใหญ่ พร้อมรายละเอียดบิล (เลขบิล, ชื่อลูกค้า, วันที่, ยอดเงิน, เลขอ้างอิง) และปุ่ม "เปิดแท็บใหม่ / ดาวน์โหลด"
- [x] ใน `BillsManagementView.tsx`:
  - ในตารางบิล: สำหรับบิลที่มี `paymentSlipPath` ให้แสดง Badge สีเขียว `[ 📄 ສະລິບ ]` คลิกเพื่อเปิด `SlipPreviewModal`
  - สำหรับบิลประเภทโอนเงินที่ยังไม่มีสลิป ให้แสดงปุ่มคลิกแนบสลิปย้อนหลัง (`[ + ແນບສະລິບ ]`)
  - จัดการ State อัปโหลดสลิปย้อนหลังผ่าน `attachSlipToBill` และอัปเดตตารางบิลแบบ Realtime
- [x] ในหน้าต่างพิมพ์บิล (`selectedBillForPrint` Modal): เพิ่มปุ่มหรือรูปตัวอย่างสลิปที่แนบอยู่กับบิล เพื่อให้บัญชีกดตรวจทานได้ทันที
- [x] ตรวจสอบการแสดงผลทั้งภาษาลาว (`lo`) และภาษาไทย/อังกฤษ
- [x] Commit การเปลี่ยนแปลง

---

### Task 4: End-to-End Verification & Type Safety

**Files:**
- Test: Live API upload & signed URL verification test

**Steps:**
- [x] ทดสอบยิงอัปโหลดไฟล์ WebP จริงเข้า Bucket `payment-slips` บน Supabase Singapore ได้ HTTP 200 OK
- [x] ทดสอบสร้าง Signed URL ได้ HTTP 200 OK พร้อม Token หมดอายุ 1 ชั่วโมง
- [x] บันทึกสรุปงานใน `TODO.md`
- [x] Commit และ Push ขึ้นรีโมต
