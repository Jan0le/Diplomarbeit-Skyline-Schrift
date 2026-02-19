-- Debug script to check airports data

-- 1. Total airports in table
SELECT 'Total airports:' as check_type, COUNT(*) as count FROM airports;

-- 2. Airports with IATA codes
SELECT 'Airports with IATA:' as check_type, COUNT(*) as count 
FROM airports 
WHERE iata IS NOT NULL AND iata != '';

-- 3. Airports with IATA AND city
SELECT 'Airports with IATA and city:' as check_type, COUNT(*) as count 
FROM airports 
WHERE iata IS NOT NULL AND iata != '' AND city IS NOT NULL;

-- 4. Sample of first 10 airports that match our query criteria
SELECT 'Sample airports (first 10):' as info;
SELECT id, icao, iata, name, city, country, latitude, longitude
FROM airports
WHERE iata IS NOT NULL 
  AND iata != ''
  AND city IS NOT NULL
ORDER BY iata ASC
LIMIT 10;

-- 5. Check for Vienna airport specifically
SELECT 'Vienna Airport (VIE):' as info;
SELECT id, icao, iata, name, city, country, latitude, longitude
FROM airports
WHERE iata = 'VIE' OR icao = 'LOWW' OR name ILIKE '%vienna%'
LIMIT 5;
