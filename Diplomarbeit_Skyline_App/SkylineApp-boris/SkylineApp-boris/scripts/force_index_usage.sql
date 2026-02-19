-- Force PostgreSQL to use indexes for airport searches

-- Drop and recreate the function with better index hints
DROP FUNCTION IF EXISTS search_airports_fast(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION search_airports_fast(
  search_term TEXT DEFAULT '',
  max_results INTEGER DEFAULT 30
)
RETURNS TABLE (
  id INTEGER,
  icao TEXT,
  iata TEXT,
  name TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
AS $$
  -- Use UNION to force separate index scans for each condition
  (
    -- Exact IATA matches first (fastest)
    SELECT a.id, a.icao, a.iata, a.name, a.city, a.country, a.latitude, a.longitude
    FROM airports a
    WHERE a.iata = upper(search_term)
    LIMIT max_results
  )
  UNION ALL
  (
    -- IATA prefix matches
    SELECT a.id, a.icao, a.iata, a.name, a.city, a.country, a.latitude, a.longitude
    FROM airports a
    WHERE a.iata ILIKE search_term || '%' 
      AND a.iata != upper(search_term)
    LIMIT max_results
  )
  UNION ALL
  (
    -- ICAO prefix matches
    SELECT a.id, a.icao, a.iata, a.name, a.city, a.country, a.latitude, a.longitude
    FROM airports a
    WHERE a.icao ILIKE search_term || '%'
      AND a.iata != upper(search_term)
    LIMIT max_results
  )
  UNION ALL
  (
    -- Name/city contains (only for longer searches)
    SELECT a.id, a.icao, a.iata, a.name, a.city, a.country, a.latitude, a.longitude
    FROM airports a
    WHERE length(search_term) > 2
      AND (a.name ILIKE '%' || search_term || '%' OR a.city ILIKE '%' || search_term || '%')
      AND a.iata != upper(search_term)
    LIMIT max_results
  )
  ORDER BY
    -- Prioritize exact matches
    (iata = upper(search_term)) DESC,
    (icao = upper(search_term)) DESC,
    -- Then prefix matches
    (iata ILIKE search_term || '%') DESC,
    (icao ILIKE search_term || '%') DESC,
    -- Then alphabetical
    iata ASC
  LIMIT max_results;
$$;

-- Test the improved function
SELECT 'Testing improved search_airports_fast:' as test;
SELECT * FROM search_airports_fast('VI', 5);
