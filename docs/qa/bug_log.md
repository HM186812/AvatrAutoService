# Bug log – AvatrAutoService (data persistence audit)

Method: static code audit (read-only). `tsc --noEmit` passes with no type errors.
Not yet done: live click-through test (needs a staff login + reachable Supabase). Items marked "verify" need confirming live.

## Critical

### B1. `supabase_schema.sql` does not match the code
The code (`src/backend/data.ts`) reads and writes tables and RPCs that are **not** in `supabase_schema.sql`:
- Tables: `vehicles`, `customers`, `bill_items`, `stock_movements`, `staff_profiles`, `staff_roles`, `service_appointments`, `test_drives`, `dealership_settings`
- RPCs: `record_vehicle_bill`, `delete_vehicle_bill`
- Edge functions: `create-staff`, `manage-staff`
- Storage buckets: `dealership-assets`, `payment-slips` (the schema file creates `avatr-assets`)

The schema file still defines the old tables `inventory`, `bills`, `users`, `dealership_config`, which the code no longer uses.
Column names differ too (e.g. `vehicle_models.price_usd` in SQL vs `price_starting_usd` in code).
There is no `supabase/migrations` folder in the repo.
**Live check (read-only, anon key, 2026-10-10):** the live DB has the NEW tables (`vehicle_models`, `vehicles`, `customers`, `bills`, `bill_items`, `staff_profiles`, `dealership_settings`, plus `stock_movements`, `staff_roles`, `service_appointments`, `test_drives`, which anon cannot read). The OLD tables (`inventory`, `users`, `dealership_config`) do **not** exist.
**Effect:** the DB is fine, but `supabase_schema.sql` is stale and misleading. It can't rebuild the DB and should be replaced by real migrations. Not yet verified: columns, the RPCs and edge functions (they need a login).

### B2. Insecure old RLS policies in the schema file
The `USING (true)` policies on every table let any anon key read and write everything. Don't run this file on production.

## High

### B3. Test-drive and web-inquiry forms can lose data silently
- `handleSubmitWebInquiry` (App.tsx ~L541) calls `handleAddLead` without `await`/`rethrow`, so a save failure may only appear as a toast.
- `handleAddTestDrive` hard-codes `budget: '$45,000'` for new leads from test-drive bookings. This is fake data saved to the DB.
- `handleAddTestDrive` saves the lead first and the booking second. If the booking fails, the orphan lead stays (no rollback).

### B4. Writes are optimistic, with no rollback on failure
`setLeadsAndPersist`, `setVehiclesAndPersist`, and `setInventoryAndPersist` update the UI first and save in the background.
- Leads and vehicle models: if the save fails, the UI shows the data but the DB doesn't have it, and it disappears on refresh. There is no reload or rollback.
- Inventory and bills do reload on error.

### B5. Edit/update paths are not wired up
`updateServiceAppointment` and `updateTestDriveBooking` exist in `data.ts` but nothing calls them.
`AppointmentsView` only shows a status badge. Service and test-drive records can be created but not edited or have their status changed (verify in the UI).

## Medium

### B6. Settings stored in `localStorage` only
`src/data/companySettings.ts` (bank info) and `src/data/currencies.ts` (currencies) use `localStorage`.
They are per-browser and are not shared across devices or users. POSSalesView saves some settings to the DB, so storage is inconsistent.
Check which one is the source of truth (verify).

### B7. Sold-stock quantity is derived, not stored
`mapInventoryItem` sets `stockQuantity = status === 'sold' ? 0 : 1`.
Any quantity a user enters in the stock-in form is ignored and not saved (verify in StockInView).

### B8. Fields in the UI types with no DB column or mapping
- Bill: `quantity` is always 1 on load.
- Service: `customer_id` is only linked if the phone number matches an existing customer.
- Lead `assignedTo` is saved by staff ID, but the name is looked up from `staff_profiles`. If the user can't read that table (RLS), the name shows blank.
- `vehicle_models` has no `stock_count`, `power`, or `charging` columns in code.

### B9. Weak ID/date handling
- Bill `date` is cut to 10 chars (`slice(0,10)`), so the time part is lost.
- Lead IDs are regenerated when they don't look like a UUID, so a non-UUID ID changes after a save.

## Next steps
1. Confirm the real Supabase schema (dashboard → Table Editor, or share the migration SQL).
2. Live test each form: Lead, Test Drive, Service, Stock-In, POS Sale, Vehicle edit, Model add, User add, QR upload, Currency/Package settings.
3. Fix in order: B1 → B3/B4 → B5 → B6/B7.

---

# Live test results (2026-10-10, account test01@gmail.com, super_admin)

Method: a script (scratch/e2e2.mjs) calls Supabase with the same tables/RPCs/payloads as `src/backend/data.ts`, then reads each row back and compares every field. It is **not** a browser click-through, so UI validation and display are untested.

## Works (17 checks passed)
Lead save/edit · vehicle model save · vehicle save · stock-in bill (RPC) · sale bill (RPC, marks vehicle `sold`, creates stock movement) · service appointment insert/update · test drive insert/update · dealership settings patch · image upload (`dealership-assets`) · payment slip upload (`payment-slips`). Every field I sent was read back unchanged.

## New bugs found by live test

### L1 (High). `delete_vehicle_bill` RPC does not exist
`deleteBill()` calls `rpc('delete_vehicle_bill', { p_bill_id })` and the DB answers `PGRST202 function not found`. Deleting a bill in the app will fail. (`record_vehicle_bill` exists.)

### L2 (High). DELETE is silently blocked by RLS
As super_admin, deleting from `customers`, `vehicle_models`, `test_drives` and `service_appointments` returns **no error and 0 rows deleted**. So the app can't remove those records, and any code that assumes a delete worked is wrong. `vehicles` delete only works if no bill_items reference it (FK `bill_items_vehicle_vin_fkey`). That affects the rollback in `handleRecordStockIn`, which deletes the vehicle when saving the bill fails.

### L3 (High). Duplicate phone breaks sales, test drives and service bookings
`customers.phone` has no unique constraint, but `findCustomerId` uses `.maybeSingle()`. With 2+ customers on the same phone it throws `PGRST116 (multiple rows)`. Then `saveBillRecord` (sale), `saveTestDriveBooking` and `saveServiceAppointment` all fail for that phone. Reproduced: 3 rows on one phone, lookup errors.

### L4 (Low). Lead date fields come back in a different format
`last_follow_up` and `next_test_drive_at` are timestamptz. Sent `2026-10-12 10:00`, got `2026-10-12T10:00:00+00:00`. Time is stored as UTC with no timezone, so local display may shift. Check how the UI shows it.

### L5 (Low). Own staff profile has empty name
`staff_profiles.name = ''` for test01 (app shows email as fallback). `manage-staff` edge function returned non-2xx when I updated my own profile (not investigated; check function logs).

## Corrections to the earlier audit
- B1: the DB is fine (new tables exist, RPC `record_vehicle_bill` works). Only `supabase_schema.sql` is stale.
- B5 stands (update functions unused), but the DB side of update works.
- `service_appointments.status` allows only `pending|in_progress|inspection_done|completed`; `vehicles.vin` must be exactly 17 chars (CHECK). The app's types match.

## Not tested
`create-staff` edge function (it creates real auth users) · UI forms and validation · POS flow through the UI · Realtime.

## Test data left behind
The app role can't delete it (L2). Run [cleanup_test_data.sql](file:///home/pheuang01/.gemini/antigravity-cli/brain/4d42caac-97f6-47d9-b614-02947cfb8d2e/cleanup_test_data.sql) in the Supabase SQL Editor. Settings were restored to the original (backup in scratch/settings_backup2.json).

## Correction (B6 / task D) – verified by the user against the local code
POSSalesView already reads and writes `dealership_settings` in Supabase (my live test confirmed the patch persists). The `localStorage` helpers in `src/data/companySettings.ts` and `src/data/currencies.ts` are **not called** by the app. B6 is therefore **dead code, not a data-loss bug**. Downgrade to Low: delete the unused helpers when convenient. Task D is no longer needed as a migration.

---

# Status update (2026-10-10 19:10)

## Verified in the DB (script, not browser)
- **C (status change) persists.** The exact payloads of `updateServiceAppointment` and `updateTestDriveBooking` were run against the live DB with row counts and readback. Service: pending → in_progress → inspection_done → completed. Test drive: confirmed → pending → cancelled → completed. Every update touched 1 row and read back correctly. (Earlier round only checked "no error" for test drives; now confirmed with row count.)
- `handleChangeServiceStatus` / `handleChangeTestDriveStatus` save first and update the screen after, so a failed save is not shown as saved. `tsc --noEmit` passes.

## F resolved
- **L5 is not a bug.** `manage-staff` returned `"You cannot change or suspend your own account here."` – an intentional guard. Staff must be edited by another admin.
- **L4 is low impact.** `testDriveDate` is never displayed. `lastFollowUp` is real UTC (`toISOString`), so storing it as timestamptz is consistent and it is not shown either. The only display is `createdAt.slice(0, 10)` in CustomerView (line 462): it shows the UTC date, so a customer created between 00:00 and 07:00 Laos time shows the previous day. Fix only if that matters.

## Still open
- Browser click-through (UI validation, display) – not done.
- DB work for the user: cleanup SQL, L1 `delete_vehicle_bill`, `pg_policies` output for L2.
- Compare the real schema before writing migrations (B1/B2).
- Test rows left behind (my TEST-/TEST2- rows) until the cleanup SQL is run. I changed the status of one TEST test drive and one TEST service row during this check; they are covered by the cleanup SQL.
