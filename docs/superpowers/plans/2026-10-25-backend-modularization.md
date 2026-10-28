# Backend Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แตกไฟล์ยักษ์ `src/backend/data.ts` (~1,780 บรรทัด) ออกเป็น Domain Modules ย่อย โดยรักษา 100% Backwards Compatibility ผ่าน Barrel Export ไม่กระทบ Callers ทั้ง 10 จุด

**Architecture:** แยกเป็น Domain Services ภายใน `src/backend/services/` โดย `src/backend/data.ts` จะทำหน้าที่เป็น Barrel Re-export เพื่อให้ทุก View/Component ที่เรียกใช้เดิมไม่ต้องแก้ไข Import path และระบบยังผ่าน Build + E2E Tests 100%

**Tech Stack:** TypeScript, Supabase JS Client, Vitest/Playwright

**Spec:** `docs/architecture.md`

## Global Constraints
- ห้ามแก้ Import paths ใน 10 ไฟล์ที่เรียกใช้ `backend/data` ให้ใช้ Barrel Export จาก `src/backend/data.ts`
- ห้ามเปลี่ยน Type signatures หรือ Function contracts เดิม
- ทุกโมดูลต้อง compile ผ่าน (`npm run build` code 0)
- E2E Tests ทั้งหมด (`e2e/full-system-audit.spec.ts`) ต้องผ่าน 100%

---

## File Structure & Module Decomposition

```
src/backend/
├── client.ts             (เดิม: จัดการ Supabase Connection & Security check)
├── ids.ts                (เดิม: UUID generator)
├── offlineStore.ts       (เดิม: LocalStorage offline cache)
├── offlineSync.ts        (เดิม: Offline sync queue)
├── services/             (ใหม่: แยกตามโดเมนธุรกิจ)
│   ├── types.ts          (ประเภทข้อมูลเฉพาะ Backend / DbRow mappers)
│   ├── auth.ts           (เข้าสู่ระบบ, สร้าง staff, จัดการสิทธิ์)
│   ├── showroom.ts       (1-RTT initial data loader)
│   ├── sales.ts          (บันทึกบิล, ค้นหาบิลตามช่วงวัน, ยกเลิกบิล)
│   ├── customers.ts      (CRM Leads, ข้อมูลลูกค้า, ค่างวด)
│   ├── inventory.ts      (รถยนต์, สต็อก, โมเดลรถ)
│   ├── aftersales.ts     (การนัดหมายบริการ, นัดทดลองขับ)
│   └── storage.ts        (อัปโหลดรูปรถ, สลิปการโอนเงิน)
└── data.ts               (ใหม่: Barrel File รวม re-export ทุกฟังก์ชัน)
```

---

## Tasks

- [ ] **Task 1: สร้าง `src/backend/services/types.ts` และ Helper Mappers**
  - ย้าย `DbRow`, `mapStaffProfile`, `clearStaffCache` ออกมาเป็นโมดูลกลาง
  - รัน `npm run build` เพื่อตรวจ syntax

- [ ] **Task 2: สกัด `src/backend/services/auth.ts`**
  - ฟังก์ชัน: `getSignedInStaff`, `signInStaff`, `signUpStaff`, `createStaffAccount`, `saveStaffProfile`, `deactivateStaffProfile`, `reactivateStaffProfile`, `deleteStaffProfile`
  - Re-export ผ่าน `src/backend/data.ts`
  - ตรวจสอบ `npm run build`

- [ ] **Task 3: สกัด `src/backend/services/showroom.ts` & `src/backend/services/storage.ts`**
  - ฟังก์ชัน: `loadBackendData`, `uploadDealershipAsset`, `removeDealershipAsset`, `uploadPaymentSlip`
  - Re-export ผ่าน `src/backend/data.ts`

- [ ] **Task 4: สกัด `src/backend/services/sales.ts` & `src/backend/services/customers.ts`**
  - ฟังก์ชัน Sales: `saveBillRecord`, `fetchBillsByDateRange`, `deleteBill`
  - ฟังก์ชัน CRM: `saveLead`, `fetchLeadsByDateRange`, `updateLeadStatus`, `deleteLead`
  - Re-export ผ่าน `src/backend/data.ts`

- [ ] **Task 5: สกัด `src/backend/services/inventory.ts` & `src/backend/services/aftersales.ts`**
  - ฟังก์ชัน Inventory: `saveInventoryItem`, `deleteInventoryItem`, `saveVehicleModel`, `deleteVehicleModel`
  - ฟังก์ชัน Aftersales: `saveServiceAppointment`, `updateServiceAppointment`, `saveTestDriveBooking`, `updateTestDriveBooking`
  - Re-export ผ่าน `src/backend/data.ts`

- [ ] **Task 6: Verification & E2E Validation**
  - รัน `npm run build` ตรวจสอบ chunk sizes และ typecheck
  - รัน `npx playwright test e2e/full-system-audit.spec.ts` เพื่อรับประกันว่าไม่มีการถดถอย
