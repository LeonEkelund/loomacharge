-- Looma initial schema + RLS
-- Multi-tenant: organizations -> sites -> chargers -> sessions; drivers are global.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.organizations (
  id          uuid         primary key default gen_random_uuid(),
  name        text         not null,
  created_at  timestamptz  not null default now()
);

create table public.profiles (
  id          uuid         primary key references auth.users (id) on delete cascade,
  org_id      uuid         references public.organizations (id) on delete cascade,
  email       text,
  role        text         not null default 'viewer'
                check (role in ('superadmin', 'admin', 'viewer')),
  created_at  timestamptz  not null default now()
);

create table public.sites (
  id          uuid         primary key default gen_random_uuid(),
  org_id      uuid         not null references public.organizations (id) on delete cascade,
  name        text         not null,
  created_at  timestamptz  not null default now()
);

create table public.chargers (
  id          uuid         primary key default gen_random_uuid(),
  site_id     uuid         not null references public.sites (id) on delete cascade,
  identity    text         not null unique,
  name        text         not null,
  status      text         not null default 'unavailable',
  last_seen   timestamptz,
  created_at  timestamptz  not null default now()
);

create table public.drivers (
  id          uuid         primary key references auth.users (id) on delete cascade,
  email       text         not null unique,
  name        text,
  created_at  timestamptz  not null default now()
);

create table public.sessions (
  id          uuid          primary key default gen_random_uuid(),
  charger_id  uuid          not null references public.chargers (id) on delete cascade,
  driver_id   uuid          references public.drivers (id) on delete set null,
  started_at  timestamptz   not null default now(),
  ended_at    timestamptz,
  energy_kwh  numeric(10,3) not null default 0,
  status      text          not null default 'active' check (status in ('active', 'completed')),
  created_at  timestamptz   not null default now()
);

create index sessions_charger_id_idx on public.sessions (charger_id);

-- ============================================================================
-- Row-Level Security
-- ============================================================================

alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.sites         enable row level security;
alter table public.chargers      enable row level security;
alter table public.drivers       enable row level security;
alter table public.sessions      enable row level security;

-- ============================================================================
-- Helper functions (security definer: read profiles without RLS recursion)
-- ============================================================================

create or replace function public.current_org_id()
returns uuid
language sql security definer stable
set search_path = ''
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_superadmin()
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'superadmin'
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
$$;

-- ============================================================================
-- Policies: organizations
-- ============================================================================

create policy "read own org" on public.organizations for select
  using ( is_superadmin() or id = current_org_id() );

create policy "superadmin insert orgs" on public.organizations for insert
  with check ( is_superadmin() );

create policy "superadmin update orgs" on public.organizations for update
  using ( is_superadmin() ) with check ( is_superadmin() );

create policy "superadmin delete orgs" on public.organizations for delete
  using ( is_superadmin() );

-- ============================================================================
-- Policies: profiles
-- ============================================================================

create policy "read own profile" on public.profiles for select
  using ( auth.uid() = id );

create policy "superadmin read profiles" on public.profiles for select
  using ( is_superadmin() );

create policy "superadmin insert profiles" on public.profiles for insert
  with check ( is_superadmin() );

create policy "superadmin update profiles" on public.profiles for update
  using ( is_superadmin() ) with check ( is_superadmin() );

create policy "superadmin delete profiles" on public.profiles for delete
  using ( is_superadmin() );

-- ============================================================================
-- Policies: sites
-- ============================================================================

create policy "read own org sites" on public.sites for select
  using ( is_superadmin() or org_id = current_org_id() );

create policy "admins insert sites" on public.sites for insert
  with check ( is_superadmin() or (is_admin() and org_id = current_org_id()) );

create policy "admins update sites" on public.sites for update
  using ( is_superadmin() or (is_admin() and org_id = current_org_id()) )
  with check ( is_superadmin() or (is_admin() and org_id = current_org_id()) );

create policy "admins delete sites" on public.sites for delete
  using ( is_superadmin() or (is_admin() and org_id = current_org_id()) );

-- ============================================================================
-- Policies: chargers (reach org through site)
-- ============================================================================

create policy "read own org chargers" on public.chargers for select
  using (
    is_superadmin()
    or site_id in (select id from public.sites where org_id = current_org_id())
  );

create policy "admins insert chargers" on public.chargers for insert
  with check (
    is_superadmin()
    or (is_admin() and site_id in (select id from public.sites where org_id = current_org_id()))
  );

create policy "admins update chargers" on public.chargers for update
  using (
    is_superadmin()
    or (is_admin() and site_id in (select id from public.sites where org_id = current_org_id()))
  )
  with check (
    is_superadmin()
    or (is_admin() and site_id in (select id from public.sites where org_id = current_org_id()))
  );

create policy "admins delete chargers" on public.chargers for delete
  using (
    is_superadmin()
    or (is_admin() and site_id in (select id from public.sites where org_id = current_org_id()))
  );

-- ============================================================================
-- Policies: drivers (self-service; companies see drivers only via sessions)
-- ============================================================================

create policy "read own driver" on public.drivers for select
  using ( is_superadmin() or id = auth.uid() );

-- A company can see drivers who have charged on its chargers (its customers).
create policy "companies read their customers" on public.drivers for select
  using (
    id in (
      select driver_id from public.sessions
      where driver_id is not null
        and charger_id in (
          select id from public.chargers
          where site_id in (select id from public.sites where org_id = current_org_id())
        )
    )
  );

create policy "insert own driver" on public.drivers for insert
  with check ( is_superadmin() or id = auth.uid() );

create policy "update own driver" on public.drivers for update
  using ( is_superadmin() or id = auth.uid() )
  with check ( is_superadmin() or id = auth.uid() );

create policy "delete own driver" on public.drivers for delete
  using ( is_superadmin() or id = auth.uid() );

-- ============================================================================
-- Policies: sessions (read only via API; OCPP server writes via service role)
-- ============================================================================

create policy "read sessions" on public.sessions for select
  using (
    is_superadmin()
    or driver_id = auth.uid()
    or charger_id in (
      select id from public.chargers
      where site_id in (select id from public.sites where org_id = current_org_id())
    )
  );
