# AVATR Auto Service CRM & Showroom Management System

A modern, high-performance Dealership CRM, POS, and Auto Service Management System designed specifically for AVATR electric vehicles and automotive showrooms.

## 🚀 Features

- **🚗 Showroom & Model Catalog**: Dynamic vehicle showcase (AVATR 11, AVATR 12, AVATR 07) with 3D viewing, color customization, and instant specification comparisons.
- **💼 POS & Sales Management**: Streamlined billing, package addons, stock deduction, and real-time exchange rate calculation (LAK, USD, THB, CNY).
- **💳 Company QR Code Payment**: Super Admin uploaded official BCEL OnePay QR code directly stored on Cloud Storage with instant customer display.
- **📦 Inbound Stock-In & Inventory**: Batch receiving with custom chassis/engine VIN numbers, color selection, purchase pricing, and supplier records.
- **🛡️ Strict Role-Based Access Control (RBAC)**:
  - `super_admin`: Full system control, role permissions, custom vehicle models, QR code upload, bill deletions.
  - `admin` / `manager`: Inventory, stock-in, sales and reporting.
  - `sales`: POS, customer quote generation, vehicle catalog.
  - `technician`: Service tracking and inspections.
- **🔥 Firebase Cloud Sync (Spark Free Plan)**:
  - **Firestore**: Real-time cloud synchronization for inventory, bills, vehicle models, settings, and users.
  - **IndexedDB Multi-Tab Offline Cache**: Seamless offline resilience with instant sync when connected.
  - **Firebase Storage**: Secure cloud storage for company payment assets.
  - **Firebase Authentication**: Email & password login and role assignment.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend & Cloud**: Google Cloud Firestore, Firebase Auth, Firebase Storage (100% Free Spark Plan)
- **Local Cache**: IndexedDB Multi-Tab Persistence

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
Create a `.env.local` file in the root directory and add your Firebase credentials:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="avatrautoservice.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="avatrautoservice"
VITE_FIREBASE_STORAGE_BUCKET="avatrautoservice.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 📜 License
Private & Proprietary - AVATR Auto Service.

