-- Invites count toward the plan's staff cap.
--
-- Before: create_invite only counted existing (non-owner) members, so a
-- Starter business at 2/3 could mint unlimited invite links; the extra people
-- only hit "staff limit reached" when they tried to join. And since invites
-- can be inserted directly by owners/managers (invites_insert policy), a direct
-- insert skipped create_invite's check entirely.
--
-- Now:
--   * A seat is used by every non-owner member AND every pending, unexpired
--     invite. No invite can be created once seats used >= the plan cap.
--   * Enforced in a BEFORE INSERT trigger on invites, so it holds for
--     create_invite and for any direct insert alike.
--   * accept_invite locks the business's subscription row before its (still
--     authoritative) member-count check, so two people accepting at the same
--     moment can't both slip past the cap.

begin;

-- Non-owner members + pending, unexpired invites.
create or replace function public.business_seats_used(p_business uuid)
returns integer language sql stable security definer set search_path = public as $$
  select public.business_staff_count(p_business)
       + (select count(*)::int from public.invites
          where business_id = p_business
            and status = 'pending'
            and (expires_at is null or expires_at > now()));
$$;

grant execute on function public.business_seats_used(uuid) to authenticated;

create or replace function public.enforce_invite_plan_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cap integer;
begin
  -- Serialise invite creation per business so parallel requests can't overshoot.
  select staff_cap into v_cap from public.subscriptions
    where business_id = new.business_id
    for update;
  if v_cap is not null and public.business_seats_used(new.business_id) >= v_cap then
    raise exception 'Staff limit reached for your plan (% seats, counting pending invites). Revoke an unused invite or upgrade to add more.', v_cap;
  end if;
  return new;
end $$;

drop trigger if exists invites_plan_cap on public.invites;
create trigger invites_plan_cap
  before insert on public.invites
  for each row execute function public.enforce_invite_plan_cap();

-- accept_invite: same logic as before, plus a row lock on the subscription so
-- concurrent accepts are checked one at a time.
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

  select staff_cap into v_cap from public.subscriptions
    where business_id = v_inv.business_id
    for update;
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
