-- connectors: each charger has one or more connectors, each with its own status
-- (this mirrors OCPP, which reports status per connector).
create table public.connectors (
  id            uuid primary key default gen_random_uuid(),
  charger_id    uuid not null references public.chargers (id) on delete cascade,
  connector_id  integer not null,
  status        text not null default 'unavailable'
                  check (status in ('available','preparing','charging','finishing','faulted','unavailable')),
  created_at    timestamptz not null default now(),
  unique (charger_id, connector_id)
);

alter table public.connectors enable row level security;

create policy "read own org connectors" on public.connectors for select
  using (
    is_superadmin()
    or charger_id in (
      select id from public.chargers
      where site_id in (select id from public.sites where org_id = current_org_id())
    )
  );

create policy "admins insert connectors" on public.connectors for insert
  with check (
    is_superadmin()
    or (is_admin() and charger_id in (
      select id from public.chargers
      where site_id in (select id from public.sites where org_id = current_org_id())
    ))
  );

create policy "admins update connectors" on public.connectors for update
  using (
    is_superadmin()
    or (is_admin() and charger_id in (
      select id from public.chargers
      where site_id in (select id from public.sites where org_id = current_org_id())
    ))
  )
  with check (
    is_superadmin()
    or (is_admin() and charger_id in (
      select id from public.chargers
      where site_id in (select id from public.sites where org_id = current_org_id())
    ))
  );

create policy "admins delete connectors" on public.connectors for delete
  using (
    is_superadmin()
    or (is_admin() and charger_id in (
      select id from public.chargers
      where site_id in (select id from public.sites where org_id = current_org_id())
    ))
  );
