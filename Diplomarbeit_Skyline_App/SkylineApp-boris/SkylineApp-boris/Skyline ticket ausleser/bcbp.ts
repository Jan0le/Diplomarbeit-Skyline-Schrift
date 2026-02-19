export type ParsedBCBP = {
  passenger: { name: string | null };
  flight: {
    number: string | null;
    date: string | null; // YYYY-MM-DD
    departure: { airport: string | null; datetime: string | null };
    arrival: { airport: string | null; datetime: string | null };
    status?: string | null;
  };
  seat: string | null;
  pnr: string | null;
};

export function julianToISODate(julian: string | number | null | undefined): string | null {
  if (julian === null || julian === undefined) return null;
  const dayNum = Number(julian);
  if (!Number.isFinite(dayNum) || dayNum <= 0) return null;
  const now = new Date();
  const year = now.getUTCFullYear();
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const date = new Date(firstDay);
  date.setUTCDate(dayNum);
  return date.toISOString().slice(0, 10);
}

function normalizeName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s) return null;
  if (s.includes('/')) {
    const [last, rest] = s.split('/');
    const first = (rest || '').split(' ')[0] || '';
    const full = `${first.trim()} ${last.trim()}`.trim();
    return full || s;
  }
  return s;
}

export function parseBCBP(raw: string): ParsedBCBP | null {
  const s = (raw ?? '').toString().trim();
  if (!s || s.length < 58 || s[0] !== 'M') return null;
  try {
    const nameRaw = s.substring(2, 22);
    const pnr = s.substring(23, 30).trim() || null;
    const from = s.substring(30, 33).trim() || null;
    const to = s.substring(33, 36).trim() || null;
    const carrier = s.substring(36, 39).trim();
    const flightNoRaw = s.substring(39, 44).trim();
    const julian = s.substring(44, 47).trim();
    const seat = s.substring(48, 52).trim() || null;

    const name = normalizeName(nameRaw);
    const flightNoNum = flightNoRaw.replace(/^0+/, '') || flightNoRaw;
    const flightNo = `${carrier}${flightNoNum}`;
    const flightDate = julianToISODate(julian);

    return {
      passenger: { name: name || null },
      flight: {
        number: flightNo || null,
        date: flightDate || null,
        departure: { airport: from, datetime: null },
        arrival: { airport: to, datetime: null },
      },
      seat,
      pnr,
    };
  } catch {
    return null;
  }
}


