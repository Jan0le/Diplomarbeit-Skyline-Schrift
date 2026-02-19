-- =============================================
-- SKYLINE DB UTIL - DISTANCE_KM MIGRATION & HELPERS
-- Safe to re-run (IF NOT EXISTS guards)
-- =============================================

BEGIN;

-- 1) Add numeric distance column to user_flights
ALTER TABLE public.user_flights
  ADD COLUMN IF NOT EXISTS distance_km INT;

-- 2) Backfill from existing textual distance (e.g., '1,234 km', '1.234 km')
UPDATE public.user_flights
SET distance_km = NULLIF(regexp_replace(distance, '[^0-9]', '', 'g'), '')::INT
WHERE distance IS NOT NULL
  AND (distance_km IS NULL OR distance_km = 0);

-- 3) Optional: backfill from airports lat/lon when distance is missing
-- (Great-circle distance using Haversine formula)
WITH params AS (
  SELECT 6371.0::double precision AS R -- kilometers
),
calc AS (
  SELECT uf.id,
         (SELECT R FROM params) * 2 *
         asin(
           sqrt(
             pow(sin(radians((to_ap.latitude - from_ap.latitude) / 2)), 2) +
             cos(radians(from_ap.latitude)) * cos(radians(to_ap.latitude)) *
             pow(sin(radians((to_ap.longitude - from_ap.longitude) / 2)), 2)
           )
         ) AS dist_km
  FROM public.user_flights uf
  JOIN public.airports from_ap ON from_ap.id = uf.from_airport_id
  JOIN public.airports to_ap   ON to_ap.id   = uf.to_airport_id
  WHERE (uf.distance_km IS NULL OR uf.distance_km = 0)
    AND from_ap.latitude  IS NOT NULL AND from_ap.longitude IS NOT NULL
    AND to_ap.latitude    IS NOT NULL AND to_ap.longitude   IS NOT NULL
)
UPDATE public.user_flights uf
SET distance_km = GREATEST(1, ROUND(calc.dist_km)::INT)
FROM calc
WHERE uf.id = calc.id;

-- 4) Helpful index for analytics
CREATE INDEX IF NOT EXISTS user_flights_distance_km_idx
  ON public.user_flights(distance_km);

-- 5) (Optional) Simple aggregate view for quick user stats
CREATE OR REPLACE VIEW public.user_stats_aggregate AS
SELECT
  uf.profile_id,
  COUNT(*) FILTER (WHERE uf.status = 'completed') AS trips_taken,
  COALESCE(SUM(uf.distance_km), 0)                 AS total_distance_km
FROM public.user_flights uf
GROUP BY uf.profile_id;

COMMIT;

-- Notes:
-- - distance_km remains nullable and is backfilled best-effort.
-- - For future writes, set distance_km from the app alongside formatted 'distance'.
-- - You can extend the view with countries_visited using joins if needed.

-- =============================================
-- SERVER-SIDE USER STATS (RPC)
-- =============================================

-- Drop if exists for idempotency
DROP FUNCTION IF EXISTS public.get_user_stats(uuid);

-- Returns trips_taken (all flights), countries_visited (distinct from/to), total_distance_km (sum)
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS TABLE (
  trips_taken INT,
  countries_visited INT,
  total_distance_km INT
) AS $$
BEGIN
  RETURN QUERY
  WITH flights AS (
    SELECT uf.*
    FROM public.user_flights uf
    WHERE uf.profile_id = p_user_id
  ),
  country_union AS (
    SELECT a.country AS country
    FROM flights f
    JOIN public.airports a ON a.id = f.from_airport_id
    UNION
    SELECT a.country AS country
    FROM flights f
    JOIN public.airports a ON a.id = f.to_airport_id
  )
  SELECT
    COUNT(*)::INT                                   AS trips_taken,
    (SELECT COUNT(*) FROM country_union)::INT       AS countries_visited,
    COALESCE(SUM(distance_km), 0)::INT              AS total_distance_km
  FROM flights;
END;
$$ LANGUAGE plpgsql STABLE;

-- Allow authenticated users to execute for their own id via RLS safeguards
GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO authenticated;

