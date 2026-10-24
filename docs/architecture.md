# 🏛️ AVATR Auto Service — Production Architecture Specification

## 1. High-Level System Architecture

```mermaid
graph TD
    Client["Client Web App (React 19 + Vite)"]
    Turnstile["Cloudflare Turnstile (Bot Protection)"]
    Store["useAppStore & Offline Mutation Queue"]
    
    subgraph "Edge & CDN (Cloudflare)"
        CFPages["Cloudflare Pages (Global CDN & SSL)"]
    end

    subgraph "Supabase Cloud Platform (Region: ap-southeast-1)"
        Auth["Supabase Auth (GoTrue)"]
        EdgeFn["Deno Edge Functions (create-staff, manage-staff)"]
        Storage["Supabase Storage (dealership-assets, avatr-assets, payment-slips)"]
        
        subgraph "PostgreSQL 15+ Core Engine"
            Trigger["Auth Trigger (handle_new_auth_user)"]
            InitRPC["1-RTT Init RPC (get_showroom_initial_data)"]
            RLSHelpers["STABLE Security Definer Helpers (is_admin, is_super_admin)"]
            Tables["Core Tables (vehicles, bills, customers, staff_profiles, stock_movements)"]
            Indexes["Optimized B-Tree Indexes (created_at DESC, FK Embeddings)"]
        end
    end

    Client -->|Static Assets| CFPages
    Client -->|Bot Token| Turnstile
    Client -->|Local State & Offline Queue| Store
    Client -->|Authentication| Auth
    Client -->|Admin RPC / Invocation| EdgeFn
    Client -->|Direct Assets / Slips| Storage
    Client -->|1-RTT Init Query| InitRPC
    Client -->|PostgREST FK Queries| Tables

    Auth -->|AFTER INSERT| Trigger
    Trigger -->|Auto Profile Creation| Tables
    RLSHelpers -->|O(1) Cached Role Check| Tables
    Tables --> Indexes
```

---

## 2. Key Architecture Optimizations

### 2.1 1-RTT Showroom Initialization (`get_showroom_initial_data`)
- **Problem**: Opening the showroom previously fired 6–11 separate HTTP requests across WAN (~200ms RTT per request).
- **Solution**: A PostgreSQL `SECURITY DEFINER` function compiles `models`, `vehicles`, `customers` (limit 250), `roles`, and `settings` into a single JSON payload. Initial load drops from >1.5s to ~250ms.

### 2.2 Bundle Splitting & Lazy-Loaded Modals
- **Problem**: Main bundle was 831 kB because `docx`, pdf generators, and all 5 modals were bundled into the entry chunk.
- **Solution**:
  - `docx` and pdf generators moved to `vendor-pdf` chunk.
  - Modals (`NewLeadModal`, `QuotationModal`, `ServiceModal`, `TestDriveModal`, `VehicleModal`) converted to `React.lazy()` with `<Suspense>`.
  - **Result**: Main bundle shrunk to **215 kB (55 kB gzipped) — a 74% reduction**.

### 2.3 RLS Sequential Scan Elimination (STABLE Security Definer)
- **Problem**: RLS policies executed inline subqueries on `staff_profiles` on every single row check, generating 128,734 sequential scans.
- **Solution**: Introduced `get_current_user_role()`, `is_admin()`, and `is_super_admin()` as `STABLE SECURITY DEFINER` functions with fixed `search_path`. PostgreSQL caches their output for the session transaction, reducing complexity from $O(N \times M)$ to $O(1)$.

### 2.4 Duplicate Indexes Removal & Missing Sort Indexes
- **Problem**: Duplicate B-Tree indexes on 5 foreign keys doubled write overhead. Unindexed `created_at DESC` caused slow in-memory quicksorts.
- **Solution**: Removed duplicate indexes and added missing B-Tree indexes on `vehicles(created_at DESC)`, `customers(created_at DESC)`, `service_appointments(scheduled_date ASC)`, and `test_drives(drive_date ASC)`.

### 2.5 Offline Resilience & Mutation Queue
- **Architecture**: `src/backend/offlineSync.ts` provides a client-side mutation queue persisted in `localStorage`.
- When connectivity drops, mutations (leads, bills, appointments) queue safely.
- On the `online` event, the background worker replays pending mutations with exponential retry backoff.

---

## 3. Storage Optimization & Media Lifecycle Strategy (Phase 2 Roadmap)

การบริหารจัดการพื้นที่ Supabase Storage Bucket (โควตา Free Tier 1 GB = 1,024 MB):

| แผนยุทธศาสตร์ | ปริมาณข้อมูล / คัน | ขีดความสามารถที่รองรับ | อายุการใช้งานบน Free Tier (1 GB) | แนวทางดำเนินการ |
| :--- | :---: | :---: | :---: | :--- |
| **แผนที่ 1: บีบอัด WebP (300 KB/รูป)** | ~1.1 MB (รูปรถ 3 รูป + สลิป 1 รูป) | ~930 คัน | **~4.5 – 5 ปี** ✅ | บีบอัดภาพผ่าน Client Canvas เป็น `.webp` สูงสุด 1200px / 300KB ก่อนส่งขึ้น Cloud ไม่ต้องลบประวัติย้อนหลัง |
| **แผนที่ 2: บีบอัด WebP + ลบสลิปเก่า 90 วัน** | หมุนเวียนสต็อก 30–50 คัน | หมุนเวียนคงที่ | **ไม่มีวันเต็ม (ใช้จริงคงที่ ~150 MB)** 🚀 | ใช้ WebP 300KB ร่วมกับ Retention Policy ล้างภาพสลิปที่บัญชีตรวจและปิดงบไตรมาสเรียบร้อยแล้ว |

> **คำแนะนำเชิงปฏิบัติ**: เริ่มต้นด้วย **แผนที่ 1** ทันทีในระยะสั้นเพื่อหยุดยั้งไฟล์ภาพขนาดใหญ่ (RAW 4K) จากนั้นหากพื้นที่แตะระดับ 500 MB (ประมาณ 2–3 ปีข้างหน้า) ค่อยเปิดใช้ระบบกำจัดสลิปเก่าตาม **แผนที่ 2** โดยไม่ต้องเร่งรีบลบประวัติทางการเงินในช่วงแรก
