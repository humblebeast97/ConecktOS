-- ConecktOS Phase 1 core schema.
-- Replaces the earlier single-table `salons` migration with the full multi-tenant
-- model mirroring src/lib/groompulse.ts, plus the Phase 1 tables (subscriptions,
-- invites, payroll, payments, tips, day closures). Every table is business-scoped
-- and protected by RLS. Authored for review; apply with the Supabase CLI once the
-- app is ready to opt into VITE_DATA_SOURCE="supabase".
--
-- NOTE: there is no production data, so the stale `salons` table is dropped rather
-- than migrated.

begin;

drop table if exists public.salons cascade;

-- ---------------------------------------------------------------------------
-- Tenancy helpers
-- ---------------------------------------------------------------------------

-- A profile row is 1:1 with an auth user and names the business they belong to.
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null default 'beauty'
    check (business_type in ('beauty','car_wash','tailoring','nightlife','repair')),
  latitude double precision not null default 0,
  longitude double precision not null default 0,
  address_label text,
  geofence_radius_meters integer not null default 100,
  currency text not null default 'NGN',
  open_time text not null default '08:00',
  close_time text not null default '20:00',
  payroll_reminder_days integer not null default 3
    check (payroll_reminder_days in (0,3,7,-1)),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text not null,
  role text not null default 'staff'
    check (role in ('owner','manager','receptionist','staff')),
  job_title text,
  commission_rate numeric not null default 0,
  base_salary numeric,
  salary_payday integer check (salary_payday between 1 and 31),
  salary_last_paid_at timestamptz,
  bank_name text,
  account_number text,
  account_name text,
  avatar_url text
);

create index if not exists profiles_business_id_idx on public.profiles (business_id);

-- Returns the caller's business id. SECURITY DEFINER so it can read profiles
-- without tripping that table's own RLS (avoids recursion in policies).
create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_business_id() to authenticated;
grant execute on function public.current_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Core domain tables (mirror groompulse.ts). business_id is denormalized onto
-- child tables (attendance, ticket_items, usage) purely to keep RLS simple.
-- ---------------------------------------------------------------------------

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  duration_minutes integer not null default 0,
  suggested_inventory jsonb not null default '[]'::jsonb
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 0,
  unit text not null default '',
  reorder_level numeric not null default 0
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_name text not null default '',
  client_phone text not null default '',
  total_amount numeric not null default 0,
  payment_method text not null default 'pos'
    check (payment_method in ('pos','bank_transfer','cash')),
  status text not null default 'pending' check (status in ('pending','paid')),
  reference text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tickets_business_id_idx on public.tickets (business_id);

create table if not exists public.ticket_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  staff_id uuid references public.profiles (id) on delete set null,
  service_price numeric not null default 0,
  staff_commission_amount numeric not null default 0
);

create index if not exists ticket_items_ticket_id_idx on public.ticket_items (ticket_id);

create table if not exists public.ticket_inventory_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  ticket_id uuid references public.tickets (id) on delete set null,
  inventory_id uuid not null references public.inventory_items (id) on delete cascade,
  quantity_used numeric not null default 0
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  clock_in_time timestamptz not null default now(),
  clock_out_time timestamptz,
  clock_in_lat double precision,
  clock_in_lng double precision,
  is_within_geofence boolean not null default false,
  status text not null default 'on_time' check (status in ('on_time','late','absent'))
);

create index if not exists attendance_staff_id_idx on public.attendance (staff_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category text not null
    check (category in ('generator_fuel','maintenance','supplies','rent','salary')),
  amount numeric not null default 0,
  generator_hours_run numeric,
  notes text not null default '',
  logged_at timestamptz not null default now(),
  logged_by uuid references public.profiles (id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references public.profiles (id) on delete set null,
  void_reason text
);

-- ---------------------------------------------------------------------------
-- Phase 1 tables: plans/billing, invites, payroll, payments, tips, closures
-- ---------------------------------------------------------------------------

create table if not exists public.subscriptions (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter','studio','chain')),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','canceled')),
  staff_cap integer not null default 3,
  gateway_customer_ref text,
  gateway_subscription_ref text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  code text not null unique,
  role text not null default 'staff'
    check (role in ('owner','manager','receptionist','staff')),
  preset_commission_rate numeric,
  email text,
  status text not null default 'pending'
    check (status in ('pending','accepted','revoked','expired')),
  created_by uuid references public.profiles (id) on delete set null,
  accepted_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('payroll','tip')),
  staff_id uuid references public.profiles (id) on delete set null,
  amount numeric not null default 0,
  currency text not null default 'NGN',
  gateway text,
  gateway_ref text,
  status text not null default 'pending'
    check (status in ('pending','success','failed','reversed')),
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','paid','partial')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  commission_amount numeric not null default 0,
  base_salary numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'pending'
    check (status in ('pending','paid','failed')),
  payment_id uuid references public.payments (id) on delete set null,
  unique (run_id, staff_id)
);

create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null default 0,
  currency text not null default 'NGN',
  payment_id uuid references public.payments (id) on delete set null,
  tipper_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.day_closures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  totals jsonb not null default '{}'::jsonb,
  closed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.inventory_items enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_items enable row level security;
alter table public.ticket_inventory_usage enable row level security;
alter table public.attendance enable row level security;
alter table public.expenses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invites enable row level security;
alter table public.payments enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_lines enable row level security;
alter table public.tips enable row level security;
alter table public.day_closures enable row level security;

-- businesses: a user sees and manages the business they own. Insert allowed for
-- the authed user as owner (bootstraps signup before a profile exists).
create policy businesses_select on public.businesses for select to authenticated
  using (id = public.current_business_id() or owner_id = auth.uid());
create policy businesses_insert on public.businesses for insert to authenticated
  with check (owner_id = auth.uid());
create policy businesses_update on public.businesses for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- profiles: users read profiles in their business; a user may insert their own
-- row (signup / invite accept); owners and managers may manage others.
create policy profiles_select on public.profiles for select to authenticated
  using (business_id = public.current_business_id() or id = auth.uid());
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (
    id = auth.uid()
    or (business_id = public.current_business_id() and public.current_role() in ('owner','manager'))
  )
  with check (
    id = auth.uid()
    or (business_id = public.current_business_id() and public.current_role() in ('owner','manager'))
  );
create policy profiles_delete on public.profiles for delete to authenticated
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));

-- Generic business-scoped tables: full access within the caller's business.
do $$
declare t text;
begin
  foreach t in array array[
    'services','inventory_items','tickets','ticket_items','ticket_inventory_usage',
    'attendance','expenses','invites','payments','payroll_runs','payroll_lines',
    'tips','day_closures'
  ]
  loop
    execute format(
      'create policy %1$s_all on public.%1$s for all to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());',
      t
    );
  end loop;
end $$;

-- subscriptions: everyone in the business can read their plan; only the owner writes.
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (business_id = public.current_business_id());
create policy subscriptions_write on public.subscriptions for all to authenticated
  using (business_id = public.current_business_id() and public.current_role() = 'owner')
  with check (business_id = public.current_business_id() and public.current_role() = 'owner');

commit;
