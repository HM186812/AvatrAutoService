-- Cleanup of test rows created by the 2026-10-10 persistence test.
-- Run in Supabase SQL Editor (runs as postgres, bypasses RLS).
-- Only touches rows named TEST-/TEST2-/test-model-/test2-model-. Does NOT touch the older QA / TEST0000... rows.

delete from public.stock_movements where bill_id in (select id from public.bills where bill_number like 'TEST2-%');
delete from public.bill_items      where bill_id in (select id from public.bills where bill_number like 'TEST2-%');
delete from public.bills           where bill_number like 'TEST2-%';
delete from public.vehicles        where vin like 'TEST2%';
delete from public.service_appointments where customer_name in ('TEST-Somchai', 'TEST2-Somchai');
delete from public.test_drives          where customer_name in ('TEST-Somchai', 'TEST2-Somchai');
delete from public.customers            where name in ('TEST-Somchai', 'TEST2-Somchai');
delete from public.vehicle_models       where id like 'test-model-%' or id like 'test2-model-%';
