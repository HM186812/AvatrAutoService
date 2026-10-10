-- =============================================================
-- DRAFT migration: L1 (missing delete_vehicle_bill) + helper queries for L2
-- REVIEW BEFORE RUNNING. Run in Supabase SQL Editor.
-- I could not read the original function (anon/app roles can't see pg_proc),
-- so the behaviour below is inferred from how the app uses it.
-- =============================================================

-- ---------- L1: delete_vehicle_bill ----------
-- Behaviour:
--   * only an active super_admin may call it (matches the app's check)
--   * sale bill   -> the vehicle goes back to 'ready'
--   * import bill -> the vehicle is removed if no other bill references it
--   * removes the bill, its items and its stock movements
create or replace function public.delete_vehicle_bill(p_bill_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_vins text[];
begin
  if not exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and role = 'super_admin' and status = 'active'
  ) then
    raise exception 'Only an active super admin can delete bills.';
  end if;

  select type into v_type from public.bills where id = p_bill_id;
  if not found then
    raise exception 'Bill not found.';
  end if;

  select array_agg(vehicle_vin) into v_vins from public.bill_items where bill_id = p_bill_id;

  if v_type = 'sale' then
    update public.vehicles set status = 'ready', updated_at = now()
    where vin = any(v_vins) and status = 'sold';
  end if;

  delete from public.stock_movements where bill_id = p_bill_id;
  delete from public.bill_items where bill_id = p_bill_id;
  delete from public.bills where id = p_bill_id;

  if v_type = 'import' then
    delete from public.vehicles v
    where v.vin = any(v_vins)
      and not exists (select 1 from public.bill_items bi where bi.vehicle_vin = v.vin);
  end if;
end;
$$;

revoke all on function public.delete_vehicle_bill(uuid) from public, anon;
grant execute on function public.delete_vehicle_bill(uuid) to authenticated;

-- ---------- L2: see which DELETE policies exist (read-only) ----------
-- Run this and send me the result. I will write the exact policies after seeing it.
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
