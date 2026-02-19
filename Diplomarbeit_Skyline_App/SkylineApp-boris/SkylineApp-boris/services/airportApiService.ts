/**
 * 🛫 AIRPORT API SERVICE - High-Performance Airport Data
 * 
 * Uses Aviationstack API for:
 * - Instant autocomplete without database overhead
 * - Always up-to-date airport information
 * - No CSV imports or database maintenance required
 * - Reduced app bundle size
 * 
 * Credit-friendly implementation:
 * - Requires >= 3 characters to make API calls
 * - 7-day cache per query
 * - 300ms minimum interval between API calls
 * - Static popular airports for offline/emergency use
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Airport {
  id: number | string;
  iata: string | null;
  icao: string | null;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

// Cache configuration
const CACHE_KEY_PREFIX = 'airport_cache_';
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// API Configuration
const AVIATIONSTACK_API_KEY = process.env.EXPO_PUBLIC_AVIATIONSTACK_KEY || process.env.AVIATIONSTACK_KEY;

// Rate limiting
let lastApiCall = 0;
const MIN_API_INTERVAL_MS = 300; // Minimum 300ms between API calls

// Track and cancel in-flight search
let activeController: AbortController | null = null;
const inFlight = new Map<string, Promise<Airport[]>>();
const memoryCache = new Map<string, { ts: number; data: Airport[] }>();

/**
 * Popular airports - used as fallback and for initial display
 * No API call needed for these
 */
export const POPULAR_AIRPORTS: Airport[] = [
  { id: 'JFK', iata: 'JFK', icao: 'KJFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', latitude: 40.6413, longitude: -73.7781 },
  { id: 'LAX', iata: 'LAX', icao: 'KLAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', latitude: 33.9425, longitude: -118.4081 },
  { id: 'LHR', iata: 'LHR', icao: 'EGLL', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', latitude: 51.4700, longitude: -0.4543 },
  { id: 'CDG', iata: 'CDG', icao: 'LFPG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', latitude: 49.0097, longitude: 2.5479 },
  { id: 'FRA', iata: 'FRA', icao: 'EDDF', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', latitude: 50.0379, longitude: 8.5622 },
  { id: 'VIE', iata: 'VIE', icao: 'LOWW', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria', latitude: 48.1103, longitude: 16.5697 },
  { id: 'ZRH', iata: 'ZRH', icao: 'LSZH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', latitude: 47.4647, longitude: 8.5492 },
  { id: 'MAD', iata: 'MAD', icao: 'LEMD', name: 'Adolfo Suárez Madrid-Barajas Airport', city: 'Madrid', country: 'Spain', latitude: 40.4983, longitude: -3.5676 },
  { id: 'FCO', iata: 'FCO', icao: 'LIRF', name: 'Leonardo da Vinci International Airport', city: 'Rome', country: 'Italy', latitude: 41.8003, longitude: 12.2389 },
  { id: 'AMS', iata: 'AMS', icao: 'EHAM', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', latitude: 52.3105, longitude: 4.7683 },
  { id: 'BCN', iata: 'BCN', icao: 'LEBL', name: 'Barcelona Airport', city: 'Barcelona', country: 'Spain', latitude: 41.2974, longitude: 2.0833 },
  { id: 'MUC', iata: 'MUC', icao: 'EDDM', name: 'Munich Airport', city: 'Munich', country: 'Germany', latitude: 48.3538, longitude: 11.7861 },
  { id: 'DXB', iata: 'DXB', icao: 'OMDB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', latitude: 25.2532, longitude: 55.3657 },
  { id: 'SIN', iata: 'SIN', icao: 'WSSS', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', latitude: 1.3644, longitude: 103.9915 },
  { id: 'HKG', iata: 'HKG', icao: 'VHHH', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', latitude: 22.3080, longitude: 113.9185 },
  { id: 'NRT', iata: 'NRT', icao: 'RJAA', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', latitude: 35.7720, longitude: 140.3929 },
  { id: 'SYD', iata: 'SYD', icao: 'YSSY', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', latitude: -33.9399, longitude: 151.1753 },
  { id: 'YYZ', iata: 'YYZ', icao: 'CYYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', latitude: 43.6777, longitude: -79.6248 },
  { id: 'ORD', iata: 'ORD', icao: 'KORD', name: "Chicago O'Hare International Airport", city: 'Chicago', country: 'United States', latitude: 41.9742, longitude: -87.9073 },
  { id: 'ATL', iata: 'ATL', icao: 'KATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', latitude: 33.6407, longitude: -84.4277 },
  { id: 'DFW', iata: 'DFW', icao: 'KDFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'United States', latitude: 32.8998, longitude: -97.0403 },
  { id: 'SFO', iata: 'SFO', icao: 'KSFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', latitude: 37.6213, longitude: -122.3790 },
  { id: 'SEA', iata: 'SEA', icao: 'KSEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States', latitude: 47.4502, longitude: -122.3088 },
  { id: 'MIA', iata: 'MIA', icao: 'KMIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', latitude: 25.7959, longitude: -80.2870 },
  { id: 'BOS', iata: 'BOS', icao: 'KBOS', name: 'Boston Logan International Airport', city: 'Boston', country: 'United States', latitude: 42.3656, longitude: -71.0096 },
];

/**
 * Cache management
 */
async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    if (age > CACHE_DURATION_MS) {
      // Cache expired
      await AsyncStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }

    return parsed.data as T;
  } catch (error) {
    return null;
  }
}

async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const cacheData = {
      timestamp: Date.now(),
      data,
    };
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData));
  } catch (error) {
    // Error handled silently
  }
}

/**
 * Rate limiting helper
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < MIN_API_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_API_INTERVAL_MS - timeSinceLastCall));
  }
  
  lastApiCall = Date.now();
}

/**
 * Search airports using Aviationstack API
 * Credit-friendly strategy:
 * - Require >= 3 characters to hit network
 * - 7-day cached by query+limit
 * - 300ms min interval global throttle
 * 
 * Data mapping aligns with database schema:
 * - id: number | string (temporary ID for UI, DB uses bigint auto-increment)
 * - iata: text (nullable, unique in DB)
 * - icao: text (nullable, unique in DB)
 * - name: text NOT NULL (required)
 * - city: text (nullable)
 * - country: text (nullable)
 * - latitude: numeric (in DB, number here)
 * - longitude: numeric (in DB, number here)
 */
async function searchAviationstack(query: string, limit: number): Promise<Airport[]> {
  if (!AVIATIONSTACK_API_KEY) {
    return [];
  }

  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  await rateLimit();

  // Build URL. Prefer exact code filters when user types codes
  const pageSize = Math.max(1, Math.min(100, limit || 25));
  // Free tier requires HTTP, HTTPS can return 403
  const url = new URL('http://api.aviationstack.com/v1/airports');
  url.searchParams.set('access_key', AVIATIONSTACK_API_KEY);
  url.searchParams.set('limit', String(pageSize));
  const upper = trimmed.toUpperCase();
  const isIata = /^[A-Z]{3}$/.test(upper);
  const isIcao = /^[A-Z]{4}$/.test(upper);
  if (isIata) {
    url.searchParams.set('iata_code', upper);
  } else if (isIcao) {
    url.searchParams.set('icao_code', upper);
  } else {
    url.searchParams.set('search', trimmed);
  }

  // Abort after 4s to keep UI snappy
  if (activeController) {
    try { activeController.abort(); } catch {}
  }
  const controller = new AbortController();
  activeController = controller;
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  let response: Response | null = null;
  try {
    response = await fetch(url.toString(), { signal: controller.signal });
  } catch (e) {
    clearTimeout(timeoutId);
    if (activeController === controller) activeController = null;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Aviationstack timeout after 4s');
    }
    throw new Error(`Aviationstack fetch failed: ${String(e)}`);
  } finally {
    clearTimeout(timeoutId);
    if (activeController === controller) activeController = null;
  }

  if (!response || !response.ok) {
    let info = '';
    try { info = await response?.text() as string; } catch {}
    throw new Error(`Aviationstack API error: ${response?.status || 'unknown'}${info ? ` - ${info}` : ''}`);
  }

  const json: any = await response.json();
  if (json?.error) {
    const info = json.error?.info || json.error?.type || 'unknown error';
    throw new Error(`Aviationstack error: ${info}`);
  }
  const items: any[] = Array.isArray(json?.data) ? json.data : [];

  // Transform to our Airport format, ensuring DB schema compliance
  return items.map((item: any, index: number) => {
    // Ensure name is never empty (required in DB)
    const airportName = item.airport_name || item.airport || item.name || `Airport ${index + 1}`;
    
    return {
      // Use IATA or ICAO as temporary ID, fallback to generated string
      // DB will assign bigint id when saved
      id: item.iata_code || item.icao_code || `as-${index}`,
      // Map to DB schema: iata (text, nullable, unique)
      iata: item.iata_code || null,
      // Map to DB schema: icao (text, nullable, unique)
      icao: item.icao_code || null,
      // Map to DB schema: name (text NOT NULL)
      name: airportName,
      // Map to DB schema: city (text, nullable) – fallback to airport name for UI formatting
      city: item.city_iata_code ? null : (item.city || item.municipality || item.airport_name || null),
      // Map to DB schema: country (text, nullable)
      country: item.country_name || item.country || null,
      // Map to DB schema: latitude (numeric)
      latitude: typeof item.latitude === 'number' ? item.latitude : (item.latitude ? Number(item.latitude) : 0),
      // Map to DB schema: longitude (numeric)
      longitude: typeof item.longitude === 'number' ? item.longitude : (item.longitude ? Number(item.longitude) : 0),
    };
  });
}

/**
 * Filter popular airports by query (instant, no API call)
 */
function filterPopularAirports(query: string, limit: number): Airport[] {
  const upperQuery = query.toUpperCase().trim();
  
  if (!upperQuery) {
    return POPULAR_AIRPORTS.slice(0, limit);
  }

  return POPULAR_AIRPORTS
    .filter(airport => 
      airport.iata?.toUpperCase().startsWith(upperQuery) ||
      airport.icao?.toUpperCase().startsWith(upperQuery) ||
      airport.name.toUpperCase().includes(upperQuery) ||
      airport.city?.toUpperCase().includes(upperQuery)
    )
    .slice(0, limit);
}

/**
 * Main autocomplete function - uses Aviationstack API
 */
export async function autocompleteAirports(query: string, maxResults = 25): Promise<Airport[]> {
  const trimmedQuery = query.trim();
  
  // For empty or very short queries, return empty (no hardcoded fallbacks)
  if (!trimmedQuery || trimmedQuery.length < 2) {
    return [];
  }

  // Check cache first
  const cacheKey = `search_${trimmedQuery.toLowerCase()}_${maxResults}`;
  // Memory cache first to coalesce repeated queries within a short time
  const mem = memoryCache.get(cacheKey);
  if (mem && Date.now() - mem.ts < MEMORY_CACHE_TTL_MS) {
    return mem.data;
  }
  const cached = await getCachedData<Airport[]>(cacheKey);
  
  if (cached) {
    memoryCache.set(cacheKey, { ts: Date.now(), data: cached });
    return cached;
  }

  try {
    // Deduplicate in-flight requests for the same key
    if (inFlight.has(cacheKey)) {
      return await inFlight.get(cacheKey)!;
    }
    const p = searchAviationstack(trimmedQuery, maxResults);
    inFlight.set(cacheKey, p);
    const results = await p;
    inFlight.delete(cacheKey);
    if (results.length > 0) {
      await setCachedData(cacheKey, results);
      memoryCache.set(cacheKey, { ts: Date.now(), data: results });
      return results;
    }
  } catch (error) {
    inFlight.delete(cacheKey);
  }

  // If API fails, return empty results (don't fallback to popular airports in search mode)
  // User should see empty results if API fails
  return [];
}

/**
 * Get popular airports (instant, no API call)
 */
export function getPopularAirports(maxResults: number): Airport[] {
  return POPULAR_AIRPORTS.slice(0, maxResults);
}

/**
 * Get airport by exact IATA or ICAO code
 */
export async function getAirportByCode(code: string): Promise<Airport | null> {
  const upperCode = code.trim().toUpperCase();
  
  // Check popular airports first (instant)
  const popular = POPULAR_AIRPORTS.find(
    a => a.iata === upperCode || a.icao === upperCode
  );
  
  if (popular) {
    return popular;
  }

  // Search via API
  const results = await autocompleteAirports(code, 5);
  return results.find(a => a.iata === upperCode || a.icao === upperCode) || null;
}

/**
 * Get nearest airports to coordinates (for map view)
 */
export async function nearestAirports(lon: number, lat: number, maxResults = 20): Promise<Airport[]> {
  // Calculate distance between two points
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // For now, use popular airports sorted by distance
  // In production, you'd use a geospatial API or database
  const airportsWithDistance = POPULAR_AIRPORTS.map(airport => ({
    ...airport,
    distance: getDistance(lat, lon, airport.latitude, airport.longitude),
  }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults)
    .map(({ distance, ...airport }) => airport); // Remove distance field

  return airportsWithDistance;
}

/**
 * Clear all cached airport data
 */
export async function clearAirportCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    // Error handled silently
  }
}