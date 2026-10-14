# ຄູ່ມືການຕິດຕັ້ງ ແລະ Deploy ຜ່ານ Cloudflare Pages ສະບັບລະອຽດ
## CLOUDFLARE PAGES PRODUCTION DEPLOYMENT & EDGE INFRASTRUCTURE SOP
### ໂຄງການ: ລະບົບຄຸ້ມຄອງສູນບໍລິການ ແລະ ໂຊຣູມລົດໄຟຟ້າ AVATR (AvatrAutoService Laos)
**ສະບັບປັບປຸງ:** `v1.4.0 (Enterprise Edition)`  
**ວັນທີ:** 14 ຕຸລາ (October) 2026  
**ສະຖານະ:** ພ້ອມນຳໃຊ້ງານຈິງ (Production Ready)

---

## 1. ບົດສະຫຼຸບພາບລວມ (Executive Overview)

ເອກະສານສະບັບນີ້ຖືກສ້າງຂຶ້ນເພື່ອເປັນ **Standard Operating Procedure (SOP)** ສຳລັບວິສະວະກອນ IT, DevOps, ແລະ ຜູ້ຄຸ້ມຄອງລະບົບຂອງ **ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ (Laothani Tractor Sole Co., Ltd)** ໃນການນຳສົ່ງລະບົບ (Deploy) ເວັບແອັບພລິເຄຊັນ **AvatrAutoService** ຂຶ້ນສູ່ **Cloudflare Pages Global Edge Network** ຢ່າງຖືກຕ້ອງ, ປອດໄພ, ແລະ ສົມບູນ 100%.

```mermaid
flowchart LR
    Dev["💻 Developer / Git Commit"] -->|Push to main| Repo["🐙 GitHub Repository\n(AvatrAutoService)"]
    Repo -->|Webhook Trigger| CFBuild["⚙️ Cloudflare Pages CI/CD\nNode.js 20+ | npm run build"]
    CFBuild -->|Artifact Output| CDN["☁️ Cloudflare Global Edge\n(330+ Cities Worldwide)"]
    CDN -->|SSL/TLS HTTPS| Client["📱 Web Browser / Client\n(avatr-auto-service.pages.dev)"]
    Client -->|Bot Check| Turnstile["🛡️ Cloudflare Turnstile"]
    Client -->|Authenticated API| Supabase["🗄️ Supabase Cloud (PostgreSQL 15+)"]
```

---

## 2. ຕຳແໜ່ງໄຟລ໌ ແລະ Path ສຳຄັນໃນລະບົບ (Repository File Map)

> [!IMPORTANT]
> ຜູ້ໃຊ້ງານ ຫຼື ວິສະວະກອນສາມາດອ້າງອີງ Path ຂອງໄຟລ໌ທີ່ກ່ຽວຂ້ອງກັບການ Deploy ໄດ້ໂດຍກົງຕາມຕາຕະລາງລຸ່ມນີ້:

| ລຳດັບ | ໄຟລ໌ / ໂຟລເດີ (File Path) | ໜ້າທີ່ ແລະ ຄວາມສຳຄັນໃນການ Deploy |
| :---: | :--- | :--- |
| 1 | [`public/_headers`](file:///home/pheuang01/Projects/AvatrAutoService/public/_headers) | **Security Headers:** ບັນຈຸຄ່າ Content-Security-Policy (CSP), HSTS, X-Frame-Options: DENY, Cache-Control ມາດຕະฐาน Cloudflare A+ |
| 2 | [`public/_redirects`](file:///home/pheuang01/Projects/AvatrAutoService/public/_redirects) | **SPA Fallback Routing:** ກຳນົດ `/* /index.html 200` ເພື່ອປ້ອງກັນບໍ່ໃຫ້ເກີດ Error 404 ເມື່ອຜູ້ໃຊ້ Refresh ໜ້າຕ່າງໆ |
| 3 | [`.env.example`](file:///home/pheuang01/Projects/AvatrAutoService/.env.example) | **Env Template:** ແມ່ແບບຕົວແປສະພາບແວດລ້ອມທີ່ຕ້ອງນຳໄປປ້ອນໃນ Cloudflare Pages Settings |
| 4 | [`package.json`](file:///home/pheuang01/Projects/AvatrAutoService/package.json) | **Build & Scripts:** ບັນຈຸຄຳສັ່ງ `npm run build` (`vite build`) ແລະ `npm run lint` (`tsc --noEmit`) |
| 5 | [`vite.config.ts`](file:///home/pheuang01/Projects/AvatrAutoService/vite.config.ts) | **Vite Config:** ໂຄງສ້າງການ Bundle, Chunking ແລະ Static Asset Handling |
| 6 | [`dist/`](file:///home/pheuang01/Projects/AvatrAutoService/dist) | **Output Directory:** ໂຟລເດີຜົນລັບຫຼັງຈາກ Build ທີ່ Cloudflare Pages ຈະດຶງໄປກະຈາຍເທິງ Edge CDN |
| 7 | [`src/backend/client.ts`](file:///home/pheuang01/Projects/AvatrAutoService/src/backend/client.ts) | **Zero-Leak Guard:** ລະບົບກວດສອບຄວາມປອດໄພອັດຕະໂນມັດ ປ້ອງກັນບໍ່ໃຫ້ Service Role Key ຮົ່ວໄຫຼ |
| 8 | [`src/components/common/TurnstileWidget.tsx`](file:///home/pheuang01/Projects/AvatrAutoService/src/components/common/TurnstileWidget.tsx) | **Bot Guard Widget:** ໂມດູນ Cloudflare Turnstile ປ້ອງກັນ Bot ທີ່ໜ້າເຂົ້າສູ່ລະບົບ (Login) |

---

## 3. ສິ່ງທີ່ຕ້ອງກຽມກ່ອນເລີ່ມ Deploy (Prerequisites Checklist)

- [x] **ບັນຊີ Cloudflare:** ມີບັນຊີ [Cloudflare Dashboard](https://dash.cloudflare.com/) ຂອງບໍລິສັດ
- [x] **Git Repository:** Source code ຖືກ Push ຂຶ້ນ GitHub Branch `main` ຮຽບຮ້ອຍແລ້ວ
- [x] **Supabase Project Credentials:**
  - `VITE_SUPABASE_URL` (ຕົວຢ່າງ: `https://xyzcompany.supabase.co`)
  - `VITE_SUPABASE_ANON_KEY` (Public Anon Key ຂຶ້ນຕົ້ນດ້ວຍ `eyJhbGci...`)
- [x] **Cloudflare Turnstile Site Key:**
  - `VITE_TURNSTILE_SITE_KEY` (ສ້າງໄດ້ຟຣີຈາກ Cloudflare Dashboard)

> [!CAUTION]
> **ຂໍ້ຄວນລະວັງລະດັບສູງສຸດ (Zero-Leak Policy):**
> ຫ້າມນຳເອົາ `SUPABASE_SERVICE_ROLE_KEY` ໄປໃສ່ໃນ Environment Variables ຂອງ Cloudflare Pages ເປັນອັນຂາດ! ເພາະ Cloudflare Pages ເປັນ Frontend Client-Side Environment ເຊິ່ງຄ່າຕົວແປ `VITE_*` ຈະຖືກ Bundle ເຂົ້າໃນໄຟລ໌ JavaScript ທີ່ Client ສາມາດເຫັນໄດ້.

---

## 4. ວິທີທີ 1: ການ Deploy ຜ່ານ Cloudflare Dashboard GUI (ແນະນຳສຳລັບ Production)

ວິທີນີ້ເປັນວິທີມາດຕະຖານທີ່ສະດວກທີ່ສຸດ ເພາະ Cloudflare ຈະເຊື່ອມຕໍ່ກັບ Git ແລະ ເຮັດການ Auto-Deploy ທຸກຄັ້ງທີ່ມີການ Commit ໃໝ່.

### ຂັ້ນຕອນທີ 1: ເຂົ້າສູ່ເມນູ Pages
1. ເຂົ້າສູ່ລະບົບທີ່ [https://dash.cloudflare.com/](https://dash.cloudflare.com/)
2. ໃນແຖບເມນູດ້ານຊ້າຍ ໃຫ້ຄລິກທີ່ **Workers & Pages**
3. ເລືອກແຖບ **Overview** ແລ້ວກົດປຸ່ມ **Create application** (ຫຼື **Create**)
4. ເລືອກແຖບ **Pages** ແລ້ວກົດປຸ່ມ **Connect to Git**

```text
[Cloudflare Dashboard]
 └── Workers & Pages
      └── Overview
           └── Create application
                └── Pages
                     └── [Connect to Git]
```

### ຂັ້ນຕອນທີ 2: ເຊື່ອມຕໍ່ GitHub Repository
1. ເລືອກບັນຊີ **GitHub** ທີ່ເກັບ Source Code ຂອງໂຄງການ
2. ຄົ້ນຫາ ແລະ ເລືອກ Repository: `AvatrAutoService`
3. ກົດປຸ່ມ **Begin setup**

### ขັ້ນຕອນທີ 3: ຕັ້ງຄ່າ Build Settings (Build Configuration)
ປ້ອນຂໍ້ມູນການຕັ້ງຄ່າຕາມຄ່າທີ່ກຳນົດໄວ້ດັ່ງນີ້:

| ຊ່ອງຕັ້ງຄ່າ (Configuration Field) | ຄ່າທີ່ຕ້ອງປ້ອນ (Value to Enter) | ຄຳອະທິບາຍ (Description) |
| :--- | :--- | :--- |
| **Project name** | `avatr-auto-service` | ຊື່ໂປຣເຈັກ (ຈະຖືກນຳໄປສ້າງ Subdomain: `.pages.dev`) |
| **Production branch** | `main` | Branch ຫຼັກສຳລັບ Production |
| **Framework preset** | `Vite` | ເລືອກ Preset ເປັນ Vite |
| **Build command** | `npm run build` | ຄຳສັ່ງ Build ມາດຕະຖານຂອງໂຄງການ |
| **Build output directory** | `dist` | ໂຟລເດີທີ່ບັນຈຸໄຟລ໌ Output ຫຼັງ Build |
| **Root directory** | *(ປະວ່າງ ຫຼື ໃສ່ `/`)* | ໂຟລເດີຮາກຂອງໂຄງການ |

### ขັ້ນຕອນທີ 4: ຕັ້ງຄ່າ Environment Variables
ກົດຂະຫຍາຍຫົວຂໍ້ **Environment variables (advanced)** ແລ້ວເພີ່ມຕົວແປດັ່ງນີ້:

```env
NODE_VERSION = 20
VITE_SUPABASE_URL = https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_TURNSTILE_SITE_KEY = 0x4AAAAAAA... (Site Key ຈາກ Cloudflare Turnstile)
VITE_APP_ENV = production
```

> [!TIP]
> ການກຳນົດ `NODE_VERSION = 20` ຫຼື `22` ມີຄວາມສຳຄັນຫຼາຍ ເພື່ອໃຫ້ Cloudflare Pages Runner ໃຊ້ Node.js ເວີຊັນທີ່ຮອງຮັບ Vite 6 ແລະ React 19 ຢ່າງສົມບູນ.

### ขັ້ນຕອນທີ 5: ກົດ Save and Deploy
1. ກວດສອບຄວາມຖືກຕ້ອງແລ້ວກົດປຸ່ມ **Save and Deploy**
2. Cloudflare Pages ຈະເລີ່ມດຳເນີນການ:
   - Cloned repository
   - ຕິດຕັ້ງ dependencies (`npm install`)
   - ຮັນຄຳສັ່ງ Build (`npm run build`)
   - ກະຈາຍໄຟລ໌ຈາກ `dist/` ໄປຍັງ Edge Servers ທົ່ວໂລກ
3. ເມື່ອສຳເລັດ ລະບົບຈະສະແດງຂໍ້ຄວາມ **Success! Your site is deployed!** ພ້ອມລິ້ງ URL ທາງການ:
   👉 **`https://avatr-auto-service.pages.dev`**

---

## 5. ວິທີທີ 2: ການ Deploy ຜ່ານ Wrangler CLI (ສຳລັບ DevOps & Direct Upload)

ຖ້າຕ້ອງການ Deploy ໂດຍກົງຜ່ານ Terminal ໂດຍບໍ່ຕ້ອງຜ່ານ Git Webhook ສາມາດໃຊ້ **Cloudflare Wrangler CLI** ໄດ້ດັ່ງນີ້:

### ຂັ້ນຕອນທີ 1: ທົດສອບ Build ພາຍໃນເຄື່ອງ (Local Build Verification)
ເປີດ Terminal ທີ່ໂຟລເດີໂຄງການ `/home/pheuang01/Projects/AvatrAutoService`:

```bash
# 1. ກວດສອບ Type Safety
npm run lint

# 2. ສ້າງ Production Bundle
npm run build
```

ກວດສອບວ່າໂຟລເດີ [`dist/`](file:///home/pheuang01/Projects/AvatrAutoService/dist) ຖືກສ້າງຂຶ້ນ ແລະ ມີໄຟລ໌ `_headers` ແລະ `_redirects` ຢູ່ພາຍໃນ:

```bash
ls -la dist/
```

### ຂັ້ນຕອນທີ 2: Login ເຂົ້າ Cloudflare ຜ່ານ Wrangler
```bash
npx wrangler login
```
*(ລະບົບຈະເປີດ Browser ຂຶ້ນມາໃຫ້ກົດ Authorize ເພື່ອຢືນຢັນສິດ)*

### ຂັ້ນຕອນທີ 3: ສັ່ງ Deploy ໂຟລເດີ dist
```bash
npx wrangler pages deploy dist --project-name=avatr-auto-service --branch=main
```

ເມື່ອ Deploy ສຳເລັດ Terminal ຈະສະແດງຜົນ URL:
```text
✨ Success! Uploaded 10 files (2.45 sec)
✨ Deployment complete! Take a peek over at https://avatr-auto-service.pages.dev
```

---

## 6. ຂັ້ນຕອນການຕັ້ງຄ່າ Cloudflare Turnstile (Bot Defense Setup)

ເພື່ອໃຫ້ລະບົບປ້ອງກັນ Bot ແລະ Brute-Force Password ໃນໜ້າ Login ເຮັດວຽກໄດ້ຢ່າງສົມບູນ ໃຫ້ຕັ້ງຄ່າດັ່ງນີ້:

```mermaid
sequenceDiagram
    autonumber
    actor Staff as ພະນັກງານ (Staff)
    participant UI as ໜ້າ Login (Avatr Web)
    participant CF as Cloudflare Turnstile API
    participant Supa as Supabase Auth

    Staff->>UI: ເປີດໜ້າ Login
    UI->>CF: ໂຫຼດ Turnstile Widget ດ້ວຍ Site Key
    CF-->>UI: ຢືນຢັນຕົວຕົນ (Token ອັດຕະໂນມັດ ໄຮ້ Captcha ກວນໃຈ)
    Staff->>UI: ປ້ອນ Email & Password + ກົດ ເຂົ້າສູ່ລະບົບ
    UI->>Supa: ສົ່ງ Credentials ພ້ອມກວດສອບ Session
    Supa-->>UI: ອະນຸມັດ JWT Token & Role Permissions
    UI-->>Staff: ເຂົ້າສູ່ລະບົບສຳເລັດ ນຳໄປໜ້າ Dashboard
```

1. ເຂົ້າສູ່ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. ໃນເມນູດ້ານຊ້າຍ ເລືອກ **Turnstile**
3. ກົດປຸ່ມ **Add site** (ຫຼື **Add Widget**)
4. ຕັ້ງຄ່າ Widget:
   - **Site name:** `AvatrAutoService Production`
   - **Domain:**
     - `avatr-auto-service.pages.dev` *(Subdomain ຂອງ Cloudflare Pages)*
     - `localhost` *(ສຳລັບການທົດສອບພາຍໃນເຄື່ອງ Dev)*
     - `127.0.0.1`
   - **Widget Mode:** ເລືອກ **Managed** *(ແນະນຳ - ລະບົບຈະກວດສອບແບບ Interactive ເມື່ອມີພຶດຕິກຳໜ້າສົງໄສ)*
5. ກົດ **Create**
6. ຄັດລອກເອົາ **Site Key** ມາກຳນົດໃສ່ໃນ Cloudflare Pages Environment Variables:
   - Key: `VITE_TURNSTILE_SITE_KEY`
   - Value: `0x4AAAAAAA...`

---

## 7. ລາຍການກວດສອບຫຼັງການ Deploy (Post-Deployment Verification Checklist)

ຫຼັງຈາກການ Deploy ສຳເລັດ ໃຫ້ວິສະວະກອນດຳເນີນການທົດສອບ 5 ຂໍ້ຫຼັກດັ່ງຕໍ່ໄປນີ້:

| ລ/ດ | ລາຍການທົດສອບ (Verification Task) | ວິທີການກວດສອບ (How to Verify) | ຜົນທີ່ຖືກຕ້ອງ (Expected Behavior) | ສະຖານະ |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **ການເຂົ້າເຖິງຜ່ານ HTTPS** | ເປີດ `https://avatr-auto-service.pages.dev` | ເວັບໄຊໂຫຼດຂຶ້ນຢ່າງວ່ອງໄວ ມີກຸນແຈສີຂຽວ SSL/TLS 100% | [ ] ຜ່ານ |
| 2 | **ທົດສອບ SPA Routing & Refresh** | ກົດເຂົ້າໜ້າ `/inventory` ຫຼື `/customers` ແລ້ວກົດ **F5 (Refresh)** | ບໍ່ເກີດ Error 404 (ຍ້ອນມີ `_redirects` ຮອງຮັບ) | [ ] ຜ່ານ |
| 3 | **ທົດສອບ Security Headers** | ເປີດ DevTools (F12) > Network > ເລືອກ `index.html` > ເບິ່ງ Response Headers | ພົບຄ່າ `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` | [ ] ຜ່ານ |
| 4 | **ທົດສອບ Turnstile Bot Guard** | ເບິ່ງໜ້າ Login ພົບ Widget "Cloudflare Turnstile Verified" | ກວດສອບຜ່ານອັດຕະໂນມັດ ປຸ່ມເຂົ້າສູ່ລະບົບພ້ອມກົດ | [ ] ຜ່ານ |
| 5 | **ທົດສອບການດຶງຂໍ້ມູນ Supabase** | ລັອກອິນດ້ວຍບັນຊີພະນັກງານຕົວຈິງ | ດຶງລາຍການລົດ, ລາຍການຂາຍ ແລະ ສະຕັອກຂຶ້ນມາໄດ້ປົກກະຕິ | [ ] ຜ່ານ |

---

## 8. ຄູ່ມືແກ້ໄຂບັນຫາທີ່ພົບເລື້ອຍ (Troubleshooting Guide)

### ບັນຫາທີ 1: Refresh ໜ້າເວັບແລ້ວຂຶ້ນ "Page Not Found" (404 Error)
- **ສາເຫດ:** Single Page Application (SPA) ຕ້ອງການໃຫ້ Server ສົ່ງທຸກ Route ກັບມາຍັງ `index.html`
- **ວິທີແກ້ໄຂ:**
  1. ກວດສອບໄຟລ໌ [`public/_redirects`](file:///home/pheuang01/Projects/AvatrAutoService/public/_redirects) ວ່າຕ້ອງມີຂໍ້ຄວາມ:
     ```text
     /* /index.html 200
     ```
  2. ໝັ້ນໃຈວ່າຕອນ Build ໄຟລ໌ນີ້ຖືກ Copy ໄປໄວ້ໃນ `dist/_redirects`

### ບັນຫາທີ 2: Cloudflare Build ລົ້ມເຫຼວ (Build Failure / Node Mismatch)
- **ສາເຫດ:** Cloudflare Pages ຄ່າ Default ບາງຄັ້ງໃຊ້ Node.js ເວີຊັນເກົ່າ
- **ວິທີແກ້ໄຂ:**
  1. ເຂົ້າໄປທີ່ **Settings** > **Environment variables** ຂອງ Pages Project
  2. ເພີ່ມຕົວແປ: `NODE_VERSION` = `20`
  3. ກົດ **Retry deployment**

### ບັນຫາທີ 3: Turnstile ຂຶ້ນຂໍ້ຄວາມ "Domain not allowed"
- **ສາເຫດ:** ໂດເມນທີ່ເຂົ້າໃຊ້ງານຍັງບໍ່ໄດ້ຮັບການອະນຸຍາດໃນ Turnstile Config
- **ວິທີແກ້ໄຂ:**
  1. ເຂົ້າ Cloudflare Dashboard > **Turnstile** > ເລືອກ Widget
  2. ກົດ **Settings** ແລ້ວເພີ່ມໂດເມນ `avatr-auto-service.pages.dev` ເຂົ້າໃນລາຍການ **Domains**
  3. ກົດ **Save**

### ບັນຫາທີ 4: ຂໍ້ມູນບໍ່ໂຫຼດ ຫຼື ຂຶ້ນ Network Error ເວລາຮຽກ Supabase
- **ສາເຫດ:** ຕົວແປ `VITE_SUPABASE_URL` ຫຼື `VITE_SUPABASE_ANON_KEY` ບໍ່ຖືກຕ້ອງ ຫຼື ມີຊ່ອງວ່າງ (White-space) ຕິດມາ
- **ວິທີແກ້ໄຂ:**
  1. ກວດສອບຕົວແປໃນ **Cloudflare Pages Settings > Environment variables**
  2. ປຽບທຽບຄ່າກັບ [`.env.example`](file:///home/pheuang01/Projects/AvatrAutoService/.env.example) ໃຫ້ຖືກຕ້ອງຕົງກັນທຸກຕົວອັກສອນ
  3. ຫຼັງແກ້ໄຂ Environment Variables ແລ້ວ ຕ້ອງກົດ **Create new deployment** ທຸກຄັ້ງ ເພື່ອໃຫ້ Vite Re-bundle ຄ່າໃໝ່
