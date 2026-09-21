-- ConecktOS Phase 1: payroll payment ledger + close-day snapshot.
-- Marking a staff member paid now records an immutable payroll_run + payroll_line
-- + payments row (idempotent per period), while still stamping salary_last_paid_at
-- so the existing paid indicator keeps working. Closing a period freezes its
-- totals into day_closures so later edits cannot change what was closed.
-- (Real disbursement via a gateway lands with the payments slice; these rows are
-- recorded as manual/cash payments for now.)

begin;

create or replace function public.record_payroll_payment(
  p_staff_id uuid,
  p_period_start date,
  p_period_end date,
  p_commission numeric,
  p_base_salary numeric
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare
  v_business uuid := public.current_business_id();
  v_run uuid;
  v_total numeric := coalesce(p_commission, 0) + coalesce(p_base_salary, 0);
  v_payment uuid;
  v_existing uuid;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  if public.current_role() not in ('owner', 'manager') then
    raise exception 'Only owners and managers can run payroll';
  end if;

  select id into v_run from public.payroll_runs
    where business_id = v_business and period_start = p_period_start and period_end = p_period_end
    limit 1;
  if v_run is null then
    insert into public.payroll_runs (business_id, period_start, period_end, status, created_by)
      values (v_business, p_period_start, p_period_end, 'partial', auth.uid())
      returning id into v_run;
  end if;

  -- Idempotent: if this staff is already paid for the run, return that payment.
  select payment_id into v_existing from public.payroll_lines
    where run_id = v_run and staff_id = p_staff_id and status = 'paid';
  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.payments (business_id, kind, staff_id, amount, currency, gateway, status)
    values (v_business, 'payroll', p_staff_id, v_total,
            coalesce((select currency from public.businesses where id = v_business), 'NGN'),
            'manual', 'success')
    returning id into v_payment;

  insert into public.payroll_lines (
    business_id, run_id, staff_id, commission_amount, base_salary, total_amount, status, payment_id
  ) values (
    v_business, v_run, p_staff_id, coalesce(p_commission, 0), coalesce(p_base_salary, 0),
    v_total, 'paid', v_payment
  )
  on conflict (run_id, staff_id) do update
    set commission_amount = excluded.commission_amount,
        base_salary = excluded.base_salary,
        total_amount = excluded.total_amount,
        status = 'paid',
        payment_id = excluded.payment_id;

  update public.profiles set salary_last_paid_at = now()
    where id = p_staff_id and business_id = v_business;

  return v_payment;
end $$;

create or replace function public.close_day(
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_totals jsonb
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare
  v_business uuid := public.current_business_id();
  v_id uuid;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  if public.current_role() <> 'owner' then
    raise exception 'Only the owner can close a period';
  end if;
  insert into public.day_closures (business_id, period_start, period_end, totals, closed_by)
    values (v_business, p_period_start, p_period_end, coalesce(p_totals, '{}'::jsonb), auth.uid())
    returning id into v_id;
  return v_id;
end $$;

grant execute on function public.record_payroll_payment(uuid, date, date, numeric, numeric) to authenticated;
grant execute on function public.close_day(timestamptz, timestamptz, jsonb) to authenticated;

commit;
