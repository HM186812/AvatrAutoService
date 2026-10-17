# AVATR Auto Service CRM & Showroom Management System

A modern, high-performance Dealership CRM, POS, and Auto Service Management System designed specifically for AVATR electric vehicles and automotive showrooms in Laos. Fully powered by **Supabase Cloud (PostgreSQL)** with zero-leak security architecture.

---

## 🚀 Key Features

- **🚗 Showroom & Model Catalog**: Dynamic vehicle showcase (AVATR 11, AVATR 12, AVATR 07) with color customization, detailed specs, and cloud real-time updates.
- **💼 POS & Sales Management**: Streamlined billing, package addons, stock deduction, and real-time exchange rate calculation (LAK, USD, THB, CNY).
- **💳 Company QR Code Payment**: Admin uploaded official BCEL OnePay QR code directly stored on Supabase Storage with instant customer display.
- **📦 Inbound Stock-In & Inventory**: Batch receiving with custom chassis/engine VIN numbers, color selection, purchase pricing, and supplier records.
- **🛡️ Strict Role-Based Access Control (RBAC)**:
  - `admin`: Full system control, role permissions, custom vehicle models, QR code upload, bill deletions.
  - `sales`: POS, customer quote generation, vehicle catalog.
- **⚡ Supabase Cloud & Real-Time Sync**:
  - **PostgreSQL Database**: Real-time cloud synchronization for inventory, bills, vehicle models, settings, and users.
  - **Supabase Realtime**: Instant multi-device state updates via WebSockets.
  - **Supabase Storage**: Secure cloud storage for company payment assets & BCEL QR images (`avatr-assets` bucket).
  - **Supabase Authentication**: Email & password / Phone login with JWT sessions and role assignment.
  - **Offline LocalStorage Fallback**: 100% functional even when offline or without cloud connection.

---

## 🔒 Security Architecture & Zero-Leak Protection (ລະບົບຄວາມປອດໄພ)

1. **Client-Side Key Protection (ການປ້ອງກັນ Key ຫຼຸດ/ຮົ່ວໄຫຼ)**:
   - **No Secret Key in Frontend**: Web browsers exclusively receive the public `anon` key.
   - **Active Safeguard Validator**: The application automatically inspects credentials and will immediately **halt initialization** if a `service_role` (secret) key is mistakenly placed in `.env`, preventing accidental master key leakage to the web bundle or client network traffic.
   - **Airtight `.gitignore`**: All environment files (`.env`, `.env.local`, `.env.*.local`), certificates, credentials, and service accounts are excluded from version control.

2. **Row-Level Security (RLS) & Data Leak Prevention (ປ້ອງກັນຂໍ້ມູນຮົ່ວໄຫຼ)**:
   - **Customer Financial & Invoice Protection**: The `bills` table is strictly protected by RLS. Anonymous / public users cannot query or access any customer names, national ID cards, phone numbers, or invoice amounts.
   - **Tamper-Proof QR Code & Bank Accounts**: Only authenticated `super_admin` accounts have permission to update `dealership_config` (BCEL QR image and company bank accounts), preventing unauthorized bank diversion.
   - **Anti-Tamper User Roles**: Regular users cannot escalate their own privileges or promote themselves to `super_admin`.
   - **Storage Object Protection**: Unauthenticated users cannot upload or delete files in the `avatr-assets` storage bucket.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend & Cloud**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage, Realtime Subscriptions)
- **Local Persistence**: LocalStorage Cache & Offline Resilience

---

## 💻 Getting Started Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 18+)
- [Git](https://git-scm.com/)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/HM186812/AvatrAutoService.git

# Enter project directory
cd AvatrAutoService

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` or `.env.local` file in the root directory (based on `.env.example`):
```env
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
# ⚠️ Use your PUBLIC 'anon' key only. NEVER use your service_role key here!
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

### 4. Database Setup
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Copy and paste the entire contents of `supabase_schema.sql` and click **Run**.
   - This creates tables, RLS security policies, triggers, and the `avatr-assets` storage bucket.

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
