// Input validation shared by client forms and server route handlers.

export const PNR_RE = /^\d{10}$/;
export const TRAIN_NO_RE = /^\d{5}$/;
/** Airline IATA (2 chars, may contain a digit) or ICAO (3 letters) + 1-4 digit number + optional suffix letter */
export const FLIGHT_NO_RE = /^([A-Z0-9]{2}|[A-Z]{3})\s?(\d{1,4})([A-Z])?$/;
export const STATION_CODE_RE = /^[A-Z]{1,5}$/;
export const IATA_RE = /^[A-Z]{3}$/;
export const ICAO_RE = /^[A-Z]{4}$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeFlightNumber(input: string): string | null {
  const v = input.trim().toUpperCase().replace(/[\s-]+/g, "");
  const m = v.match(/^([A-Z0-9]{2}|[A-Z]{3})(\d{1,4})([A-Z])?$/);
  if (!m) return null;
  // Two-char IATA codes can't both be digits
  if (/^\d\d$/.test(m[1])) return null;
  return `${m[1]}${m[2]}${m[3] ?? ""}`;
}

export function normalizePnr(input: string): string | null {
  const v = input.replace(/[\s-]/g, "");
  return PNR_RE.test(v) ? v : null;
}

export function normalizeTrainNumber(input: string): string | null {
  const v = input.trim();
  return TRAIN_NO_RE.test(v) ? v : null;
}

export function normalizeStationCode(input: string): string | null {
  const v = input.trim().toUpperCase();
  return STATION_CODE_RE.test(v) ? v : null;
}

export function normalizeAirportCode(input: string): string | null {
  const v = input.trim().toUpperCase();
  return IATA_RE.test(v) || ICAO_RE.test(v) ? v : null;
}

export function isValidDate(input: string): boolean {
  if (!DATE_RE.test(input)) return false;
  const d = new Date(input + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === input;
}

/** Days between two YYYY-MM-DD strings (b - a) */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

/** IANA time zone name, e.g. "Asia/Kolkata" or "America/Argentina/Buenos_Aires" */
export const TZ_RE = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/;

/** Free-text query for suggestions: letters, digits, spaces and a few punctuation marks (commas separate "place, city") */
export function sanitizeQuery(input: string, max = 60): string {
  return input.replace(/[^\p{L}\p{N}\s.,\-'()]/gu, "").replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, max);
}
