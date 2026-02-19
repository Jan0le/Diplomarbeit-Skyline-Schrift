/**
 * 🛫 AIRPORT SERVICE - Performance-Optimized Airport Data
 * 
 * Primary data source: External API (Aviationstack)
 * - All airports are fetched from the API
 * - Selected airports are persisted to `public.airports` for foreign key references
 * - No hardcoded fallbacks - API is the single source of truth
 * 
 * Feature flags:
 * - USE_API_AIRPORTS=true: Use external API (fast, no DB overhead) - RECOMMENDED
 * - USE_API_AIRPORTS=false: Use Supabase database (requires CSV import) - Legacy fallback only
 */

import * as AirportAPI from './airportApiService';
import { Airport, supabase } from './db';

// Feature flag: Use API-based airports for better performance
const USE_API_AIRPORTS = process.env.EXPO_PUBLIC_USE_API_AIRPORTS !== 'false'; // Default to true

// Normalize API-airport shape to DB-airport shape (id must be number)
function mapApiAirportToDbAirport(a: any, index: number): Airport {
  return {
    id: typeof a?.id === 'number' ? a.id : Number(a?.id) || index + 1,
    icao: a?.icao ?? null,
    iata: a?.iata ?? null,
    name: a?.name ?? '',
    city: a?.city ?? null,
    country: a?.country ?? null,
    latitude: typeof a?.latitude === 'number' ? a.latitude : Number(a?.latitude) || 0,
    longitude: typeof a?.longitude === 'number' ? a.longitude : Number(a?.longitude) || 0,
  } as Airport;
}

/**
 * Autocomplete airports - main search function
 */
export async function autocompleteAirports(q: string, maxResults = 25): Promise<Airport[]> {
  if (USE_API_AIRPORTS) {
    // 🚀 USE API - NO DATABASE OVERHEAD
    try {
      const results = await AirportAPI.autocompleteAirports(q, maxResults);
      const arr = Array.isArray(results) ? results : [];
      return arr.map((a, i) => mapApiAirportToDbAirport(a, i));
    } catch (e) {
      return [] as Airport[];
    }
  }
  
  // Legacy database mode
  const query = q.trim();
  
  // For empty or very short queries, return popular airports (no DB call)
  if (!query || query.length < 2) {
    return [] as Airport[];
  }
  
  // Use optimized RPC function for 80k+ airports database
  const { data, error } = await supabase.rpc('autocomplete_airports_fast', {
    query_text: query,
    result_limit: maxResults
  });
  
  if (error) {
    // Fallback to popular airports if RPC fails
    return getPopularAirports(maxResults);
  }
  
  return (data || []) as Airport[];
}

/**
 * Get nearest airports to coordinates
 */
export async function nearestAirports(lon: number, lat: number, maxResults = 20): Promise<Airport[]> {
  if (USE_API_AIRPORTS) {
    // 🚀 USE API
    const res = await AirportAPI.nearestAirports(lon, lat, maxResults);
    return (res || []).map((a, i) => mapApiAirportToDbAirport(a, i));
  }
  
  // Legacy database mode
  const { data, error } = await supabase.rpc('nearest_airports', { lon, lat, max_results: maxResults });
  if (error) throw error;
  return (data || []) as Airport[];
}

/**
 * Get popular airports (instant, no API/DB call)
 */
export function getPopularAirports(maxResults: number): Airport[] {
  if (USE_API_AIRPORTS) {
    // Use API service's popular airports
    const res = AirportAPI.getPopularAirports(maxResults);
    return (res || []).map((a, i) => mapApiAirportToDbAirport(a, i));
  }
  
  // Legacy popular airports list
  const popularAirports: Airport[] = [
    { id: 1, iata: 'JFK', icao: 'KJFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'US', latitude: 40.6413, longitude: -73.7781 },
    { id: 2, iata: 'LAX', icao: 'KLAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'US', latitude: 33.9425, longitude: -118.4081 },
    { id: 3, iata: 'LHR', icao: 'EGLL', name: 'London Heathrow Airport', city: 'London', country: 'GB', latitude: 51.4700, longitude: -0.4543 },
    { id: 4, iata: 'CDG', icao: 'LFPG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'FR', latitude: 49.0097, longitude: 2.5479 },
    { id: 5, iata: 'FRA', icao: 'EDDF', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE', latitude: 50.0379, longitude: 8.5622 },
    { id: 6, iata: 'VIE', icao: 'LOWW', name: 'Vienna International Airport', city: 'Vienna', country: 'AT', latitude: 48.1103, longitude: 16.5697 },
    { id: 7, iata: 'ZRH', icao: 'LSZH', name: 'Zurich Airport', city: 'Zurich', country: 'CH', latitude: 47.4647, longitude: 8.5492 },
    { id: 8, iata: 'MAD', icao: 'LEMD', name: 'Adolfo Suárez Madrid-Barajas Airport', city: 'Madrid', country: 'ES', latitude: 40.4983, longitude: -3.5676 },
    { id: 9, iata: 'FCO', icao: 'LIRF', name: 'Leonardo da Vinci International Airport', city: 'Rome', country: 'IT', latitude: 41.8003, longitude: 12.2389 },
    { id: 10, iata: 'AMS', icao: 'EHAM', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'NL', latitude: 52.3105, longitude: 4.7683 },
    { id: 11, iata: 'BCN', icao: 'LEBL', name: 'Barcelona Airport', city: 'Barcelona', country: 'ES', latitude: 41.2974, longitude: 2.0833 },
    { id: 12, iata: 'MUC', icao: 'EDDM', name: 'Munich Airport', city: 'Munich', country: 'DE', latitude: 48.3538, longitude: 11.7861 },
    { id: 13, iata: 'DUB', icao: 'EIDW', name: 'Dublin Airport', city: 'Dublin', country: 'IE', latitude: 53.4264, longitude: -6.2499 },
    { id: 14, iata: 'CPH', icao: 'EKCH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'DK', latitude: 55.6180, longitude: 12.6500 },
    { id: 15, iata: 'ARN', icao: 'ESSA', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'SE', latitude: 59.6519, longitude: 17.9186 },
    { id: 16, iata: 'HEL', icao: 'EFHK', name: 'Helsinki Airport', city: 'Helsinki', country: 'FI', latitude: 60.3172, longitude: 24.9633 },
    { id: 17, iata: 'OSL', icao: 'ENGM', name: 'Oslo Airport', city: 'Oslo', country: 'NO', latitude: 60.1939, longitude: 11.1004 },
    { id: 18, iata: 'BRU', icao: 'EBBR', name: 'Brussels Airport', city: 'Brussels', country: 'BE', latitude: 50.9009, longitude: 4.4840 },
    { id: 19, iata: 'PRG', icao: 'LKPR', name: 'Václav Havel Airport Prague', city: 'Prague', country: 'CZ', latitude: 50.1008, longitude: 14.2633 },
    { id: 20, iata: 'BUD', icao: 'LHBP', name: 'Budapest Airport', city: 'Budapest', country: 'HU', latitude: 47.4394, longitude: 19.2618 },
  ];
  
  return popularAirports.slice(0, maxResults);
}

export async function airportsInBBox(minLon: number, minLat: number, maxLon: number, maxLat: number, maxResults = 1000): Promise<Airport[]> {
  // Query airports within bounding box
  const { data, error } = await supabase
    .from('airports')
    .select('id, icao, iata, name, city, country, latitude, longitude')
    .gte('longitude', minLon)
    .lte('longitude', maxLon)
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .not('iata', 'is', null) // Only airports with IATA codes
    .limit(maxResults);
  
  if (error) {
    throw error;
  }
  
  return (data || []) as Airport[];
}

// Fetch a single airport by IATA or ICAO code (exact match)
export async function getAirportByCode(code: string): Promise<Airport | null> {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('airports')
    .select('id, icao, iata, name, city, country, latitude, longitude')
    .or(`iata.eq.${normalized},icao.eq.${normalized}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as any) || null;
}

/**
 * Upsert an airport from API data into the database
 * - First checks if airport exists by IATA or ICAO
 * - If exists, returns the existing record
 * - If not, inserts new record
 * - Handles race conditions (unique constraint violations)
 */
export async function upsertAirportFromApi(apiAirport: AirportAPI.Airport): Promise<Airport> {
  // First, try to find existing airport by IATA or ICAO
  if (apiAirport.iata) {
    const existing = await getAirportByCode(apiAirport.iata);
    if (existing) {
      return existing;
    }
  }
  if (apiAirport.icao) {
    const existing = await getAirportByCode(apiAirport.icao);
    if (existing) {
      return existing;
    }
  }

  // Airport doesn't exist, insert it
  try {
    const { data, error } = await supabase
      .from('airports')
      .insert([{
        iata: apiAirport.iata || null,
        icao: apiAirport.icao || null,
        name: apiAirport.name || 'Unknown Airport',
        city: apiAirport.city || null,
        country: apiAirport.country || null,
        latitude: typeof apiAirport.latitude === 'number' ? apiAirport.latitude : (apiAirport.latitude ? Number(apiAirport.latitude) : 0),
        longitude: typeof apiAirport.longitude === 'number' ? apiAirport.longitude : (apiAirport.longitude ? Number(apiAirport.longitude) : 0),
        timezone: null, // Not provided by API
      }])
      .select('id, icao, iata, name, city, country, latitude, longitude')
      .single();

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        // Airport was inserted by another request, fetch it
        if (apiAirport.iata) {
          const existing = await getAirportByCode(apiAirport.iata);
          if (existing) return existing;
        }
        if (apiAirport.icao) {
          const existing = await getAirportByCode(apiAirport.icao);
          if (existing) return existing;
        }
      }
      throw error;
    }

    return {
      id: data.id,
      iata: data.iata,
      icao: data.icao,
      name: data.name,
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
    } as Airport;
  } catch (error: any) {
    // Final fallback: try to fetch again in case of race condition
    if (apiAirport.iata) {
      const existing = await getAirportByCode(apiAirport.iata);
      if (existing) return existing;
    }
    if (apiAirport.icao) {
      const existing = await getAirportByCode(apiAirport.icao);
      if (existing) return existing;
    }
    throw new Error(`Failed to upsert airport: ${error?.message || String(error)}`);
  }
}

/**
 * Ensure an airport exists in the database by code
 * - First tries to get from API
 * - Then upserts to database
 * - Returns the airport with database ID
 */
export async function ensureAirportByCode(code: string): Promise<Airport | null> {
  try {
    // Get airport from API
    const apiAirport = await AirportAPI.getAirportByCode(code);
    if (!apiAirport) {
      return null;
    }

    // Upsert to database
    return await upsertAirportFromApi(apiAirport);
  } catch (error) {
    if (__DEV__) console.error('Error ensuring airport by code:', error);
    return null;
  }
}

/**
 * Ensure an airport exists in the database from a selection
 * - Takes an airport object (usually from autocomplete)
 * - Upserts to database
 * - Returns the airport with database ID
 */
export async function ensureAirportForSelection(apiAirport: AirportAPI.Airport): Promise<Airport> {
  return await upsertAirportFromApi(apiAirport);
}
