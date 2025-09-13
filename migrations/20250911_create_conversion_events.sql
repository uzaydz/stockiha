-- Create table for logging client-side conversion events
create table if not exists public.conversion_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid,
  order_id uuid,
  event_type text not null,
  platform text not null, -- facebook, tiktok, google, etc.
  user_data jsonb default '{}'::jsonb,
  custom_data jsonb default '{}'::jsonb,
  event_id text,
  status text default 'sent',
  error_message text,
  timestamp timestamptz not null default now(),
  sent_at timestamptz
);

-- Helpful indexes
create index if not exists idx_conversion_events_event_time on public.conversion_events (timestamp desc);
create index if not exists idx_conversion_events_event_type on public.conversion_events (event_type);
create index if not exists idx_conversion_events_platform on public.conversion_events (platform);
create index if not exists idx_conversion_events_product on public.conversion_events (product_id);
create index if not exists idx_conversion_events_event_id on public.conversion_events (event_id);

-- Enable RLS
alter table public.conversion_events enable row level security;

-- Allow anonymous inserts (from client endpoints) but not selects/updates/deletes
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'conversion_events'
      and policyname = 'allow_anon_insert_conversion_events'
  ) then
    create policy allow_anon_insert_conversion_events
      on public.conversion_events
      for insert
      to anon
      with check (true);
  end if;
end $$;

-- Optional: allow service_role full access (server-to-server operations)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'conversion_events'
      and policyname = 'allow_service_all_conversion_events'
  ) then
    create policy allow_service_all_conversion_events
      on public.conversion_events
      using (true)
      with check (true);
  end if;
end $$;

