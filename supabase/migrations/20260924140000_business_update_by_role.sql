-- Let owners and managers of a business update its settings.
--
-- Problem: businesses_update only allowed the single user in businesses.owner_id.
-- Any other owner-role account (and every manager, whom Settings lets edit the
-- business) had their update match zero rows. PostgREST reports that as success,
-- so saves such as the map geofence silently did nothing.
--
-- Fix: authorise by role within the caller's own business, the same way the
-- rest of the schema does.

drop policy if exists businesses_update on public.businesses;

create policy businesses_update on public.businesses for update to authenticated
  using (
    owner_id = auth.uid()
    or (id = public.current_business_id() and public.current_role() in ('owner', 'manager'))
  )
  with check (
    owner_id = auth.uid()
    or (id = public.current_business_id() and public.current_role() in ('owner', 'manager'))
  );

-- Nobody may reassign the business's owner through the API: grant UPDATE on
-- every column except owner_id (and the immutable id / created_at).
revoke update on public.businesses from authenticated;
grant update (
  name, business_type, latitude, longitude, address_label,
  geofence_radius_meters, currency, open_time, close_time, payroll_reminder_days
) on public.businesses to authenticated;
