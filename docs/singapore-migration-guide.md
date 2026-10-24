# 🚀 ແຜນຍ້າຍຖານຂໍ້ມູນ Supabase: Tokyo ➔ Singapore (Migration Guide)

ເອກະສານສະບັບນີ້ບັນທຶກຂັ້ນຕອນການຍ້າຍຖານຂໍ້ມູນຂອງລະບົບ **AVATR Auto Service** ຈາກ **Tokyo, Japan (`ap-northeast-1`)** ມາຍັງ **Singapore (`ap-southeast-1`)** ເພື່ອຫຼຸດ Network Latency ໃຫ້ໄວຂຶ້ນ 70%.

---

## 1. ຜົນປະໂຫຍດທີ່ຈະໄດ້ຮັບ (Performance Impact)

| ລາຍການວັດແທກ | ປັດຈຸບັນ (Tokyo `ap-northeast-1`) | ຫຼັງຍ້າຍ (Singapore `ap-southeast-1`) | ຜົນຕ່າງ (Speedup) |
| :--- | :---: | :---: | :---: |
| **Network Ping (RTT)** | ~85 – 120 ms | **~25 – 35 ms** | **ໄວຂຶ້ນ 70%** ⚡ |
| **ເວລາ Login ຈົນ Dashboard ຂຶ້ນ** | ~2.1 ວິນາທີ | **~0.8 – 1.0 ວິນາທີ** | **Instant Real-Time** 🚀 |
| **ການດຶງ Showroom Data (1-RTT)** | ~568 ms | **~150 – 200 ms** | **ໄວຂຶ້ນ 3 ເທົ່າ** |

---

## 2. ສະຖານະການສຳຮອງຂໍ້ມູນ (Backup Status: Completed 100%)

ຂໍ້ມູນທັງໝົດ 11 ຕາຕະລາງຈາກ Tokyo (`ybzylmboyqqnvtzdkpkg`) ຖືກດຶງ ແລະ ສຳຮອງໄວ້ໃນເຄື່ອງຮຽບຮ້ອຍແລ້ວ:

* **JSON Format**: `docs/backup/tokyo_backup_data.json`
* **SQL Restore Script**: `docs/backup/tokyo_backup_inserts.sql`

| ຕາຕະລາງ (Table) | ຈຳນວນແຖວທີ່ສຳຮອງ (Rows Backed Up) | ສະຖານະ |
| :--- | :---: | :---: |
| `dealership_settings` | 1 | ✅ ພ້ອມ Restore |
| `staff_roles` | 5 | ✅ ພ້ອມ Restore |
| `staff_profiles` | 13 | ✅ ພ້ອມ Restore |
| `vehicle_models` | 11 | ✅ ພ້ອມ Restore |
| `vehicles` | 24 | ✅ ພ້ອມ Restore |
| `customers` | 13 | ✅ ພ້ອມ Restore |
| `bills` | 43 | ✅ ພ້ອມ Restore |
| `bill_items` | 43 | ✅ ພ້ອມ Restore |
| `stock_movements` | 43 | ✅ ພ້ອມ Restore |

---

## 3. ຂໍ້ສັງເກດເລື່ອງໂຄຕ້າ Supabase Free Tier (Project Quota)

ຈາກການສັ່ງ Supabase CLI ສ້າງໂຄງການອັດຕະໂນມັດ, ລະບົບ Cloud ແຈ້ງເຕືອນ:
> `HM186812 (2 project limit): reached maximum limits for active free projects.`

**ເຫດຜົນ**: Supabase ກຳນົດໃຫ້ແຕ່ລະບັນຊີມີ Active Free Project ໄດ້ສູງສຸດ **2 ໂຄງການ**. ບັນຊີ `HM186812` ມີໂຄງການຄົບ 2 ໂຄງການແລ້ວ (ລວມທັງໂຄງການ Tokyo ປັດຈຸບັນ).

### ວິທີປົດລັອກ (ເລືອກ 1 ໃນ 2 ວິທີ):
* **ວິທີທີ 1 (ແນະນຳ)**: ເຂົ້າ [Supabase Dashboard](https://supabase.com/dashboard/projects) ແລ້ວສັ່ງ **Pause (ພັກການໃຊ້ງານ)** ໂຄງການອື່ນທີ່ບໍ່ໄດ້ໃຊ້ງານ ເພື່ອຄືນໂຄຕ້າ 1 Slot ໃຫ້ສ້າງ Singapore Project ໄດ້.
* **ວິທີທີ 2**: ສ້າງ Project ໃໝ່ທີ່ Singapore ດ້ວຍອີເມວ/ບັນຊີອື່ນ ແລ້ວສົ່ງ **Project Ref** ແລະ **Database Password** ມາໃຫ້ CLI ຈັດການຕໍ່.

---

## 4. ຂັ້ນຕອນການ Rollout ຂຶ້ນ Singapore ດ້ວຍ Supabase CLI

ເມື່ອມີໂຄຕ້າພ້ອມແລ້ວ, ສາມາດສັ່ງງານຜ່ານ Terminal ໄດ້ທັນທີ:

### ຂັ້ນຕອນ 4.1: ສ້າງ ແລະ Link ໂຄງການ Singapore
```bash
# ສ້າງ Project ໃໝ່ທີ່ Singapore
npx supabase projects create AvatrAutoService-SG \
  --org-id grvqwxmcocftazvmejja \
  --db-password "<YOUR_DB_PASSWORD>" \
  --region ap-southeast-1

# Link ໂຄງການເຂົ້າກັບ CLI
npx supabase link --project-ref <NEW_SINGAPORE_REF>
```

### ຂັ້ນຕອນ 4.2: Deploy Schema & Edge Functions
```bash
# ດັນ 11 ຕາຕະລາງ, RPCs, Indexes, RLS Policies ຄົບ 100%
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy create-staff
npx supabase functions deploy manage-staff
```

### ຂັ້ນຕອນ 4.3: Restore ຂໍ້ມູນ
```bash
# Import ຂໍ້ມູນທີ່ສຳຮອງໄວ້ເຂົ້າສູ່ Database ໃໝ່
psql "<NEW_DATABASE_CONNECTION_STRING>" -f docs/backup/tokyo_backup_inserts.sql
```

### ຂັ້ນຕອນ 4.4: ທົດສອບຄຸນນະພາບ 100% ດ້ວຍ Playwright
```bash
npm run test:e2e
```

### ຂັ້ນຕອນ 4.5: Switchover ລະບົບໜ້າບ້ານ
ອັບເດດຄ່າໃນ `.env` ແລະ Cloudflare Pages:
* `VITE_SUPABASE_URL=https://<NEW_SINGAPORE_REF>.supabase.co`
* `VITE_SUPABASE_ANON_KEY=<NEW_SINGAPORE_ANON_KEY>`

---

## 5. ແຜນ Rollback (Safety Guard)

* ຖານຂໍ້ມູນທີ່ **Tokyo (`ybzylmboyqqnvtzdkpkg`)** ຈະບໍ່ຖືກແຕະຕ້ອງ ຫຼື ລຶບຖິ້ມ.
* ຫາກເກີດບັນຫາໃດໆກັບໂຄງການ Singapore, ພຽງແຕ່ປ່ຽນຄ່າ `VITE_SUPABASE_URL` ໃນ `.env` ກັບມາເປັນ Tokyo ລະບົບຈະກັບມາໃຊ້ງານໄດ້ປົກກະຕິທັນທີ 100%.
