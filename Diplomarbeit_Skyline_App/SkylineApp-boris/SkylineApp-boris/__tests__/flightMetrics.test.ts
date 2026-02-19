import {
  computeDurationMinutesFromTimestamps,
  computeFlightDurationMinutes,
  formatDistanceKm,
  haversineDistanceKm,
  parseDurationToMinutes,
  parseDistanceKm,
} from '../utils/flightMetrics';

describe('flightMetrics', () => {
  it('haversineDistanceKm returns ~0 for same point', () => {
    expect(haversineDistanceKm({ latitude: 48.0, longitude: 16.0 }, { latitude: 48.0, longitude: 16.0 })).toBe(0);
  });

  it('formatDistanceKm formats with km suffix', () => {
    expect(formatDistanceKm(1234)).toContain('km');
  });

  it('parseDistanceKm prefers distanceKm numeric', () => {
    expect(parseDistanceKm('999 km', 120)).toBe(120);
  });

  it('parseDurationToMinutes parses "2h 30m"', () => {
    expect(parseDurationToMinutes('2h 30m')).toBe(150);
  });

  it('computeDurationMinutesFromTimestamps handles valid ISO', () => {
    expect(computeDurationMinutesFromTimestamps('2026-01-01T10:00:00Z', '2026-01-01T12:30:00Z')).toBe(150);
  });

  it('computeFlightDurationMinutes prefers timestamps over duration string', () => {
    expect(
      computeFlightDurationMinutes({
        departureAt: '2026-01-01T10:00:00Z',
        arrivalAt: '2026-01-01T11:00:00Z',
        duration: '5h',
      })
    ).toBe(60);
  });
});





