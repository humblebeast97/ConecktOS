-- Payout/salary privacy for profiles.
--
-- Problem: the profiles_select RLS policy lets any member of a business read
-- EVERY column of every peer's profile, including bank_name, account_number,
-- account_name, base_salary and the salary_* fields. RLS is row-level, so it
-- cannot hide individual columns. A staff member could therefore read a
-- colleague's bank NUBAN and salary straight from the REST API.
--
-- Fix, in two parts:
--   1. Revoke column-level SELECT on the sensitive columns from `authenticated`,
--      so nobody can read them off the base table directly (closes the API leak
--      for owners/managers/self too -- they now read them through the view).
--   2. Expose a SECURITY DEFINER view `profiles_secure` that returns every
--      profile column but NULLs the sensitive ones unless the caller is the row
--      owner or an owner/manager of the same business. The app reads profiles
--      through this view.
--
-- The view must be SECURITY DEFINER: a security_invoker view would run under the
-- caller's (revoked) column privileges and fail. Because it bypasses RLS it
-- re-applies the same row scope the base policy uses (same business, or self).
-- Writes still go to the base table (its UPDATE/DELETE policies are unchanged
-- and already restrict to self or owner/manager); the client updates never
-- request a representation, so the SELECT revoke does not affect them.

-- 1. Lock the sensitive columns on the base table. Non-sensitive columns stay
--    directly readable (still row-scoped by the existing profiles_select policy),
--    which keeps helper reads and PostgREST introspection working.
revoke select on public.profiles from authenticated;
grant select (
  id,
  business_id,
  full_name,
  role,
  job_title,
  commission_rate,
  avatar_url,
  prefs
) on public.profiles to authenticated;

-- 2. Masking view. Payout/salary fields are visible only to the row owner or an
--    owner/manager in the same business; everyone else sees NULL for them.
drop view if exists public.profiles_secure;
create view public.profiles_secure
with (security_invoker = false) as
select
  p.id,
  p.business_id,
  p.full_name,
  p.role,
  p.job_title,
  p.commission_rate,
  case when c.see_payout then p.base_salary end          as base_salary,
  case when c.see_payout then p.salary_payday end        as salary_payday,
  case when c.see_payout then p.salary_last_paid_at end  as salary_last_paid_at,
  case when c.see_payout then p.bank_name end            as bank_name,
  case when c.see_payout then p.account_number end       as account_number,
  case when c.see_payout then p.account_name end         as account_name,
  p.avatar_url,
  p.prefs
from public.profiles p
cross join lateral (
  select (
    p.id = auth.uid()
    or (
      p.business_id = public.current_business_id()
      and public.current_role() in ('owner', 'manager')
    )
  ) as see_payout
) c
-- Same row scope the base RLS policy grants, re-applied here because a
-- SECURITY DEFINER view bypasses RLS.
where p.business_id = public.current_business_id()
   or p.id = auth.uid();

grant select on public.profiles_secure to authenticated;
