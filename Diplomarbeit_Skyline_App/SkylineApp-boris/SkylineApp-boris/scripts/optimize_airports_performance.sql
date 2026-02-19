-- =============================================
-- 🚀 AIRPORT PERFORMANCE OPTIMIZATION
-- =============================================
-- Run this in Supabase SQL Editor to fix slow airport queries

-- 1. Enable trigram extension for fast text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create indexes for fast lookups
-- Exact match indexes for IATA/ICAO codes
CREATE INDEX IF NOT EXISTS airports_iata_idx ON airports(iata) WHERE iata IS NOT NULL AND iata != '';
CREATE INDEX IF NOT EXISTS airports_icao_idx ON airports(icao) WHERE icao IS NOT NULL AND icao != '';

-- Trigram indexes for fast text search on name and city
CREATE INDEX IF NOT EXISTS airports_name_trgm_idx ON airports USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS airports_city_trgm_idx ON airports USING gin (city gin_trgm_ops);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS airports_iata_name_idx ON airports(iata, name) WHERE iata IS NOT NULL AND iata != '';

-- 3. Update table statistics for better query planning
ANALYZE airports;

-- 4. Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'airports' 
ORDER BY indexname;

-- 5. Test query performance (run this to verify speed)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, iata, name, city, country, latitude, longitude
FROM airports 
WHERE iata IS NOT NULL 
  AND iata != ''
ORDER BY iata 
LIMIT 20;
