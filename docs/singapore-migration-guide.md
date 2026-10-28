# 🚀 ແຜນຍ້າຍຖານຂໍ້ມູນ Supabase: Tokyo ➔ Singapore (Migration Guide)

ເອກະສານສະບັບນີ້ບັນທຶກຂັ້ນຕອນ ແລະ ຜົນການຍ້າຍຖານຂໍ້ມູນຂອງລະບົບ **AVATR Auto Service** ຈາກ **Tokyo, Japan (`ap-northeast-1`)** ມາຍັງ **Singapore (`ap-southeast-1`)** ເພື່ອແກ້ໄຂບັນຫາ Network Latency ແລະ ເລັ່ງຄວາມໄວລະບົບໃຫ້ຕອບສະໜອງແບບ Real-Time.

---

## 1. ຜົນການທົດສອບຄວາມໄວຕົວຈິງ (Live Speed Benchmark)

ການທົດສອບ Login ດ້ວຍບັນຊີ Admin **`test01@gmail.com`** (Password: `123456`):

| ລາຍການວັດແທກ | Tokyo ເດີມ (ກ່ອນແກ້) | Tokyo (ຫຼັງແກ້ Bloat) | **Singapore ໃໝ່ (`ivybsqtzrfwdamibbumc`)** | ຜົນຮັບ |
| :--- | :---: | :---: | :---: | :---: |
| **Network Ping (RTT)** | ~85 – 120 ms | ~85 – 120 ms | **~25 – 35 ms** | 🌐 **ຕອບສະໜອງໄວຂຶ້ນ 3 ເທົ່າ** |
| **Login Session (`signInWithPassword`)** | ~17.0 ວິນາທີ | 2.11 ວິນາທີ | **1.14 ວິນາທີ** | ⚡ **ໄວກວ່າເດີມ 15 ເທົ່າ** |
| **ດຶງຂໍ້ມູນທັງລະບົບ (`get_showroom_initial_data` RPC)** | 16,245 ms (16.2s) | 568 ms | **342 ms** | 🚀 **ໄວກວ່າເດີມ 47 ເທົ່າ** |

---

## 2. ຂໍ້ມູນໂຄງການ Singapore ທີ່ຖືກສ້າງຂຶ້ນ (Target Instance Info)

* **Supabase Project Name**: `AvatrAutoService-SG`
* **Project Ref**: `ivybsqtzrfwdamibbumc`
* **Region**: **`ap-southeast-1` (Singapore)**
* **Owner Account**: `pheuanggeogisid@gmail.com`
* **Organization ID**: `egmrsctqcsvfupufwsdz` ("Avatr-Singapore")
* **Project URL**: `https://ivybsqtzrfwdamibbumc.supabase.co`
* **Public Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2eWJzcXR6cmZ3ZGFtaWJidW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTU5NTAsImV4cCI6MjEwODM5MTk1MH0.iz7kRSsD4DQ4_P0cG2QYM8bjyOhGfSRllE3QyntOnn0`

---

## 3. ສະຫຼຸບການຍ້າຍຂໍ້ມູນ (Zero Data Loss Verification - 100%)

ຂໍ້ມູນທັງໝົດຖືກ Replicate ຈາກ Tokyo ມາຍັງ Singapore ໂດຍບໍ່ມີຂໍ້ມູນຕົກຫຼົ່ນ:

| ຕາຕະລາງ / Object | ຈຳນວນແຖວ (Rows) | ສະຖານະໃນ Singapore | ໝາຍເຫດ |
| :--- | :---: | :---: | :--- |
| `auth.users` | 16 | ✅ ຄົບ 100% | ໃຊ້ Password Bcrypt Hash ເດີມ (ເຂົ້າລະບົບໄດ້ທັນທີ ບໍ່ຕ້ອງ Reset) |
| `auth.identities` | 16 | ✅ ຄົບ 100% | Auth identities provider email ຄົບຖ້ວນ |
| `dealership_settings` | 1 | ✅ ຄົບ 100% | ອັບເດດ URL QR Code ມາທີ່ Singapore Storage ແລ້ວ |
| `staff_roles` | 5 | ✅ ຄົບ 100% | super_admin, admin, sales, technician, general_user |
| `staff_profiles` | 16 | ✅ ຄົບ 100% | ຕຳແໜ່ງ, ພະແນກ, ເບີໂທ, ຊື່ ແລະ ສິດຄົບ 100% |
| `vehicle_models` | 11 | ✅ ຄົບ 100% | ລຸ້ນລົດ AVATR 12, 11, 07 ແລະ ລຸ້ນ Custom ທັງໝົດ |
| `vehicles` | 24 | ✅ ຄົບ 100% | ສະຕ໋ອກລົດພ້ອມຂາຍ, ລໍຖ້າ PDI ແລະ Event ທັງໝົດ |
| `customers` | 13 | ✅ ຄົບ 100% | ລູກຄ້າ CRM ແລະ ປະຫວັດການຕິດຕໍ່ |
| `bills` | 43 | ✅ ຄົບ 100% | ໃບບິນຂາຍ ແລະ ໃບຮັບລົດເຂົ້າ (GRN) |
| `bill_items` | 43 | ✅ ຄົບ 100% | ລາຍການຍ່ອຍໃນໃບບິນແຕ່ລະສະບັບ |
| `stock_movements` | 43 | ✅ ຄົບ 100% | ປະຫວັດການເຄື່ອນໄຫວສິນຄ້າ stock_in / stock_out |
| **Storage: `dealership-assets`** | 1 | ✅ ຄົບ 100% | ຮູບ QR Code ຮັບເງິນຂອງຮ້ານ (`qr/...`) |
| **Edge Functions** | 2 | ✅ ຄົບ 100% | `create-staff` ແລະ `manage-staff` deployed |
| **RLS Security Policies** | 34 | ✅ ຄົບ 100% | Row Level Security ຄົບທຸກຕາຕະລາງ |

---

## 4. ຜົນການທົດສອບຄຸນນະພາບລະບົບ (E2E Automated Testing Suite)

ຜ່ານການທົດສອບອັດຕະໂນມັດຜ່ານ Playwright 100% ກັບ Database Singapore:

* ✅ **`e2e/auth.spec.ts`**: 3/3 passed (Login ຖືກຕ້ອງ, ແຈ້ງເຕືອນເມື່ອລະຫັດຜິດ, Logout ສຳເລັດ)
* ✅ **`e2e/bills.spec.ts`**: 2/2 passed (ສະແດງລາຍການບິນ, ເປີດໃບຮັບເງິນ)
* ✅ **`e2e/crm.spec.ts`**: 2/2 passed (ຄົ້ນຫາ, Filter, ເພີ່ມ Lead ລູກຄ້າໃໝ່)
* ✅ **`e2e/stock.spec.ts`**: 2/2 passed (Stock-in ລົດໃໝ່ພ້ອມອອກໃບຮັບ GRN ແບບ Dual Save)
* ✅ **`e2e/pos.spec.ts`**: 2/2 passed (ຂາຍລົດຜ່ານລະບົບ POS ແລະ ຕັດສະຕ໋ອກ)
* ✅ **`e2e/theme-lang.spec.ts`**: 2/2 passed (ປ່ຽນພາສາ ລາວ/ໄທ/Eng ແລະ Dark/Light Mode)
* ✅ **`e2e/storage-and-void-bill.spec.ts`**: 2/2 passed (ບີບອັດຮູບພາບ WebP ແລະ ຍົກເລີກບິນ)
* ✅ **`e2e/test-account-creation.spec.ts`**: 4/4 passed (Public Sign-Up ແລະ Admin Edge Function ສ້າງພະນັກງານໃໝ່)

---

## 5. ວິທີ Switch ລະບົບໜ້າເວັບໄປຫາ Singapore

ພຽງແຕ່ປັບຄ່າຕົວແປສະພາບແວດລ້ອມ (Environment Variables):

```bash
# ໃນ .env.local ຫຼື Cloudflare Pages Settings -> Environment variables:
VITE_SUPABASE_URL="https://ivybsqtzrfwdamibbumc.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2eWJzcXR6cmZ3ZGFtaWJidW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTU5NTAsImV4cCI6MjEwODM5MTk1MH0.iz7kRSsD4DQ4_P0cG2QYM8bjyOhGfSRllE3QyntOnn0"
```

---

## 6. ແຜນ Rollback (Safety Guard)

* ຖານຂໍ້ມູນທີ່ **Tokyo (`ybzylmboyqqnvtzdkpkg`)** ຍັງຄົງຢູ່ຄົບຖ້ວນ 100% ບໍ່ມີການແຕະຕ້ອງ ຫຼື ລຶບຖິ້ມ.
* ຫາກຕ້ອງການກັບໄປ Tokyo ໃນອະນາຄົດ, ພຽງແຕ່ປ່ຽນຄ່າ `VITE_SUPABASE_URL` ກັບມາເປັນ Tokyo ລະບົບກໍຈະເຮັດວຽກໄດ້ທັນທີໂດຍບໍ່ມີຜົນກະທົບ.
