-- Full schema for a NEW database. Run this single file in the Supabase SQL editor.
-- Existing databases: run migration_002.sql then migration_003.sql instead.
-- All data access goes through the server with the service-role key; RLS is on with no policies,
-- so the public anon key can read and write nothing.

create extension if not exists vector with schema extensions;

-- array_to_string is only STABLE, which generated columns reject; this wrapper is safe for text arrays.
create or replace function immutable_array_to_string(arr text[], sep text)
returns text
language sql
immutable
parallel safe
as $$ select array_to_string(arr, sep) $$;

create table if not exists places (
  id text primary key,
  name text not null,
  city text not null,
  city_slug text not null,
  category text not null,
  neighborhood text,
  price_level int,
  tags text[] default '{}',
  description text,
  lat double precision,
  lng double precision,
  image_url text,
  pearlclub_url text not null,
  curator text,
  curator_slug text,
  curator_image text,
  curator_type text,
  -- 1536 dims = OpenAI text-embedding-3-small. Never selected by the app (large).
  embedding extensions.vector(1536),
  search_text text generated always as (
    lower(coalesce(name,'') || ' ' || coalesce(description,'') || ' ' ||
          coalesce(neighborhood,'') || ' ' || immutable_array_to_string(tags,' '))
  ) stored
);
create index if not exists places_city_idx on places(city_slug);
create index if not exists places_category_idx on places(category);
create index if not exists places_embedding_idx
  on places using hnsw (embedding extensions.vector_cosine_ops);

create table if not exists profiles (
  session_id text primary key,
  name text,
  language text default 'en',
  travel_style text,          -- e.g. "foodie", "culture", "nightlife", "relaxed", "family"
  budget text,                -- "budget" | "mid" | "luxury"
  interests text[] default '{}',
  dietary text[] default '{}',
  home_city text,
  updated_at timestamptz default now()
);

create table if not exists saved_places (
  session_id text not null,
  place_id text not null references places(id),
  created_at timestamptz default now(),
  primary key (session_id, place_id)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  idempotency_key uuid,
  hotel_id text not null,
  booking_type text not null,      -- "hotel_service" | "place"
  item_id text not null,           -- service id or place id
  item_name text not null,
  date date not null,
  time text,
  party_size int default 1,
  guest_name text not null,
  guest_email text not null,
  room_number text,
  notes text,
  status text default 'requested', -- requested | confirmed | cancelled
  created_at timestamptz default now(),
  constraint bookings_party_size_check check (party_size between 1 and 20),
  constraint bookings_status_check check (status in ('requested', 'confirmed', 'cancelled')),
  constraint bookings_type_check check (booking_type in ('hotel_service', 'place')),
  constraint bookings_time_check check (time is null or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
create index if not exists bookings_session_idx on bookings(session_id, created_at desc);
create unique index if not exists bookings_idempotency_idx
  on bookings (session_id, idempotency_key)
  where idempotency_key is not null;

-- Counters for rate limiting: s:<session>, ip:<hash>:<day>, g:<day>, w:<hash>:<day>, l:<hash>:<day>.
create table if not exists usage (
  session_id text primary key,
  message_count int default 0,
  updated_at timestamptz default now()
);

-- Atomic counter used by the rate limiter.
create or replace function increment_usage(p_session_id text)
returns int
language sql
set search_path = public
as $$
  insert into usage (session_id, message_count) values (p_session_id, 1)
  on conflict (session_id)
  do update set message_count = usage.message_count + 1, updated_at = now()
  returning message_count;
$$;

-- Semantic ("vibe") search.
create or replace function match_places(
  query_embedding extensions.vector(1536),
  p_city text,
  p_category text default null,
  p_price_max int default null,
  p_exclude text[] default '{}',
  match_count int default 60
)
returns table (id text, similarity double precision)
language sql
stable
set search_path = public, extensions
as $$
  select p.id, 1 - (p.embedding <=> query_embedding) as similarity
  from places p
  where p.embedding is not null
    and p.city_slug = p_city
    and (p_category is null or p.category = p_category)
    and (p_price_max is null or p.price_level <= p_price_max)
    and not (p.id = any(p_exclude))
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- Retention helpers, called daily by /api/cron/purge.
create or replace function purge_usage(
  p_daily_older_than interval default interval '2 days',
  p_session_older_than interval default interval '30 days'
)
returns int
language plpgsql
set search_path = public
as $$
declare
  removed int;
begin
  delete from usage
  where (session_id ~ '^(ip|g|w|l):' and updated_at < now() - p_daily_older_than)
     or updated_at < now() - p_session_older_than;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create or replace function purge_old_bookings(p_older_than interval default interval '90 days')
returns int
language plpgsql
set search_path = public
as $$
declare
  removed int;
begin
  delete from bookings where created_at < now() - p_older_than;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Only the server (service role) may call the functions.
revoke all on function increment_usage(text) from public, anon, authenticated;
revoke all on function match_places(extensions.vector, text, text, integer, text[], integer)
  from public, anon, authenticated;
revoke all on function purge_usage(interval, interval) from public, anon, authenticated;
revoke all on function purge_old_bookings(interval) from public, anon, authenticated;
grant execute on function increment_usage(text) to service_role;
grant execute on function match_places(extensions.vector, text, text, integer, text[], integer) to service_role;
grant execute on function purge_usage(interval, interval) to service_role;
grant execute on function purge_old_bookings(interval) to service_role;

-- Lock everything down: only the server (service role) touches these tables.
alter table places enable row level security;
alter table profiles enable row level security;
alter table saved_places enable row level security;
alter table bookings enable row level security;
alter table usage enable row level security;
