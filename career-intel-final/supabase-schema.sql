-- ================================================================
-- Career Intel — Supabase Database Schema
-- HOW TO USE:
--   1. Go to supabase.com → your project → SQL Editor
--   2. Click "New query"  
--   3. Paste this entire file
--   4. Click "Run"
-- ================================================================

create extension if not exists "uuid-ossp";

-- User profiles (parsed from uploaded documents)
create table if not exists profiles (
  id           uuid primary key default uuid_generate_v4(),
  user_id      text not null unique,
  profile_data jsonb not null default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Opportunity snapshots (saved each time user clicks Refresh)
create table if not exists opportunity_snapshots (
  id            uuid primary key default uuid_generate_v4(),
  user_id       text not null,
  snapshot_date date not null default current_date,
  data          jsonb not null default '{}',
  filters       jsonb default '{}',
  created_at    timestamptz default now()
);

-- Saved/bookmarked opportunities with status
create table if not exists saved_opportunities (
  id               uuid primary key default uuid_generate_v4(),
  user_id          text not null,
  opportunity_id   text not null,
  opportunity_type text not null,
  opportunity_data jsonb not null default '{}',
  status           text not null default 'saved',
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_id, opportunity_id)
);

-- Performance indexes
create index if not exists idx_profiles_user        on profiles(user_id);
create index if not exists idx_snapshots_user_date  on opportunity_snapshots(user_id, created_at desc);
create index if not exists idx_saved_user_status    on saved_opportunities(user_id, status);
