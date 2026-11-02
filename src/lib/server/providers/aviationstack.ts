import "server-only";
import type { AirportBoard, AirportRef, BoardFlight, Flight, FlightEnd, FlightSearchResult, FlightStatus } from "@/lib/types";
import { findAirport } from "@/lib/data/airports";
import { ApiError } from "../errors";
import { fetchJson } from "../http";
import { arr, get, num, obj, str } from "../pick";

// Aviationstack (https://aviationstack.com/documentation): real-time flights.
// The free plan is HTTP-only and returns current flights only (no future
// schedules or history), so dates are limited to around today.

const SOURCE = "Aviationstack";
export const flightSource = SOURCE;

function config() {
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!key) throw new ApiError("NOT_CONFIGURED", "Live flight information is not available right now (flight data provider not configured).");
  return { key, base: process.env.AVIATIONSTACK_BASE_URL || "http://api.aviationstack.com/v1" };
}

async function flights(params: Record<string, string>): Promise<unknown[]> {
  const { key, base } = config();
  const qs = new URLSearchParams({ access_key: key, limit: "100", ...params });
  const raw = await fetchJson(`${base}/flights?${qs}`, {
    timeoutMs: 15_000,
    onStatus: (status) => {
      if (status === 429) throw new ApiError("UNAVAILABLE", "The flight data provider's monthly request limit has been reached.");
    },
  });
  const err = obj(get(raw, "error"));
  if (err) {
    const code = str(err, "code") ?? "";
    if (/usage_limit|rate_limit/.test(code)) throw new ApiError("UNAVAILABLE", "The flight data provider's request limit has been reached.");
    if (/access_key|function_access|https_access/.test(code)) throw new ApiError("UNAVAILABLE", "Live flight information is unavailable (provider access error).");
    if (/validation/.test(code)) throw new ApiError("INVALID_INPUT", "The flight data provider rejected this search.");
    throw new ApiError("SERVICE_FAILURE", "The flight data provider returned an error.");
  }
  return arr(get(raw, "data"));
}

// ---------- normalization ----------

/**
 * Aviationstack reports airport-local wall-clock times but labels them
 * "+00:00". Re-attach the real UTC offset of the airport's time zone.
 */
function localIso(v: string | undefined, timeZone: string | undefined): string | undefined {
  if (!v) return undefined;
  const wall = v.slice(0, 16); // YYYY-MM-DDTHH:mm
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall)) return undefined;
  if (!timeZone) return Number.isNaN(Date.parse(v)) ? undefined : v;
  try {
    const guess = new Date(`${wall}:00Z`);
    const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(guess)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const m = name.match(/GMT([+-]\d{2}):?(\d{2})?/);
    const offset = m ? `${m[1]}:${m[2] ?? "00"}` : "+00:00";
    return `${wall}:00${offset}`;
  } catch {
    return v;
  }
}

function airportOf(o: unknown): AirportRef {
  const iata = str(o, "iata");
  const ref = findAirport(iata ?? str(o, "icao"));
  return {
    iata,
    icao: str(o, "icao") ?? ref?.icao,
    name: str(o, "airport") ?? ref?.name ?? iata ?? "Unknown airport",
    city: ref?.city,
    countryCode: ref?.countryCode,
    timeZone: str(o, "timezone") ?? ref?.timeZone,
    lat: ref?.lat,
    lon: ref?.lon,
  };
}

function endOf(o: unknown): FlightEnd {
  const airport = airportOf(o);
  const tz = airport.timeZone;
  const scheduled = localIso(str(o, "scheduled"), tz);
  const actual = localIso(str(o, "actual", "actual_runway"), tz);
  const estimated = localIso(str(o, "estimated", "estimated_runway"), tz);
  const end: FlightEnd = {
    airport,
    terminal: str(o, "terminal"),
    gate: str(o, "gate"),
    baggageBelt: str(o, "baggage"),
  };
  if (scheduled) end.scheduled = { value: scheduled, kind: "scheduled" };
  if (actual) end.actual = { value: actual, kind: "actual" };
  else if (estimated && estimated !== scheduled) end.estimated = { value: estimated, kind: "estimated" };
  const best = end.actual?.value ?? end.estimated?.value;
  end.delayMinutes = num(o, "delay") ?? (scheduled && best ? Math.round((Date.parse(best) - Date.parse(scheduled)) / 60_000) : undefined);
  return end;
}

function mapStatus(raw: string | undefined, depDelay: number | undefined, isGround: boolean | undefined): FlightStatus {
  switch ((raw ?? "").toLowerCase()) {
    case "scheduled":
      return (depDelay ?? 0) >= 15 ? "Delayed" : "Scheduled";
    case "active":
      return isGround ? "Departed" : "In Air";
    case "landed":
      return "Landed";
    case "cancelled":
      return "Cancelled";
    case "diverted":
      return "Diverted";
    default:
      return "Unknown";
  }
}

function computeProgress(f: Flight): number | undefined {
  if (f.status === "Landed") return 1;
  if (f.status !== "In Air" && f.status !== "Departed") return 0;
  const dep = f.departure.actual?.value ?? f.departure.estimated?.value ?? f.departure.scheduled?.value;
  const arrT = f.arrival.estimated?.value ?? f.arrival.scheduled?.value;
  if (!dep || !arrT) return undefined;
  const p = (Date.now() - Date.parse(dep)) / (Date.parse(arrT) - Date.parse(dep));
  return Number.isFinite(p) ? Math.min(0.98, Math.max(0.02, p)) : undefined;
}

function toFlight(raw: unknown): Flight & { flightDate?: string } {
  const departure = endOf(get(raw, "departure"));
  const arrival = endOf(get(raw, "arrival"));
  const live = obj(get(raw, "live"));
  const rawStatus = str(raw, "flight_status");
  const status = mapStatus(rawStatus, departure.delayMinutes, live?.is_ground === true);
  const lat = num(live, "latitude");
  const lon = num(live, "longitude");
  const altM = num(live, "altitude");
  const speedKmh = num(live, "speed_horizontal");
  const updated = str(live, "updated");

  const f: Flight & { flightDate?: string } = {
    number: str(raw, "flight.iata", "flight.icao") ?? "",
    airline: { name: str(raw, "airline.name") ?? "Unknown airline", iata: str(raw, "airline.iata"), icao: str(raw, "airline.icao") },
    status,
    rawStatus,
    departure,
    arrival,
    aircraft: str(raw, "aircraft.iata", "aircraft.registration")
      ? { model: str(raw, "aircraft.iata", "aircraft.icao"), registration: str(raw, "aircraft.registration") }
      : undefined,
    position:
      lat !== undefined && lon !== undefined
        ? {
            lat,
            lon,
            altitudeFt: altM !== undefined ? altM * 3.28084 : undefined,
            groundSpeedKt: speedKmh !== undefined ? speedKmh / 1.852 : undefined,
            trackDeg: num(live, "direction"),
            reportedAt: updated && !Number.isNaN(Date.parse(updated)) ? updated : undefined,
          }
        : undefined,
    lastUpdated: updated,
    flightDate: str(raw, "flight_date"),
  };
  f.progress = computeProgress(f);
  return f;
}

const isCodeshare = (raw: unknown) => Boolean(obj(get(raw, "flight.codeshared")));

// ---------- public API ----------

export type DatedFlight = Flight & { flightDate?: string };

/** All recent operations of a flight number (one provider request). */
export async function getFlightsByNumber(number: string): Promise<DatedFlight[]> {
  const isIcao = /^[A-Z]{3}\d/.test(number);
  const raw = await flights(isIcao ? { flight_icao: number } : { flight_iata: number });
  return raw.map(toFlight).filter((f) => f.number);
}

/** The operations on a given date, or a NO_RESULTS / INVALID_FLIGHT error explaining what exists. */
export function flightsOnDate(all: DatedFlight[], number: string, date: string): Flight[] {
  const onDate = all.filter((f) => !f.flightDate || f.flightDate === date);
  if (!onDate.length) {
    const dates = [...new Set(all.map((f) => f.flightDate).filter(Boolean))].sort().join(", ");
    throw new ApiError(
      all.length ? "NO_RESULTS" : "INVALID_FLIGHT",
      all.length
        ? `No ${number} flight was found on ${date}. Live data is available for: ${dates}.`
        : `No current flight ${number} was found. Check the flight number. Our live source only covers flights operating around today.`,
    );
  }
  return onDate.map(({ flightDate: _d, ...f }) => f);
}

function boardItem(raw: unknown, direction: "departure" | "arrival"): BoardFlight {
  const f = toFlight(raw);
  const local = direction === "departure" ? f.departure : f.arrival;
  const other = direction === "departure" ? f.arrival : f.departure;
  return {
    number: f.number,
    airline: { name: f.airline.name, iata: f.airline.iata },
    status: f.status,
    otherAirport: other.airport,
    scheduled: local.scheduled,
    estimated: local.estimated,
    actual: local.actual,
    terminal: local.terminal,
    gate: local.gate,
    aircraftModel: f.aircraft?.model,
    otherScheduled: other.scheduled,
  };
}

/** Current arrivals and departures. Costs two provider requests, so callers should cache it. */
export async function getAirportBoard(code: string, _timeZone: string): Promise<AirportBoard> {
  const key = code.length === 4 ? "icao" : "iata";
  const [deps, arrs] = await Promise.all([flights({ [`dep_${key}`]: code }), flights({ [`arr_${key}`]: code })]);
  const byTime = (a: BoardFlight, b: BoardFlight) => Date.parse(a.scheduled?.value ?? "") - Date.parse(b.scheduled?.value ?? "");
  const now = Date.now();
  // Keep flights from 1 hour ago onward, as the provider returns a broad window
  const recent = (f: BoardFlight) => {
    const t = Date.parse((f.actual ?? f.estimated ?? f.scheduled)?.value ?? "");
    return Number.isNaN(t) || t >= now - 60 * 60_000;
  };
  const departures = deps.filter((r) => !isCodeshare(r)).map((r) => boardItem(r, "departure")).filter((f) => f.number && recent(f)).sort(byTime);
  const arrivals = arrs.filter((r) => !isCodeshare(r)).map((r) => boardItem(r, "arrival")).filter((f) => f.number && recent(f)).sort(byTime);
  const stamps = [...departures, ...arrivals].map((f) => f.scheduled?.value).filter(Boolean) as string[];
  return {
    airport: code,
    departures,
    arrivals,
    windowFrom: stamps.sort()[0] ?? new Date(now).toISOString(),
    windowTo: stamps.sort().at(-1) ?? new Date(now).toISOString(),
  };
}

/** Direct flights between two airports among the provider's current flights. One provider request. */
export async function searchFlights(fromCode: string, toCode: string, date: string): Promise<FlightSearchResult[]> {
  const raw = await flights({ dep_iata: fromCode, arr_iata: toCode });
  const seen = new Set<string>();
  const results: FlightSearchResult[] = [];
  for (const r of raw) {
    if (isCodeshare(r)) continue;
    const f = toFlight(r);
    if (!f.number || seen.has(f.number) || (f.flightDate && f.flightDate !== date)) continue;
    seen.add(f.number);
    const dep = f.departure.scheduled;
    const arrT = f.arrival.scheduled;
    results.push({
      number: f.number,
      airline: { name: f.airline.name, iata: f.airline.iata },
      from: f.departure.airport,
      to: f.arrival.airport,
      departure: dep,
      arrival: arrT,
      durationMinutes: dep && arrT ? Math.round((Date.parse(arrT.value) - Date.parse(dep.value)) / 60_000) : undefined,
      stops: 0,
      status: f.status,
      aircraftModel: f.aircraft?.model,
    });
  }
  if (!results.length) throw new ApiError("NO_RESULTS", `No direct flights from ${fromCode} to ${toCode} were found on ${date}.`);
  return results.sort((a, b) => Date.parse(a.departure?.value ?? "") - Date.parse(b.departure?.value ?? ""));
}
