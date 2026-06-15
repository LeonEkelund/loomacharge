-- Add location + type details to sites.
alter table public.sites
  add column address      text,
  add column postal_code  text,
  add column city         text,
  add column type         text check (type in ('work', 'home', 'public')),
  add column latitude      double precision,
  add column longitude     double precision;
