-- Lock down invites.
--
-- Problem: invites were covered by the generic "same business, full access"
-- policy (invites_all), so ANY member of a business (staff, front desk) could
-- read, insert, update or delete invite rows straight through the REST API.
-- accept_invite copies the invite's role and preset commission into the new
-- profile, so a staff member could insert an invite with role 'owner' (or a
-- 100% commission), accept it with a second account, and escalate to owner.
-- create_invite's owner/manager check never ran because a direct insert skips it.
--
-- Fix:
--   1. Replace invites_all with owner/manager-only policies for every action.
--   2. Table constraints so no invite can ever carry the owner role or a
--      commission outside 0..1, whoever writes it.

drop policy if exists invites_all on public.invites;

create policy invites_select on public.invites for select to authenticated
  using (business_id = public.current_business_id()
         and public.current_role() in ('owner', 'manager'));

-- create_invite is SECURITY INVOKER, so its insert runs through this policy.
create policy invites_insert on public.invites for insert to authenticated
  with check (business_id = public.current_business_id()
              and public.current_role() in ('owner', 'manager'));

-- Owners/managers revoke invites by setting status = 'revoked'.
create policy invites_update on public.invites for update to authenticated
  using (business_id = public.current_business_id()
         and public.current_role() in ('owner', 'manager'))
  with check (business_id = public.current_business_id()
              and public.current_role() in ('owner', 'manager'));

create policy invites_delete on public.invites for delete to authenticated
  using (business_id = public.current_business_id()
         and public.current_role() in ('owner', 'manager'));

-- Defence in depth, enforced for every writer (including SECURITY DEFINER code).
-- NOT VALID: applies to all new/updated rows without failing on any old row.
alter table public.invites
  add constraint invites_role_not_owner
  check (role in ('manager', 'receptionist', 'staff')) not valid;

alter table public.invites
  add constraint invites_commission_range
  check (preset_commission_rate is null
         or (preset_commission_rate >= 0 and preset_commission_rate <= 1)) not valid;
