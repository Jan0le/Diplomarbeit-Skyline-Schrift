import { z } from 'zod';

// OCR.space response schema (simplified)
const ParsedResultSchema = z.object({ ParsedText: z.string().default('') });
const OcrSpaceSchema = z.object({
  ParsedResults: z.array(ParsedResultSchema).optional(),
  OCRExitCode: z.number().optional(),
  IsErroredOnProcessing: z.boolean().optional(),
  ErrorMessage: z.union([z.string(), z.array(z.string())]).optional(),
});

export type OcrResult = {
  ok: true;
  text: string;
} | {
  ok: false;
  error: string;
};

export async function runOcrSpace(base64ImageDataUrl: string, apiKey?: string): Promise<OcrResult> {
  try {
    const formData = new FormData();
    formData.append('apikey', apiKey || 'helloworld');
    formData.append('language', 'eng');
    formData.append('OCREngine', '2');
    formData.append('base64Image', base64ImageDataUrl);

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData as any,
    });
    const json = await res.json();
    const parsed = OcrSpaceSchema.safeParse(json);
    if (!parsed.success) return { ok: false, error: 'Invalid OCR response' };
    if (parsed.data.IsErroredOnProcessing) {
      const err = Array.isArray(parsed.data.ErrorMessage) ? parsed.data.ErrorMessage.join(', ') : (parsed.data.ErrorMessage || 'OCR processing error');
      return { ok: false, error: err };
    }
    const txt = parsed.data.ParsedResults?.[0]?.ParsedText ?? '';
    if (!txt.trim()) return { ok: false, error: 'No text recognized' };
    return { ok: true, text: txt };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'OCR request failed' };
  }
}

// Flight data extraction (moved from screen)
export type ExtractedFlight = {
  flightNumber?: string;
  from?: { iata: string };
  to?: { iata: string };
  date?: string; // ISO
  departureTime?: string;
  arrivalTime?: string;
};

export function extractFlightData(text: string): ExtractedFlight {
  const upper = text.replace(/\s+/g, ' ').toUpperCase();

  const flightMatch = upper.match(/\b([A-Z]{2,3})\s?-?\s?(\d{2,4}[A-Z]?)\b/);
  const flightNumber = flightMatch ? `${flightMatch[1]}${flightMatch[2]}` : undefined;

  let fromIata: string | undefined;
  let toIata: string | undefined;
  const routeMatch = upper.match(/\b([A-Z]{3})\b\s*(?:-|→|TO|>|–)\s*\b([A-Z]{3})\b/);
  if (routeMatch) {
    fromIata = routeMatch[1];
    toIata = routeMatch[2];
  } else {
    fromIata = upper.match(/\bDEP\s*[:\-]?\s*([A-Z]{3})\b/)?.[1];
    toIata = upper.match(/\bARR\s*[:\-]?\s*([A-Z]{3})\b/)?.[1];
    if (!fromIata || !toIata) {
      const allCodes = upper.match(/\b[A-Z]{3}\b/g) || [];
      if (allCodes.length >= 2) {
        fromIata = allCodes[0];
        toIata = allCodes.find(c => c !== fromIata);
      }
    }
  }

  const monthMap: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  let iso: string | undefined;
  const dmy = upper.match(/\b(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})\b/);
  const ymd = upper.match(/\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/);
  const dMonY = upper.match(/\b(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{2,4})\b/);
  const monDY = upper.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2}),?\s+(\d{2,4})\b/);
  if (dmy) {
    const d = parseInt(dmy[1], 10), m = parseInt(dmy[2], 10) - 1, y = parseInt(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3], 10);
    iso = new Date(Date.UTC(y, m, d)).toISOString();
  } else if (ymd) {
    const y = parseInt(ymd[1], 10), m = parseInt(ymd[2], 10) - 1, d = parseInt(ymd[3], 10);
    iso = new Date(Date.UTC(y, m, d)).toISOString();
  } else if (dMonY) {
    const d = parseInt(dMonY[1], 10), m = monthMap[dMonY[2]], y = parseInt(dMonY[3].length === 2 ? `20${dMonY[3]}` : dMonY[3], 10);
    if (m !== undefined) iso = new Date(Date.UTC(y, m, d)).toISOString();
  } else if (monDY) {
    const m = monthMap[monDY[1]], d = parseInt(monDY[2], 10), y = parseInt(monDY[3].length === 2 ? `20${monDY[3]}` : monDY[3], 10);
    if (m !== undefined) iso = new Date(Date.UTC(y, m, d)).toISOString();
  }

  const timeWithColon = (upper.match(/\b(\d{1,2}:\d{2})\b/g) || []) as string[];
  const timeCompact = (upper.match(/\b(\d{4})\b/g) || []) as string[];
  let depTime = upper.match(/DEP\s*[:\-]?\s*(\d{1,2}:\d{2})/)?.[1] || upper.match(/STD\s*[:\-]?\s*(\d{1,2}:\d{2})/)?.[1];
  let arrTime = upper.match(/ARR\s*[:\-]?\s*(\d{1,2}:\d{2})/)?.[1] || upper.match(/STA\s*[:\-]?\s*(\d{1,2}:\d{2})/)?.[1];
  if (!depTime && timeWithColon.length > 0) depTime = timeWithColon[0];
  if (!arrTime && timeWithColon.length > 1) arrTime = timeWithColon[1];
  const toHHMM = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`;
  if (!depTime && timeCompact.length > 0 && /^\d{4}$/.test(timeCompact[0])) depTime = toHHMM(timeCompact[0]);
  if (!arrTime && timeCompact.length > 1 && /^\d{4}$/.test(timeCompact[1])) arrTime = toHHMM(timeCompact[1]);

  return {
    flightNumber,
    from: fromIata ? { iata: fromIata } : undefined,
    to: toIata ? { iata: toIata } : undefined,
    date: iso,
    departureTime: depTime,
    arrivalTime: arrTime,
  };
}


