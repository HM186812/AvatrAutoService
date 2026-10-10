-- Matches the delete_vehicle_bill function installed in Supabase production.
-- SECURITY DEFINER is required here to delete the related rows across RLS;
-- the function enforces an active super_admin check and is executable only by
-- authenticated users.
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
