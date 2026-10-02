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
  search_text text generated always as (
    lower(coalesce(name,'') || ' ' || coalesce(description,'') || ' ' ||
          coalesce(neighborhood,'') || ' ' || array_to_string(tags,' '))
  ) stored
);
create index if not exists places_city_idx on places(city_slug);
create index if not exists places_category_idx on places(category);

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
  created_at timestamptz default now()
);
create index if not exists bookings_session_idx on bookings(session_id, created_at desc);

create table if not exists usage (
  session_id text primary key,
  message_count int default 0,
  updated_at timestamptz default now()
);

-- Atomic per-session message counter used by the chat rate limiter.
create or replace function increment_usage(p_session_id text)
returns int
language sql
as $$
  insert into usage (session_id, message_count) values (p_session_id, 1)
  on conflict (session_id)
  do update set message_count = usage.message_count + 1, updated_at = now()
  returning message_count;
$$;

-- Lock everything down: only the server (service role) touches these tables.
alter table places enable row level security;
alter table profiles enable row level security;
alter table saved_places enable row level security;
alter table bookings enable row level security;
alter table usage enable row level security;
