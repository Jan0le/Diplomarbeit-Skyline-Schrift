-- Ultra-optimized airport search for 80k+ airports
-- This uses materialized view + RPC for instant results

-- 1. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_airports_iata_upper ON airports (UPPER(iata)) WHERE iata IS NOT NULL AND iata != '';
CREATE INDEX IF NOT EXISTS idx_airports_icao_upper ON airports (UPPER(icao)) WHERE icao IS NOT NULL AND icao != '';

-- 2. Create a super-fast RPC function
CREATE OR REPLACE FUNCTION autocomplete_airports_fast(
  query_text TEXT,
  result_limit INTEGER DEFAULT 25
)
RETURNS TABLE (
  id BIGINT,
  icao TEXT,
  iata TEXT,
  name TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  upper_query TEXT := UPPER(TRIM(query_text));
BEGIN
  -- For very short queries or empty, return nothing (client will show popular airports)
  IF upper_query = '' OR LENGTH(upper_query) < 2 THEN
    RETURN;
  END IF;

  -- Fast search using indexes
  RETURN QUERY
  SELECT 
    a.id,
    a.icao,
    a.iata,
    a.name,
    a.city,
    a.country,
    a.latitude,
    a.longitude
  FROM airports a
  WHERE 
    a.iata IS NOT NULL 
    AND a.iata != ''
    AND (
      -- Exact match (uses index)
      UPPER(a.iata) = upper_query
      OR UPPER(a.icao) = upper_query
      -- Prefix match (uses index)
      OR UPPER(a.iata) LIKE upper_query || '%'
      OR UPPER(a.icao) LIKE upper_query || '%'
    )
  ORDER BY
    -- Exact matches first
    CASE WHEN UPPER(a.iata) = upper_query THEN 0
         WHEN UPPER(a.icao) = upper_query THEN 1
         ELSE 2 END,
    a.iata ASC
  LIMIT result_limit;
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION autocomplete_airports_fast TO authenticated;
GRANT EXECUTE ON FUNCTION autocomplete_airports_fast TO anon;

-- 4. Update table statistics for better query planning
ANALYZE airports;

-- 5. Test the function
SELECT 'Testing autocomplete_airports_fast:' as test;
SELECT * FROM autocomplete_airports_fast('VIE', 5);
SELECT * FROM autocomplete_airports_fast('LON', 5);
SELECT * FROM autocomplete_airports_fast('NY', 5);

