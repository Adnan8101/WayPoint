import "server-only";
import type { Airport } from "@/lib/types";
import { ApiError } from "../errors";
import { cached } from "../cache";
import { fetchJson } from "../http";
import { num, str } from "../pick";
import { timeZoneAt } from "../google/maps";

// Airport reference data from OurAirports (https://ourairports.com/data/),
// a public dataset refreshed nightly. The server downloads it, keeps airports
// with an IATA code, and refreshes daily. Time zones come from Google's Time Zone
// API by coordinates, since the dataset doesn't carry them.

export const airportSource = "OurAirports";
const CSV_URL = process.env.OURAIRPORTS_CSV_URL || "https://davidmegginson.github.io/ourairports-data/airports.csv";

interface Index {
  list: Airport[];
  byCode: Map<string, Airport>;
}

let last: Index | undefined;

/** Minimal RFC 4180 parser: handles quoted fields, escaped quotes and commas inside quotes */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

const regionName = (() => {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return (code: string) => names.of(code) ?? code;
  } catch {
    return (code: string) => code;
  }
})();

async function download(): Promise<Index> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let text: string;
  try {
    const res = await fetch(CSV_URL, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    text = await res.text();
  } catch {
    throw new ApiError("UNAVAILABLE", "Airport information is temporarily unavailable.");
  } finally {
    clearTimeout(timer);
  }
  const [header, ...rows] = parseCsv(text);
  const col = (name: string) => header.indexOf(name);
  const c = { type: col("type"), name: col("name"), lat: col("latitude_deg"), lon: col("longitude_deg"), country: col("iso_country"), city: col("municipality"), scheduled: col("scheduled_service"), icao: col("icao_code"), gps: col("gps_code"), ident: col("ident"), iata: col("iata_code") };
  const list: Airport[] = [];
  for (const r of rows) {
    const iata = r[c.iata]?.trim();
    const type = r[c.type];
    if (!iata || !/^[A-Z]{3}$/.test(iata) || !/(large|medium|small)_airport/.test(type)) continue;
    const countryCode = r[c.country] ?? "";
    list.push({
      iata,
      icao: r[c.icao] || r[c.gps] || r[c.ident] || "",
      name: r[c.name] ?? iata,
      city: r[c.city] || "",
      country: countryCode ? regionName(countryCode) : "",
      countryCode,
      lat: Number(r[c.lat]),
      lon: Number(r[c.lon]),
      size: type === "large_airport" ? 3 : type === "medium_airport" ? 2 : 1,
      scheduled: r[c.scheduled] === "yes",
    });
  }
  const byCode = new Map<string, Airport>();
  // Larger airports win when codes collide
  for (const a of [...list].sort((x, y) => x.size - y.size)) {
    byCode.set(a.iata, a);
    if (a.icao) byCode.set(a.icao, a);
  }
  return { list, byCode };
}

/** The airport index, downloaded on first use and refreshed daily */
export async function airportIndex(): Promise<Index> {
  const { value } = await cached("ourairports", 24 * 60 * 60_000, download);
  last = value;
  return value;
}

/** Synchronous lookup against the most recently loaded index (call airportIndex() first) */
export function peekAirport(code: string | undefined | null): Airport | undefined {
  return code ? last?.byCode.get(code.toUpperCase()) : undefined;
}

export async function findAirport(code: string): Promise<Airport | undefined> {
  return (await airportIndex()).byCode.get(code.toUpperCase());
}

export async function searchAirports(query: string, limit = 8): Promise<Airport[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const { list } = await airportIndex();
  const scored: [number, Airport][] = [];
  for (const a of list) {
    let s = 0;
    if (a.iata.toLowerCase() === q) s = 100;
    else if (a.icao.toLowerCase() === q) s = 90;
    else if (a.city.toLowerCase().startsWith(q)) s = 50;
    else if (a.name.toLowerCase().startsWith(q)) s = 40;
    else if (a.name.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)) s = 25;
    else if (a.country.toLowerCase().startsWith(q)) s = 10;
    if (!s) continue;
    // Prefer airports people actually fly from
    scored.push([s + a.size * 4 + (a.scheduled ? 6 : 0), a]);
  }
  return scored.sort((x, y) => y[0] - x[0]).slice(0, limit).map(([, a]) => a);
}

/** IANA time zone at the airport's coordinates */
export async function airportTimeZone(a: Airport): Promise<string | undefined> {
  const { value } = await cached(`tz:${a.iata}`, 30 * 24 * 60 * 60_000, async () => {
    // Google's Time Zone API, with Open-Meteo as a keyless fallback
    const google = await timeZoneAt(a.lat, a.lon).catch(() => undefined);
    if (google) return google;
    const raw = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${a.lat}&longitude=${a.lon}&timezone=auto&forecast_days=1`);
    return str(raw, "timezone") ?? (num(raw, "utc_offset_seconds") === 0 ? "UTC" : undefined);
  });
  return value;
}

/** Airport plus its time zone, for pages and boards */
export async function airportWithZone(code: string): Promise<Airport | undefined> {
  const a = await findAirport(code);
  if (!a) return undefined;
  return { ...a, timeZone: a.timeZone ?? (await airportTimeZone(a).catch(() => undefined)) };
}
