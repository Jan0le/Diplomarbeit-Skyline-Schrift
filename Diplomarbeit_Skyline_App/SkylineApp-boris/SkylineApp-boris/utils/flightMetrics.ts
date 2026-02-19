import type { Airport, Flight } from '../types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineDistanceKm(from: Pick<Airport, 'latitude' | 'longitude'>, to: Pick<Airport, 'latitude' | 'longitude'>): number {
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c);
}

export function formatDistanceKm(distanceKm: number): string {
  const km = Number.isFinite(distanceKm) ? Math.max(0, Math.round(distanceKm)) : 0;
  return `${km.toLocaleString()} km`;
}

export function parseDistanceKm(distance?: string | null, distanceKm?: number | null): number {
  if (typeof distanceKm === 'number' && Number.isFinite(distanceKm)) return Math.round(distanceKm);
  if (!distance) return 0;
  const digits = String(distance).replace(/[^\d]/g, '').match(/(\d+)/);
  const parsed = digits ? parseInt(digits[1], 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseDurationToMinutes(duration?: string | null): number {
  if (!duration) return 0;
  const s = String(duration).trim().toLowerCase();

  // Common format: "2h 30m"
  const hm = s.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
  if (hm) {
    const h = parseInt(hm[1], 10);
    const m = hm[2] ? parseInt(hm[2], 10) : 0;
    return Math.max(0, h * 60 + m);
  }

  // "150m"
  const onlyM = s.match(/(\d+)\s*m\b/i);
  if (onlyM) return Math.max(0, parseInt(onlyM[1], 10));

  // Legacy: "2.5 hours" or "2.5h"
  const hoursFloat = s.match(/(\d+(?:\.\d+)?)\s*(hours|hour|h)\b/i);
  if (hoursFloat) {
    const h = parseFloat(hoursFloat[1]);
    return Number.isFinite(h) ? Math.max(0, Math.round(h * 60)) : 0;
  }

  return 0;
}

export function computeDurationMinutesFromTimestamps(departureAt?: string, arrivalAt?: string): number {
  if (!departureAt || !arrivalAt) return 0;
  const start = new Date(departureAt);
  const end = new Date(arrivalAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / 60000);
}

export function computeFlightDurationMinutes(flight: Pick<Flight, 'departureAt' | 'arrivalAt' | 'duration'>): number {
  const byTimes = computeDurationMinutesFromTimestamps(flight.departureAt, flight.arrivalAt);
  if (byTimes > 0) return byTimes;
  return parseDurationToMinutes(flight.duration);
}

/**
 * Returns the effective status for display. Flights that have passed (arrival/departure/date in the past)
 * should show "completed" instead of "upcoming".
 */
export function getEffectiveFlightStatus(flight: Pick<Flight, 'status' | 'departureAt' | 'arrivalAt' | 'date'>): 'upcoming' | 'completed' | 'cancelled' {
  if (flight.status === 'cancelled') return 'cancelled';

  const now = Date.now();
  const endMs = flight.arrivalAt
    ? new Date(flight.arrivalAt).getTime()
    : flight.departureAt
      ? new Date(flight.departureAt).getTime()
      : new Date(flight.date).getTime();

  if (Number.isNaN(endMs)) return (flight.status as 'upcoming' | 'completed') || 'upcoming';
  if (endMs < now) return 'completed';
  return (flight.status as 'upcoming' | 'completed') || 'upcoming';
}





