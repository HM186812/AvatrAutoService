# AVATR Auto Service CRM & Showroom Management System

A modern, high-performance Dealership CRM, POS, and Auto Service Management System designed specifically for AVATR electric vehicles and automotive showrooms in Laos.

## 🚀 Features

- **🚗 Showroom & Model Catalog**: Dynamic vehicle showcase (AVATR 11, AVATR 12, AVATR 07) with 3D viewing, color customization, and instant specification comparisons.
- **💼 POS & Sales Management**: Streamlined billing, package addons, stock deduction, and real-time exchange rate calculation (LAK, USD, THB, CNY).
- **💳 Company QR Code Payment**: Super Admin uploaded official BCEL OnePay QR code directly stored on Supabase Storage with instant customer display.
- **📦 Inbound Stock-In & Inventory**: Batch receiving with custom chassis/engine VIN numbers, color selection, purchase pricing, and supplier records.
- **🛡️ Strict Role-Based Access Control (RBAC)**:
  - `super_admin`: Full system control, role permissions, custom vehicle models, QR code upload, bill deletions.
  - `admin` / `manager`: Inventory, stock-in, sales and reporting.
  - `sales`: POS, customer quote generation, vehicle catalog.
  - `technician`: Service tracking and inspections.
- **⚡ Supabase Cloud & Real-Time Sync**:
  - **PostgreSQL Database**: Real-time cloud synchronization for inventory, bills, vehicle models, settings, and users.
  - **Supabase Realtime**: Instant multi-device state updates via WebSockets.
  - **Supabase Storage**: Secure cloud storage for company payment assets & BCEL QR images.
  - **Supabase Authentication**: Email & password / Phone login with JWT sessions and role assignment.
  - **Offline LocalStorage Fallback**: 100% functional even when offline or without cloud connection.

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
Create a `.env` or `.env.local` file in the root directory and add your Supabase credentials:
```env
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

### 4. Database Setup (Optional for Cloud Mode)
Run the SQL queries in `supabase_schema.sql` inside your Supabase Dashboard SQL Editor to set up tables, RLS policies, and Storage buckets.

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
