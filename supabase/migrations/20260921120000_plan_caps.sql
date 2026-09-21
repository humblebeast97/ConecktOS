-- ConecktOS Phase 1: plan staff-cap enforcement.
-- Caps mirror the landing pricing: Starter 3, Studio 12, Chain unlimited (a large
-- sentinel). staff_cap on subscriptions is kept in sync with the plan by a
-- trigger, and create_invite / accept_invite reject once the cap is reached.
-- "Staff" here means non-owner team members (the owner seat is always free).

begin;

create or replace function public.plan_staff_cap(p_plan text)
returns integer language sql immutable as $$
  select case p_plan
    when 'starter' then 3
    when 'studio' then 12
    when 'chain' then 1000000
    else 3
  end;
$$;

-- Keep subscriptions.staff_cap consistent with the plan on every write.
create or replace function public.sync_subscription_staff_cap()
returns trigger language plpgsql as $$
begin
  new.staff_cap := public.plan_staff_cap(new.plan);
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists subscriptions_sync_cap on public.subscriptions;
create trigger subscriptions_sync_cap
  before insert or update on public.subscriptions
  for each row execute function public.sync_subscription_staff_cap();

-- Count of non-owner team members in a business.
create or replace function public.business_staff_count(p_business uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.profiles
  where business_id = p_business and role <> 'owner';
$$;

grant execute on function public.plan_staff_cap(text) to authenticated;
grant execute on function public.business_staff_count(uuid) to authenticated;

-- Backfill: every business needs a subscription; fire the trigger to set caps.
insert into public.subscriptions (business_id, plan)
  select b.id, 'starter' from public.businesses b
  left join public.subscriptions s on s.business_id = b.id
  where s.business_id is null;
update public.subscriptions set plan = plan;

-- create_invite: block generating an invite once the plan's staff cap is hit.
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
  v_cap integer;
  v_code text;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  if public.current_role() not in ('owner', 'manager') then
    raise exception 'Only owners and managers can invite';
  end if;
  if p_role not in ('manager', 'receptionist', 'staff') then
    raise exception 'Invalid role for an invite';
  end if;

  select staff_cap into v_cap from public.subscriptions where business_id = v_business;
  if v_cap is not null and public.business_staff_count(v_business) >= v_cap then
    raise exception 'Staff limit reached for your plan. Upgrade to add more team members.';
  end if;

  v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));

  insert into public.invites (business_id, code, role, preset_commission_rate, email, created_by, expires_at)
  values (v_business, v_code, p_role, p_commission_rate, nullif(btrim(p_email), ''), auth.uid(),
          now() + interval '14 days');

  return v_code;
end $$;

-- accept_invite: authoritative cap check right before the profile is created.
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
  v_cap integer;
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

  select staff_cap into v_cap from public.subscriptions where business_id = v_inv.business_id;
  if v_cap is not null and public.business_staff_count(v_inv.business_id) >= v_cap then
    raise exception 'This business has reached its staff limit. Ask the owner to upgrade the plan.';
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

commit;
