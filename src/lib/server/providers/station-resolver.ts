import "server-only";
import type { Station } from "@/lib/types";
import { cached } from "../cache";
import { generateJson } from "../google/gemini";
import { getStation, searchStations } from "./irctcdev";
import { normalizeStationCode } from "@/lib/validation";

// Turns what someone typed ("NDLS", "New Delhi", "Mumbai", "मुंबई") into the IRCTC
// stations it means. A city usually has several long-distance terminals, so it
// resolves to all of them. Gemini proposes codes; every code is then confirmed
// against irctc.dev, so nothing invented ever reaches a search.

export interface ResolvedPlace {
  /** What to call it in the interface */
  label: string;
  /** True when the text named a city served by several stations */
  city: boolean;
  /** Most important first */
  stations: Station[];
}

const MAX_STATIONS = 5;

const SYSTEM = [
  "You map a place name typed by a traveller to Indian Railways (IRCTC) station codes.",
  "If it names a city, town or region served by several stations, list the main passenger stations where long-distance and express trains start, end or stop, most important first, up to 5. Skip suburban-only halts, sidings and freight yards.",
  "If it names one specific station (for example 'New Delhi', 'Howrah', 'Lokmanya Tilak Terminus' or a station code), return only that station and set city to false.",
  "Use only real IRCTC codes you are sure of. Return an empty list if it isn't a place in India served by trains.",
  "label is the place's common English name.",
].join(" ");

const SCHEMA = {
  type: "OBJECT",
  properties: {
    label: { type: "STRING" },
    city: { type: "BOOLEAN" },
    stations: {
      type: "ARRAY",
      items: { type: "OBJECT", properties: { code: { type: "STRING" }, name: { type: "STRING" } }, required: ["code", "name"] },
    },
  },
  required: ["label", "city", "stations"],
};

/** Station by code, confirmed against irctc.dev (cached a month) */
async function confirm(code: string): Promise<Station | undefined> {
  try {
    return (await cached(`station:${code}`, 30 * 24 * 60 * 60_000, () => getStation(code))).value;
  } catch {
    return undefined;
  }
}

async function resolve(text: string): Promise<ResolvedPlace | undefined> {
  const raw = text.trim();
  // Typed a code that exists: take it as written
  const code = /^[A-Za-z]{1,5}$/.test(raw) && raw === raw.toUpperCase() ? normalizeStationCode(raw) : null;
  if (code) {
    const s = await confirm(code);
    if (s) return { label: s.name, city: false, stations: [s] };
  }

  const ai = await generateJson<{ label: string; city: boolean; stations: { code: string; name: string }[] }>(SYSTEM, [{ text: raw }], SCHEMA).catch(() => undefined);
  if (ai?.stations?.length) {
    const codes = [...new Set(ai.stations.map((s) => normalizeStationCode(s.code)).filter((c): c is string => Boolean(c)))].slice(0, MAX_STATIONS);
    const confirmed = (await Promise.all(codes.map(confirm))).filter((s): s is Station => Boolean(s));
    if (confirmed.length) return { label: ai.label || raw, city: ai.city && confirmed.length > 1, stations: confirmed };
  }

  // Assistant unavailable or unsure: fall back to the provider's own name search
  const hits = await searchStations(raw).catch(() => []);
  const exact = hits.find((h) => h.name.toLowerCase() === raw.toLowerCase()) ?? hits[0];
  return exact ? { label: exact.name, city: false, stations: [{ code: exact.code, name: exact.name, state: exact.state }] } : undefined;
}

/** Resolve a station code or place name; cached for a month per text */
export async function resolveStations(text: string): Promise<ResolvedPlace | undefined> {
  const key = text.trim();
  if (!key) return undefined;
  return (await cached(`stres:${key.toLowerCase()}`, 30 * 24 * 60 * 60_000, () => resolve(key))).value;
}
