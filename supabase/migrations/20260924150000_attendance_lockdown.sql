-- Make geofenced attendance tamper-proof.
--
-- Found in testing (all through the REST API with a staff account):
--   1. Staff could flip their own off-site clock-in to on-site
--      (PATCH attendance set is_within_geofence = true). attendance was under
--      the generic "same business, full access" policy, so any member could
--      insert, edit or delete any attendance row in the business.
--   2. clock_in trusted the client's p_staff_id, so a staff member could clock
--      in on behalf of a colleague (buddy punching).
--   3. clock_in allowed stacking: clocking in again while a shift was open.
--
-- Fix:
--   * clock_in is the only way to create attendance. It is SECURITY DEFINER,
--     clocks in the caller only, and refuses while the caller has an open shift.
--   * Direct writes: members may only set clock_out_time, only on their own
--     rows. Location, geofence result, clock-in time and status are read-only.
--   * Owners/managers may delete rows (reset_business_data relies on this).

begin;

drop policy if exists attendance_all on public.attendance;

create policy attendance_select on public.attendance for select to authenticated
  using (business_id = public.current_business_id());

-- No insert policy: rows are created only by clock_in (SECURITY DEFINER).

create policy attendance_update_own on public.attendance for update to authenticated
  using (business_id = public.current_business_id() and staff_id = auth.uid())
  with check (business_id = public.current_business_id() and staff_id = auth.uid());

create policy attendance_delete on public.attendance for delete to authenticated
  using (business_id = public.current_business_id()
         and public.current_role() in ('owner', 'manager'));

revoke insert, update, delete on public.attendance from authenticated;
grant update (clock_out_time) on public.attendance to authenticated;
grant delete on public.attendance to authenticated;

create or replace function public.clock_in(
  p_staff_id uuid,
  p_lat double precision,
  p_lng double precision
) returns public.attendance
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business uuid := public.current_business_id();
  v_lat double precision;
  v_lng double precision;
  v_radius numeric;
  v_open text;
  v_dist double precision;
  v_within boolean;
  v_late boolean;
  v_row public.attendance;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_business is null then raise exception 'No business for the current user'; end if;
  -- p_staff_id is kept for API compatibility but must be the caller.
  if p_staff_id is distinct from v_uid then
    raise exception 'You can only clock in as yourself';
  end if;
  if exists (
    select 1 from public.attendance
    where staff_id = v_uid and clock_out_time is null
  ) then
    raise exception 'You are already clocked in. Clock out first.';
  end if;

  select latitude, longitude, geofence_radius_meters, open_time
    into v_lat, v_lng, v_radius, v_open
    from public.businesses where id = v_business;

  if p_lat is null or p_lng is null then
    v_dist := null;
    v_within := false;
  else
    v_dist := public.haversine_meters(p_lat, p_lng, v_lat, v_lng);
    v_within := v_dist <= v_radius;
  end if;

  v_late := (now() at time zone 'Africa/Lagos')::time > coalesce(v_open, '08:00')::time;

  insert into public.attendance (
    business_id, staff_id, clock_in_time, clock_in_lat, clock_in_lng, is_within_geofence, status
  ) values (
    v_business, v_uid, now(), p_lat, p_lng, v_within,
    case when v_late then 'late' else 'on_time' end
  ) returning * into v_row;

  return v_row;
end $$;

grant execute on function public.clock_in(uuid, double precision, double precision) to authenticated;

commit;
