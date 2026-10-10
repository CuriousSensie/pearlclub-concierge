-- Run once in the Supabase SQL editor (safe to re-run). Additive: existing rows are untouched.
-- Apply BEFORE deploying the matching code: the app now writes bookings.idempotency_key.

-- 1) Bookings: idempotency key (a retry or double submit replays the original row).
alter table bookings add column if not exists idempotency_key uuid;
create unique index if not exists bookings_idempotency_idx
  on bookings (session_id, idempotency_key)
  where idempotency_key is not null;

-- 2) Bookings: data constraints. NOT VALID enforces them for new rows without failing on legacy rows.
alter table bookings drop constraint if exists bookings_party_size_check;
alter table bookings add constraint bookings_party_size_check
  check (party_size between 1 and 20) not valid;

alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('requested', 'confirmed', 'cancelled')) not valid;

alter table bookings drop constraint if exists bookings_type_check;
alter table bookings add constraint bookings_type_check
  check (booking_type in ('hotel_service', 'place')) not valid;

alter table bookings drop constraint if exists bookings_time_check;
alter table bookings add constraint bookings_time_check
  check (time is null or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') not valid;

-- 3) Functions: pin search_path and restrict who may call them. The app only uses the service role,
--    so the public anon key must not be able to bump counters or probe the vector index.
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

revoke all on function increment_usage(text) from public, anon, authenticated;
grant execute on function increment_usage(text) to service_role;

revoke all on function match_places(extensions.vector, text, text, integer, text[], integer)
  from public, anon, authenticated;
grant execute on function match_places(extensions.vector, text, text, integer, text[], integer)
  to service_role;

-- 4) Retention: rate-limit counters are short-lived and guest contact details should not live forever.
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

revoke all on function purge_usage(interval, interval) from public, anon, authenticated;
revoke all on function purge_old_bookings(interval) from public, anon, authenticated;
grant execute on function purge_usage(interval, interval) to service_role;
grant execute on function purge_old_bookings(interval) to service_role;
