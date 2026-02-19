-- Create fast airport search RPC function for React Native performance
-- Run this in your Supabase SQL editor

CREATE OR REPLACE FUNCTION search_airports_fast(
  search_term TEXT DEFAULT '',
  max_results INTEGER DEFAULT 20
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
      CASE 
        WHEN length(search_term) <= 2 THEN
          -- For short queries, only search codes with prefix
          (a.iata ILIKE search_term || '%' OR a.icao ILIKE search_term || '%')
        ELSE
          -- For longer queries, include name and city
          (a.iata ILIKE search_term || '%' OR 
           a.icao ILIKE search_term || '%' OR 
           a.name ILIKE '%' || search_term || '%' OR 
           a.city ILIKE '%' || search_term || '%')
      END
    )
  ORDER BY
    -- Prioritize exact matches
    (a.iata = upper(search_term)) DESC,
    (a.icao = upper(search_term)) DESC,
    -- Then prefix matches
    (a.iata ILIKE search_term || '%') DESC,
    (a.icao ILIKE search_term || '%') DESC,
    -- Then alphabetical
    a.iata ASC
  LIMIT max_results;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_airports_fast(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_airports_fast(TEXT, INTEGER) TO anon;

-- Test the function
SELECT * FROM search_airports_fast('VIE', 5);
