-- Lock down the money and operations tables.
--
-- Found in testing (staff account, REST API, no-op writes so no data changed):
-- services, tickets, ticket_items, expenses, payments, payroll_runs,
-- payroll_lines and day_closures were all writable by ANY member of the
-- business through the generic "<table>_all" policy. A staff member could
-- raise their own staff_commission_amount, change ticket totals or service
-- prices, edit expenses and payroll, or rewrite a closed day's snapshot.
-- inventory_items, ticket_inventory_usage and tips had no rows to probe but
-- used the same policy.
--
-- Rules after this migration (FRONT = owner/manager/receptionist,
-- MGMT = owner/manager):
--   * tickets / ticket_items / ticket_inventory_usage: created only by
--     create_ticket (SECURITY DEFINER; FRONT; server computes prices and
--     commission). FRONT may only set status + reference on a ticket, and a
--     paid ticket can no longer change.
--   * expenses: only via add_expense (MGMT) and void_expense (owner or the
--     person who logged it, within 5 minutes), both SECURITY DEFINER.
--   * payments / payroll_runs / payroll_lines / day_closures / tips: written
--     only by record_payroll_payment (MGMT) and close_day (owner). Readable by
--     MGMT; staff can read only their own payments, payroll lines and tips.
--   * services / inventory_items: MGMT may add, edit and remove.
--   * reset_business_data: SECURITY DEFINER, still owner-only.

begin;

-- 1. Drop the generic full-access policies ---------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'services','inventory_items','tickets','ticket_items','ticket_inventory_usage',
    'expenses','payments','payroll_runs','payroll_lines','tips','day_closures'
  ] loop
    execute format('drop policy if exists %1$s_all on public.%1$s;', t);
    execute format('revoke insert, update, delete on public.%1$s from authenticated;', t);
  end loop;
end $$;

-- 2. Read policies ------------------------------------------------------------
-- Operational data the whole team uses.
do $$
declare t text;
begin
  foreach t in array array[
    'services','inventory_items','tickets','ticket_items','ticket_inventory_usage','expenses'
  ] loop
    execute format(
      'create policy %1$s_select on public.%1$s for select to authenticated using (business_id = public.current_business_id());',
      t
    );
  end loop;
end $$;

-- Pay data: management, or the staff member's own rows.
create policy payments_select on public.payments for select to authenticated
  using (business_id = public.current_business_id()
         and (public.current_role() in ('owner','manager') or staff_id = auth.uid()));
create policy payroll_lines_select on public.payroll_lines for select to authenticated
  using (business_id = public.current_business_id()
         and (public.current_role() in ('owner','manager') or staff_id = auth.uid()));
create policy tips_select on public.tips for select to authenticated
  using (business_id = public.current_business_id()
         and (public.current_role() in ('owner','manager') or staff_id = auth.uid()));
create policy payroll_runs_select on public.payroll_runs for select to authenticated
  using (business_id = public.current_business_id()
         and public.current_role() in ('owner','manager'));
create policy day_closures_select on public.day_closures for select to authenticated
  using (business_id = public.current_business_id()
         and public.current_role() in ('owner','manager'));

-- 3. Direct writes that stay allowed ----------------------------------------------
-- Services and inventory: management edits the catalogue and stock.
create policy services_insert on public.services for insert to authenticated
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
create policy services_update on public.services for update to authenticated
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'))
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
create policy services_delete on public.services for delete to authenticated
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
grant insert on public.services to authenticated;
grant update (name, price, duration_minutes, suggested_inventory) on public.services to authenticated;
grant delete on public.services to authenticated;

create policy inventory_items_insert on public.inventory_items for insert to authenticated
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
create policy inventory_items_update on public.inventory_items for update to authenticated
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'))
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
create policy inventory_items_delete on public.inventory_items for delete to authenticated
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
grant insert on public.inventory_items to authenticated;
grant update (item_name, quantity, unit, reorder_level) on public.inventory_items to authenticated;
grant delete on public.inventory_items to authenticated;

-- Tickets: front desk may mark a ticket paid and record the payment reference.
create policy tickets_update on public.tickets for update to authenticated
  using (business_id = public.current_business_id()
         and public.current_role() in ('owner','manager','receptionist'))
  with check (business_id = public.current_business_id()
              and public.current_role() in ('owner','manager','receptionist'));
grant update (status, reference) on public.tickets to authenticated;

-- A paid ticket is final: nothing on it may change afterwards.
create or replace function public.forbid_paid_ticket_change()
returns trigger language plpgsql as $$
begin
  if old.status = 'paid' then
    raise exception 'This ticket is already paid and can no longer be changed';
  end if;
  return new;
end $$;

drop trigger if exists tickets_paid_is_final on public.tickets;
create trigger tickets_paid_is_final
  before update on public.tickets
  for each row execute function public.forbid_paid_ticket_change();

-- 4. Server functions become the only write path -----------------------------------

create or replace function public.create_ticket(
  p_client_name text,
  p_client_phone text,
  p_payment_method text,
  p_status text,
  p_lines jsonb,   -- [{ "service_id": uuid, "staff_id": uuid }]
  p_usage jsonb    -- [{ "inventory_id": uuid, "quantity_used": number }]
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_business uuid := public.current_business_id();
  v_ticket uuid;
  v_line jsonb;
  v_use jsonb;
  v_price numeric;
  v_rate numeric;
  v_qty numeric;
  v_total numeric := 0;
  v_status text := coalesce(p_status, 'pending');
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  if public.current_role() not in ('owner','manager','receptionist') then
    raise exception 'Only the front desk can create tickets';
  end if;
  if v_status not in ('pending','paid') then raise exception 'Invalid ticket status'; end if;
  if jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0 then
    raise exception 'A ticket needs at least one service';
  end if;

  -- Created as pending; the final status is applied once totals are known, so
  -- the "paid tickets are final" trigger never blocks the ticket's own setup.
  insert into public.tickets (
    business_id, client_name, client_phone, total_amount, payment_method, status, created_by
  ) values (
    v_business, coalesce(p_client_name, ''), coalesce(p_client_phone, ''), 0,
    coalesce(p_payment_method, 'pos'), 'pending', auth.uid()
  ) returning id into v_ticket;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    select price into v_price from public.services
      where id = (v_line->>'service_id')::uuid and business_id = v_business;
    if v_price is null then raise exception 'Invalid service for this business'; end if;

    select commission_rate into v_rate from public.profiles
      where id = (v_line->>'staff_id')::uuid and business_id = v_business;
    if not found then raise exception 'Invalid staff member for this business'; end if;

    insert into public.ticket_items (
      business_id, ticket_id, service_id, staff_id, service_price, staff_commission_amount
    ) values (
      v_business, v_ticket, (v_line->>'service_id')::uuid, (v_line->>'staff_id')::uuid,
      v_price, round(v_price * coalesce(v_rate, 0))
    );
    v_total := v_total + v_price;
  end loop;

  for v_use in select * from jsonb_array_elements(coalesce(p_usage, '[]'::jsonb))
  loop
    v_qty := (v_use->>'quantity_used')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'Invalid inventory quantity'; end if;
    if not exists (
      select 1 from public.inventory_items
      where id = (v_use->>'inventory_id')::uuid and business_id = v_business
    ) then
      raise exception 'Invalid inventory item for this business';
    end if;

    insert into public.ticket_inventory_usage (business_id, ticket_id, inventory_id, quantity_used)
      values (v_business, v_ticket, (v_use->>'inventory_id')::uuid, v_qty);
    update public.inventory_items
      set quantity = greatest(0, quantity - v_qty)
      where id = (v_use->>'inventory_id')::uuid and business_id = v_business;
  end loop;

  update public.tickets set total_amount = v_total, status = v_status where id = v_ticket;
  return v_ticket;
end $$;

create or replace function public.add_expense(
  p_category text,
  p_amount numeric,
  p_generator_hours_run numeric,
  p_notes text
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_business uuid := public.current_business_id();
  v_id uuid;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  if public.current_role() not in ('owner','manager') then
    raise exception 'Only owners and managers can log expenses';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_generator_hours_run is not null and p_generator_hours_run < 0 then
    raise exception 'Generator hours cannot be negative';
  end if;
  insert into public.expenses (business_id, category, amount, generator_hours_run, notes, logged_by)
  values (v_business, p_category, p_amount, p_generator_hours_run, coalesce(p_notes, ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.void_expense(p_expense_id uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_business uuid := public.current_business_id();
  v_logged_at timestamptz;
  v_logged_by uuid;
  v_voided_at timestamptz;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  select logged_at, logged_by, voided_at into v_logged_at, v_logged_by, v_voided_at
    from public.expenses where id = p_expense_id and business_id = v_business
    for update;
  if v_logged_at is null then raise exception 'Expense not found'; end if;
  if v_voided_at is not null then raise exception 'Expense already voided'; end if;
  if now() - v_logged_at > interval '5 minutes' then
    raise exception 'The void window for this expense has closed';
  end if;
  if not (public.current_role() = 'owner' or v_logged_by = auth.uid()) then
    raise exception 'You are not allowed to void this expense';
  end if;
  update public.expenses
    set voided_at = now(), voided_by = auth.uid(), void_reason = nullif(btrim(p_reason), '')
    where id = p_expense_id;
end $$;

create or replace function public.add_inventory_item(
  p_item_name text, p_quantity numeric, p_unit text, p_reorder_level numeric
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare v_business uuid := public.current_business_id(); v_id uuid;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  if public.current_role() not in ('owner','manager') then
    raise exception 'Only owners and managers can manage inventory';
  end if;
  insert into public.inventory_items (business_id, item_name, quantity, unit, reorder_level)
  values (v_business, p_item_name, coalesce(p_quantity, 0), coalesce(p_unit, ''), coalesce(p_reorder_level, 0))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.add_service(
  p_name text, p_price numeric, p_duration_minutes integer
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare v_business uuid := public.current_business_id(); v_id uuid;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  if public.current_role() not in ('owner','manager') then
    raise exception 'Only owners and managers can manage services';
  end if;
  insert into public.services (business_id, name, price, duration_minutes)
  values (v_business, p_name, coalesce(p_price, 0), coalesce(p_duration_minutes, 0))
  returning id into v_id;
  return v_id;
end $$;

-- Same logic as before; SECURITY DEFINER because payroll tables are no longer
-- directly writable. The role check inside is the gate.
create or replace function public.record_payroll_payment(
  p_staff_id uuid,
  p_period_start date,
  p_period_end date,
  p_commission numeric,
  p_base_salary numeric
) returns uuid
language plpgsql security definer
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
  if not exists (select 1 from public.profiles where id = p_staff_id and business_id = v_business) then
    raise exception 'Invalid staff member for this business';
  end if;
  if coalesce(p_commission, 0) < 0 or coalesce(p_base_salary, 0) < 0 then
    raise exception 'Payroll amounts cannot be negative';
  end if;

  select id into v_run from public.payroll_runs
    where business_id = v_business and period_start = p_period_start and period_end = p_period_end
    limit 1;
  if v_run is null then
    insert into public.payroll_runs (business_id, period_start, period_end, status, created_by)
      values (v_business, p_period_start, p_period_end, 'partial', auth.uid())
      returning id into v_run;
  end if;

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
language plpgsql security definer
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

create or replace function public.reset_business_data()
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_business uuid := public.current_business_id();
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  if public.current_role() <> 'owner' then raise exception 'Only the owner can reset business data'; end if;
  delete from public.ticket_inventory_usage where business_id = v_business;
  delete from public.ticket_items where business_id = v_business;
  delete from public.tickets where business_id = v_business;
  delete from public.attendance where business_id = v_business;
  delete from public.expenses where business_id = v_business;
  update public.inventory_items set quantity = 0 where business_id = v_business;
end $$;

grant execute on function public.create_ticket(text, text, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.add_expense(text, numeric, numeric, text) to authenticated;
grant execute on function public.void_expense(uuid, text) to authenticated;
grant execute on function public.add_inventory_item(text, numeric, text, numeric) to authenticated;
grant execute on function public.add_service(text, numeric, integer) to authenticated;
grant execute on function public.record_payroll_payment(uuid, date, date, numeric, numeric) to authenticated;
grant execute on function public.close_day(timestamptz, timestamptz, jsonb) to authenticated;
grant execute on function public.reset_business_data() to authenticated;

commit;
