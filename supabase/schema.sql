-- Panaji Community MVP schema
-- Run this in the Supabase SQL Editor.
create extension if not exists pgcrypto;
create extension if not exists postgis;

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  country_code char(2) not null default 'IN',
  created_at timestamptz not null default now()
);

insert into public.areas (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Panaji', 'panaji')
on conflict (slug) do nothing;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.areas(id),
  category text not null check (category in (
    'Flooding / Waterlogging', 'Road obstruction', 'Road damage',
    'Weather', 'Coastal issue', 'Infrastructure', 'Other'
  )),
  description text not null check (char_length(description) between 8 and 1000),
  village text,
  latitude double precision not null check (latitude between 15.40 and 15.60),
  longitude double precision not null check (longitude between 73.75 and 73.95),
  location geography(point, 4326) generated always as
    (st_setsrid(st_makepoint(longitude, latitude), 4326)::geography) stored,
  incident_time timestamptz,
  created_at timestamptz not null default now(),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  incident_status text not null default 'active'
    check (incident_status in ('active', 'resolved', 'expired')),
  moderation_note text,
  constraint reports_area_panaji_default foreign key (area_id) references public.areas(id)
);

create index if not exists reports_location_idx on public.reports using gist(location);
create index if not exists reports_created_at_idx on public.reports(created_at desc);
create index if not exists reports_status_idx on public.reports(moderation_status, incident_status);

create table if not exists public.report_images (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.report_confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  -- For an open/no-account MVP, store a hashed anonymous browser token,
  -- not a raw IP address or personally identifying data.
  reporter_token_hash text not null,
  confirmation_type text not null check (confirmation_type in ('confirm', 'dispute')),
  created_at timestamptz not null default now(),
  unique(report_id, reporter_token_hash)
);

create table if not exists public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  event_type text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

-- Public users can read pending and approved reports, but cannot directly
-- insert/update/delete. Submission is handled by the server API route.
alter table public.areas enable row level security;
alter table public.reports enable row level security;
alter table public.report_images enable row level security;
alter table public.report_confirmations enable row level security;
alter table public.report_events enable row level security;

drop policy if exists "Public can read areas" on public.areas;
create policy "Public can read areas" on public.areas
  for select to anon, authenticated using (true);

drop policy if exists "Public can read visible reports" on public.reports;
create policy "Public can read visible reports" on public.reports
  for select to anon, authenticated
  using (moderation_status in ('pending', 'approved') and incident_status <> 'expired');

drop policy if exists "Public can read images for visible reports" on public.report_images;
create policy "Public can read images for visible reports" on public.report_images
  for select to anon, authenticated using (
    exists (
      select 1 from public.reports r
      where r.id = report_id
        and r.moderation_status in ('pending', 'approved')
        and r.incident_status <> 'expired'
    )
  );

-- No public write policies are intentionally created. The server route uses
-- the service-role key, which must remain server-side and be protected.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public image reads are allowed; uploads are performed server-side.
drop policy if exists "Public can view report photos" on storage.objects;
create policy "Public can view report photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'report-photos');

-- NOTE: Before launch, add an authenticated admin role and server-side
-- moderation endpoints. Never expose the service-role key to the browser.
