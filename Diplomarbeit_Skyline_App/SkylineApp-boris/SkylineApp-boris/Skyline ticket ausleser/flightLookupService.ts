type FlightTimes = {
  departureTime?: string; // HH:MM
  arrivalTime?: string;   // HH:MM
  departureActual?: string; // HH:MM
  arrivalActual?: string;   // HH:MM
  status?: string;
};

function toYYYYMMDD(isoLike: string): string {
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return isoLike.slice(0, 10);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toHHMM(dateString?: string | null): string | undefined {
  if (!dateString) return undefined;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return undefined;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseFlightNumberParts(fullNumber: string): { airlineCode?: string; flightNumber?: string } {
  const s = (fullNumber || '').trim().toUpperCase();
  const m = s.match(/^([A-Z]{2,3})\s*0*([0-9]{1,4}[A-Z]?)$/);
  if (!m) return {};
  return { airlineCode: m[1], flightNumber: m[2] };
}

export async function getFlightTimes(fullFlightNumber: string, isoDate: string): Promise<FlightTimes> {
  const key = process.env.EXPO_PUBLIC_AERODATABOX_API_KEY;
  if (!key) throw new Error('AeroDataBox key missing');

  const { airlineCode, flightNumber } = parseFlightNumberParts(fullFlightNumber);
  if (!airlineCode || !flightNumber) throw new Error('Invalid flight number');

  const date = toYYYYMMDD(isoDate);
  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(airlineCode + flightNumber)}/${encodeURIComponent(date)}?withLeg=true`;

  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) throw new Error(`AeroDataBox error ${res.status}`);

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid AeroDataBox response');
  }

  const first = Array.isArray(data) ? data[0] : (Array.isArray(data?.flights) ? data.flights[0] : data);
  if (!first) throw new Error('No flight data');

  const depScheduled = first?.departure?.scheduledTimeLocal || first?.departure?.scheduledTime || first?.departure?.scheduledTimeUtc;
  const arrScheduled = first?.arrival?.scheduledTimeLocal || first?.arrival?.scheduledTime || first?.arrival?.scheduledTimeUtc;
  const depActual = first?.departure?.actualTimeLocal || first?.departure?.actualTime || first?.departure?.actualTimeUtc;
  const arrActual = first?.arrival?.actualTimeLocal || first?.arrival?.actualTime || first?.arrival?.actualTimeUtc;
  const status = first?.status || first?.flightStatus || undefined;

  return {
    departureTime: toHHMM(depScheduled),
    arrivalTime: toHHMM(arrScheduled),
    departureActual: toHHMM(depActual),
    arrivalActual: toHHMM(arrActual),
    status,
  };
}


