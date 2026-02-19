-- Fix airport search performance with proper indexes and RPC function

-- 1. Create indexes for fast prefix matching
CREATE INDEX IF NOT EXISTS airports_iata_btree ON airports (iata) WHERE iata IS NOT NULL AND iata != '';
CREATE INDEX IF NOT EXISTS airports_icao_btree ON airports (icao) WHERE icao IS NOT NULL AND icao != '';

-- 2. Create trigram indexes for fast ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS airports_city_trgm ON airports USING gin (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS airports_name_trgm ON airports USING gin (name gin_trgm_ops);

-- 3. Create a fast RPC function for airport search
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

-- 4. Update table statistics
ANALYZE airports;

-- 5. Test the function
SELECT 'Testing search_airports_fast function:' as test;
SELECT * FROM search_airports_fast('VI', 5);
