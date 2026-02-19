-- Speed up airport search with indexes

-- Enable pg_trgm extension for fast ILIKE on text
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Composite index to support common filters
CREATE INDEX IF NOT EXISTS airports_iata_idx ON airports (iata);
CREATE INDEX IF NOT EXISTS airports_icao_idx ON airports (icao);
CREATE INDEX IF NOT EXISTS airports_city_trgm_idx ON airports USING GIN (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS airports_name_trgm_idx ON airports USING GIN (name gin_trgm_ops);

-- Optional partial index to exclude null/empty iata for smaller index
CREATE INDEX IF NOT EXISTS airports_iata_nonempty_idx ON airports (iata) WHERE iata IS NOT NULL AND iata <> '';

-- Analyze table for better planner stats
ANALYZE airports;

