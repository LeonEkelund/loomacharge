-- groups: chargers within a site are organized into groups
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "read own org groups" on public.groups for select
  using (
    is_superadmin()
    or site_id in (select id from public.sites where org_id = current_org_id())
  );

create policy "admins insert groups" on public.groups for insert
  with check (
    is_superadmin()
    or (is_admin() and site_id in (select id from public.sites where org_id = current_org_id()))
  );

create policy "admins update groups" on public.groups for update
  using (
    is_superadmin()
    or (is_admin() and site_id in (select id from public.sites where org_id = current_org_id()))
  )
  with check (
    is_superadmin()
    or (is_admin() and site_id in (select id from public.sites where org_id = current_org_id()))
  );

create policy "admins delete groups" on public.groups for delete
  using (
    is_superadmin()
    or (is_admin() and site_id in (select id from public.sites where org_id = current_org_id()))
  );

-- chargers can be organized into a group
alter table public.chargers
  add column group_id uuid references public.groups (id) on delete set null;
