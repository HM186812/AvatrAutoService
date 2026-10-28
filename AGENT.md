# 🤖 AGENT.md: คู่มือและกฎเหล็กสำหรับ AI Agent ประจำระบบ Avatr Auto Service

> **อัปเดตล่าสุด**: 2026-10-28 14:40 (+07:00)  
> **สถานะระบบ**: Production Ready บน Cloudflare Workers + Supabase Singapore (งาน 84 ข้อ เสร็จแล้ว 78 ข้อ, พักรอข้อมูลจริง 2 ข้อ, Backlog Phase 2 รอทำ 4 ข้อ)

---

## ⚡ 1. กฎเหล็กและคำสั่งบังคับสำหรับ AI Agent ทุกตัว (Mandatory Protocols)

เมื่อเริ่มทำงานใน Repository นี้ AI Agent ทุกตัวต้องเปิดใช้งานโหมดและปฏิบัติตาม 4 คำสั่งนี้อย่างเคร่งครัด:

1. **`/caveman` (Terse & High Technical Substance)**:
   - ตอบตรงประเด็น สั้น กระชับ สไตล์ Caveman วิศวกรอาวุโส (Answer first, then reason, then next step)
   - ตัดคำทักทาย คำอวย และบทนำเยิ่นเย้อออกทั้งหมด (No greetings, no fluff, no ceremony)
   - ข้อมูลเชิงเทคนิค, ชื่อไฟล์, โค้ด, คำสั่ง และพารามิเตอร์ ต้องคงไว้อย่างสมบูรณ์และถูกต้อง 100%

2. **`/ponytail` (Lazy Senior Dev Mode)**:
   - โค้ดที่ดีที่สุดคือโค้ดที่ไม่ต้องเขียน (Smallest working diff wins)
   - ห้ามสร้าง Abstraction, Wrapper, Config หรือ Boilerplate เกินจำเป็น
   - ก่อนแก้โค้ด ต้อง Grep ดู Caller ทุกจุด และปิดท้ายคำตอบด้วย 1-2 บรรทัดเสมอ:
     - *สิ่งที่ข้าม/ยังไม่ได้ตรวจ (What was skipped)*
     - *ความเสี่ยงที่ผู้ใช้ต้องทราบ (Known risks)*

3. **`/using-superpowers` (Skill-First Workflow)**:
   - เรียกใช้ Skill ที่ตรงกับงานก่อนลงมือเสมอ (เช่น `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `code-review-and-quality`)
   - ต้องรันคำสั่งทดสอบจริงและยืนยันผลลัพธ์ด้วยหลักฐาน (Evidence before assertion) ก่อนประกาศว่างานเสร็จสิ้นเสมอ

4. **`/grill-me` (Interactive Design & Requirement Interview)**:
   - ก่อนเริ่มลงมือทำฟีเจอร์ใหญ่ งานใหม่ หรือมีทางแยกในการตัดสินใจ ให้สัมภาษณ์ผู้ใช้เพื่อ Align ความต้องการทีละคำถาม (One question at a time) พร้อมเสนอคำแนะนำที่เหมาะสมที่สุด (Recommended option) จนกว่าจะได้ข้อสรุปสถาปัตยกรรมที่ชัดเจนก่อนแตะต้องโค้ด

---

## 🏗️ 2. สถาปัตยกรรมระบบและสภาพแวดล้อมจริง (System Architecture)

- **Frontend Framework**: React 19 + TypeScript 5.8 + Vite 8 (Port 3000 สำหรับ local dev)
- **Styling**: Tailwind CSS v4 + Lucide Icons + Motion (Framer Motion)
- **Deployment Platform**: Cloudflare Workers Static Assets (`wrangler.jsonc`)
  - **Production URL**: `https://avatrautoservice.pheuangkeokisith.workers.dev`
- **Backend & Database**: Supabase Hosted Cloud (Singapore Region)
  - **Project Ref**: `ivybsqtzrfwdamibbumc`
  - **Endpoint**: `https://ivybsqtzrfwdamibbumc.supabase.co`
- **Security & Bot Defense**: Cloudflare Turnstile ในหน้า Sign In / Sign Up
- **Testing**: Playwright E2E Test Suite (รองรับ Node.js v22.17.1)

---

## 🚫 3. ข้อห้ามเด็ดขาดและข้อควรระวังพิเศษ (Critical Constraints)

1. **ห้ามสร้างไฟล์ `public/_redirects` เด็ดขาด**:
   - Cloudflare Workers Static Assets ใช้การตั้งค่า `"not_found_handling": "single-page-application"` ใน `wrangler.jsonc` อยู่แล้ว
   - การมีไฟล์ `_redirects` จะทำให้เกิด **Cloudflare Error 100324 (Infinite Loop)** ทันทีที่ Deploy

2. **การเปลี่ยนชื่อเว็บ/โดเมนในอนาคต (Supabase Auth Open-Redirect Guard)**:
   - โค้ดหน้าเว็บใช้ `window.location.origin` แบบ Dynamic อยู่แล้ว
   - **แต่ฝั่ง Supabase Auth**: หากเปลี่ยนโดเมนใหม่ (เช่น Custom Domain `https://avatr.la`) **ต้องนำโดเมนใหม่ไปเพิ่มใน `additional_redirect_urls` ของ Supabase Auth เสมอ** มิฉะนั้น Supabase จะปฏิเสธและเด้งผู้ใช้กลับไป `site_url` เดิม

3. **Node 22 ESM Loader ใน Playwright**:
   - ใน `e2e/helpers/auth.ts` ต้องใช้ `createRequire(import.meta.url)('@supabase/supabase-js')` เพื่อป้องกัน Node 22 loader crash (`Unexpected module status 3`)

4. **การรัน Supabase Config Push**:
   - ห้ามรัน `supabase config push` โดยไม่อ่าน diff ก่อน
   - ให้รัน `supabase config pull --force` เพื่อซิงค์ค่าล่าสุดจาก Cloud เข้ามาก่อนเสมอ แล้วแก้เฉพาะฟิลด์ที่ต้องการ ตรวจสอบด้วย `supabase config diff` แล้วจึง push

---

## 📋 4. สรุปสถานะงาน (Task Status Overview)

| หมวดหมู่ | ข้อที่ | สถานะ | รายละเอียด |
| :--- | :---: | :---: | :--- |
| **Phase 1: Stability & Security** | 1-74 | ✅ เสร็จสิ้น (100%) | แก้บั๊กลูกค้าบนบิล, Storage Buckets, ลบรถ, Security Definer RLS, POS |
| **Phase 1.5: Urgent DB & Environment** | 79 | ✅ เสร็จสิ้น | RLS 8 Policies บน `service_appointments` และ `test_drives` |
| | 80 | ✅ เสร็จสิ้น | ทำความสะอาดโมเดลรถซ้ำซ้อนใน `vehicle_models` เหลือ 4 รุ่นมาตรฐาน |
| | 81 | ⏸️ พักไว้ | เชื่อมโยง VIN/Warranty ให้ลูกค้าเก่า (รอข้อมูลลูกค้าจริง) |
| | 82 | ⏸️ พักไว้ | ปรับระเบียบบัญชี Sales (รอข้อมูลพนักงานจริง) |
| | 83 | ✅ เสร็จสิ้น | แก้ Playwright Node 22 CJS/ESM Circular loader crash |
| | 84 | ✅ เสร็จสิ้น | แก้ Supabase Auth Email Confirmation Redirect ไป localhost:3000 |
| **Phase 2: CRM & Operations** | 75-78 | ⏳ รอเริ่ม | Staff Offboarding, Floor CRM, Top Sales Ranking, Showroom Board |

---

## 🛠️ 5. คำสั่งที่ใช้บ่อยสำหรับการตรวจสอบ (Verification Commands)

```powershell
# 1. ตรวจสอบ Type Safety
npm run lint

# 2. คอมไพล์โปรเจกต์
npm run build

# 3. รัน Auth E2E Smoke Tests
npx playwright test e2e/auth.spec.ts

# 4. ตรวจสอบความสอดคล้องของคอนฟิก Supabase
npx supabase config diff
```
