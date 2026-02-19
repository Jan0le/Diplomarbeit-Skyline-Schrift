-- =========================================================
-- FA-04: Add real flight schedule timestamps (no assumptions)
-- Adds departure/arrival timestamps to `public.user_flights`
--
-- IMPORTANT:
-- - Uses TIMESTAMP WITHOUT TIME ZONE on purpose (local times)
-- - The app stores strings like "YYYY-MM-DDTHH:mm:ss"
-- =========================================================

alter table public.user_flights
  add column if not exists departure_at timestamp,
  add column if not exists arrival_at timestamp;

create index if not exists user_flights_departure_at_idx on public.user_flights(departure_at);
create index if not exists user_flights_arrival_at_idx on public.user_flights(arrival_at);

comment on column public.user_flights.departure_at is 'Local departure datetime (timestamp without time zone) used for map live plane positioning and reminders.';
comment on column public.user_flights.arrival_at is 'Local arrival datetime (timestamp without time zone) used for map live plane positioning and reminders.';


