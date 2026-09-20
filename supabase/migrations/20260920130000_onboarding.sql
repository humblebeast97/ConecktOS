-- ConecktOS Phase 1: onboarding (owner bootstrap + staff invites).
-- These let a business be created from the UI and staff join via invite codes,
-- replacing the SQL-seeding used during early testing.

begin;

-- Create a business and the owner profile for the current auth user. Used right
-- after sign-up / first sign-in when the user has no profile yet. SECURITY
-- INVOKER: the RLS insert policies already allow a user to insert their own
-- business (owner_id = auth.uid()) and their own profile (id = auth.uid()).
create or replace function public.create_owner_business(
  p_business_name text,
  p_owner_name text
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bid uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'You already belong to a business';
  end if;

  insert into public.businesses (name, owner_id)
  values (coalesce(nullif(btrim(p_business_name), ''), 'My Business'), v_uid)
  returning id into v_bid;

  insert into public.profiles (id, business_id, full_name, role)
  values (v_uid, v_bid, coalesce(nullif(btrim(p_owner_name), ''), 'Owner'), 'owner');

  insert into public.subscriptions (business_id) values (v_bid)
  on conflict (business_id) do nothing;

  return v_bid;
end $$;

-- Owner/manager creates an invite for a new team member. Returns the invite code.
create or replace function public.create_invite(
  p_role text,
  p_commission_rate numeric,
  p_email text
) returns text
language plpgsql security invoker
set search_path = public
as $$
declare
  v_business uuid := public.current_business_id();
  v_code text;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  if public.current_role() not in ('owner', 'manager') then
    raise exception 'Only owners and managers can invite';
  end if;
  if p_role not in ('manager', 'receptionist', 'staff') then
    raise exception 'Invalid role for an invite';
  end if;

  v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));

  insert into public.invites (business_id, code, role, preset_commission_rate, email, created_by, expires_at)
  values (v_business, v_code, p_role, p_commission_rate, nullif(btrim(p_email), ''), auth.uid(),
          now() + interval '14 days');

  return v_code;
end $$;

-- A freshly signed-up auth user accepts an invite and gets their profile.
-- SECURITY DEFINER: the caller has no business yet (current_business_id() is
-- null), so the target business is derived from the validated invite. Guards
-- ensure the caller is authenticated and not already onboarded.
create or replace function public.accept_invite(
  p_code text,
  p_full_name text,
  p_job_title text,
  p_bank_name text,
  p_account_number text,
  p_account_name text
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invites;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'You already belong to a business';
  end if;

  select * into v_inv from public.invites
    where code = upper(btrim(p_code)) and status = 'pending';
  if v_inv.id is null then raise exception 'Invalid or already used invite code'; end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    update public.invites set status = 'expired' where id = v_inv.id;
    raise exception 'This invite code has expired';
  end if;

  insert into public.profiles (
    id, business_id, full_name, role, job_title, commission_rate,
    bank_name, account_number, account_name
  ) values (
    v_uid, v_inv.business_id, coalesce(nullif(btrim(p_full_name), ''), 'Team member'),
    v_inv.role, nullif(btrim(p_job_title), ''),
    coalesce(v_inv.preset_commission_rate, case when v_inv.role = 'staff' then 0.5 else 0 end),
    nullif(btrim(p_bank_name), ''), nullif(btrim(p_account_number), ''), nullif(btrim(p_account_name), '')
  );

  update public.invites
    set status = 'accepted', accepted_by = v_uid
    where id = v_inv.id;

  return v_uid;
end $$;

grant execute on function public.create_owner_business(text, text) to authenticated;
grant execute on function public.create_invite(text, numeric, text) to authenticated;
grant execute on function public.accept_invite(text, text, text, text, text, text) to authenticated;

commit;
