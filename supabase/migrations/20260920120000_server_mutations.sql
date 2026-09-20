-- ConecktOS Phase 1: server-authoritative mutations.
-- Money and attendance writes go through these functions so the client can never
-- set a commission amount, geofence result, or bypass the expense void rules.
-- All run SECURITY INVOKER, so table RLS still scopes every row to the caller's
-- business; the functions add the trusted computation on top.

begin;

-- Great-circle distance in metres (mirrors haversineMeters in groompulse.ts).
create or replace function public.haversine_meters(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Create a ticket: commission is computed from the stored service price and the
-- staff member's stored commission_rate (never from the client). Inventory is
-- decremented in the same transaction. Returns the new ticket id.
create or replace function public.create_ticket(
  p_client_name text,
  p_client_phone text,
  p_payment_method text,
  p_status text,
  p_lines jsonb,   -- [{ "service_id": uuid, "staff_id": uuid }]
  p_usage jsonb    -- [{ "inventory_id": uuid, "quantity_used": number }]
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare
  v_business uuid := public.current_business_id();
  v_ticket uuid;
  v_line jsonb;
  v_use jsonb;
  v_price numeric;
  v_rate numeric;
  v_total numeric := 0;
begin
  if v_business is null then
    raise exception 'No business for the current user';
  end if;

  insert into public.tickets (
    business_id, client_name, client_phone, total_amount,
    payment_method, status, created_by
  ) values (
    v_business, coalesce(p_client_name, ''), coalesce(p_client_phone, ''), 0,
    coalesce(p_payment_method, 'pos'), coalesce(p_status, 'pending'), auth.uid()
  ) returning id into v_ticket;

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    select price into v_price
      from public.services
      where id = (v_line->>'service_id')::uuid and business_id = v_business;
    if v_price is null then
      raise exception 'Invalid service for this business';
    end if;

    select commission_rate into v_rate
      from public.profiles
      where id = (v_line->>'staff_id')::uuid and business_id = v_business;
    v_rate := coalesce(v_rate, 0);

    insert into public.ticket_items (
      business_id, ticket_id, service_id, staff_id, service_price, staff_commission_amount
    ) values (
      v_business, v_ticket, (v_line->>'service_id')::uuid, (v_line->>'staff_id')::uuid,
      v_price, round(v_price * v_rate)
    );
    v_total := v_total + v_price;
  end loop;

  update public.tickets set total_amount = v_total where id = v_ticket;

  for v_use in select * from jsonb_array_elements(coalesce(p_usage, '[]'::jsonb))
  loop
    insert into public.ticket_inventory_usage (business_id, ticket_id, inventory_id, quantity_used)
    values (v_business, v_ticket, (v_use->>'inventory_id')::uuid, (v_use->>'quantity_used')::numeric);

    update public.inventory_items
      set quantity = greatest(0, quantity - (v_use->>'quantity_used')::numeric)
      where id = (v_use->>'inventory_id')::uuid and business_id = v_business;
  end loop;

  return v_ticket;
end $$;

-- Clock in: geofence is recomputed server-side against the stored business
-- location; "late" is derived from business.open_time (Africa/Lagos, the product's
-- home region). The client lat/lng are inputs, not the source of truth.
create or replace function public.clock_in(
  p_staff_id uuid,
  p_lat double precision,
  p_lng double precision
) returns public.attendance
language plpgsql security invoker
set search_path = public
as $$
declare
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
  if v_business is null then
    raise exception 'No business for the current user';
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
    v_business, p_staff_id, now(), p_lat, p_lng, v_within,
    case when v_late then 'late' else 'on_time' end
  ) returning * into v_row;

  return v_row;
end $$;

-- Add an expense; business + logger are stamped server-side.
create or replace function public.add_expense(
  p_category text,
  p_amount numeric,
  p_generator_hours_run numeric,
  p_notes text
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare
  v_business uuid := public.current_business_id();
  v_id uuid;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  insert into public.expenses (business_id, category, amount, generator_hours_run, notes, logged_by)
  values (v_business, p_category, p_amount, p_generator_hours_run, coalesce(p_notes, ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Void an expense: enforces the 5-minute window and the owner-or-logger rule.
create or replace function public.void_expense(p_expense_id uuid, p_reason text)
returns void
language plpgsql security invoker
set search_path = public
as $$
declare
  v_business uuid := public.current_business_id();
  v_logged_at timestamptz;
  v_logged_by uuid;
  v_voided_at timestamptz;
begin
  select logged_at, logged_by, voided_at into v_logged_at, v_logged_by, v_voided_at
    from public.expenses where id = p_expense_id and business_id = v_business;
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

-- Add an inventory item scoped to the caller's business.
create or replace function public.add_inventory_item(
  p_item_name text, p_quantity numeric, p_unit text, p_reorder_level numeric
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare v_business uuid := public.current_business_id(); v_id uuid;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  insert into public.inventory_items (business_id, item_name, quantity, unit, reorder_level)
  values (v_business, p_item_name, coalesce(p_quantity, 0), coalesce(p_unit, ''), coalesce(p_reorder_level, 0))
  returning id into v_id;
  return v_id;
end $$;

-- Add a service scoped to the caller's business.
create or replace function public.add_service(
  p_name text, p_price numeric, p_duration_minutes integer
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare v_business uuid := public.current_business_id(); v_id uuid;
begin
  if v_business is null then raise exception 'No business for the current user'; end if;
  insert into public.services (business_id, name, price, duration_minutes)
  values (v_business, p_name, coalesce(p_price, 0), coalesce(p_duration_minutes, 0))
  returning id into v_id;
  return v_id;
end $$;

-- Start a new period: clears the caller's business transactional data and zeroes
-- stock on hand (owner only). Mirrors the mock resetAll.
create or replace function public.reset_business_data()
returns void
language plpgsql security invoker
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

grant execute on function public.haversine_meters(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.create_ticket(text, text, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.clock_in(uuid, double precision, double precision) to authenticated;
grant execute on function public.add_expense(text, numeric, numeric, text) to authenticated;
grant execute on function public.void_expense(uuid, text) to authenticated;
grant execute on function public.add_inventory_item(text, numeric, text, numeric) to authenticated;
grant execute on function public.add_service(text, numeric, integer) to authenticated;
grant execute on function public.reset_business_data() to authenticated;

commit;
