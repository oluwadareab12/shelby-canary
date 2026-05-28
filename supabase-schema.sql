-- Shelby Canary — Supabase Schema
-- Run this in the Supabase SQL Editor

create table if not exists monitored_datasets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  dataset_url text not null,
  owner_wallet text not null,
  file_format text not null check (file_format in ('csv', 'json')),
  check_interval_minutes integer not null default 15,
  alert_email text,
  alert_webhook text,
  baseline_checksum text,
  baseline_row_count integer,
  baseline_schema jsonb default '{}',
  baseline_stats jsonb default '{}',
  canary_score numeric default 100,
  uptime_24h numeric default 100,
  uptime_7d numeric default 100,
  uptime_30d numeric default 100,
  avg_latency_ms numeric default 0,
  status text not null default 'pending'
    check (status in ('healthy', 'degraded', 'down', 'pending')),
  certified boolean default false,
  certified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists check_results (
  id uuid primary key default uuid_generate_v4(),
  dataset_id uuid references monitored_datasets(id) on delete cascade,
  checked_at timestamptz not null default now(),
  available boolean not null,
  latency_ms integer,
  checksum text,
  checksum_match boolean,
  row_count integer,
  row_count_delta integer,
  schema_drift boolean default false,
  drift_details jsonb default '{}',
  status text not null check (status in ('pass', 'warn', 'fail'))
);

create table if not exists incidents (
  id uuid primary key default uuid_generate_v4(),
  dataset_id uuid references monitored_datasets(id) on delete cascade,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  type text not null,
  description text not null,
  resolved boolean default false
);

create table if not exists alert_logs (
  id uuid primary key default uuid_generate_v4(),
  dataset_id uuid references monitored_datasets(id) on delete cascade,
  sent_at timestamptz not null default now(),
  channel text not null check (channel in ('email', 'webhook')),
  incident_id uuid references incidents(id),
  success boolean default true
);

create index if not exists idx_check_results_dataset_id
  on check_results(dataset_id);
create index if not exists idx_check_results_checked_at
  on check_results(checked_at desc);
create index if not exists idx_incidents_dataset_id
  on incidents(dataset_id);
create index if not exists idx_monitored_datasets_owner
  on monitored_datasets(owner_wallet);
create index if not exists idx_monitored_datasets_score
  on monitored_datasets(canary_score desc);
