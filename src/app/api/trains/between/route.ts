import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import * as irctc from "@/lib/server/providers/irctcdev";
import * as railradar from "@/lib/server/providers/railradar";
import { resolveStations, type ResolvedPlace } from "@/lib/server/providers/station-resolver";
import { addDays, weekdayOf } from "@/lib/dates";
import { isValidDate, sanitizeQuery } from "@/lib/validation";
import type { TrainBetween, TrainsBetweenResult } from "@/lib/types";

/** Stations searched per side when a city has several */
const PER_SIDE = 4;
/** How far ahead "next available" looks */
const LOOKAHEAD_DAYS = 14;
const DAY = 24 * 60 * 60_000;

const place = (p: ResolvedPlace, n: number) => ({ label: p.label, city: p.city && n > 1, stations: p.stations.slice(0, n).map((s) => ({ code: s.code, name: s.name })) });

type Pair = { data: TrainBetween[]; source: string; datedFor?: string };

/**
 * All trains for one station pair. irctc.dev is asked without a date, so one
 * cached answer serves every date; RailRadar (backup) answers for one date only.
 */
async function pair(from: string, to: string, date: string, backup: boolean): Promise<Pair> {
  try {
    return (await cached(`between:${from}:${to}`, DAY, async () => ({ data: await irctc.getTrainsBetween(from, to), source: irctc.railSource }))).value;
  } catch (err) {
    const code = (err as ApiError)?.code;
    if (!backup || !process.env.RAILRADAR_API_KEY || code === "NO_RESULTS" || code === "INVALID_STATION") throw err;
    const data = (await cached(`between-rr:${from}:${to}:${date}`, DAY, () => railradar.getTrainsBetween(from, to, date))).value;
    return { data, source: railradar.trainSource, datedFor: date };
  }
}

/** Trains that leave the boarding station on `date` (runDays are already the boarding station's days) */
const leavesOn = (t: TrainBetween, date: string) => t.runDays.length === 0 || t.runDays.includes(weekdayOf(date));

/**
 * `from` and `to` may be station codes or place names. A city expands to its
 * main stations and every pair is searched. When nothing leaves on the date,
 * the response says which later date does.
 */
export const GET = handle({ group: "train-between", limit: 20 }, async (url) => {
  const fromText = sanitizeQuery(url.searchParams.get("from") ?? "", 60);
  const toText = sanitizeQuery(url.searchParams.get("to") ?? "", 60);
  if (fromText.length < 2 || toText.length < 2) throw new ApiError("INVALID_STATION", "Choose where you're travelling from and to: a station, or a city.");
  const date = url.searchParams.get("date") ?? "";
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid journey date.");

  const [from, to] = await Promise.all([resolveStations(fromText), resolveStations(toText)]);
  if (!from) throw new ApiError("INVALID_STATION", `We couldn't find a railway station for "${fromText}".`);
  if (!to) throw new ApiError("INVALID_STATION", `We couldn't find a railway station for "${toText}".`);
  const fromCodes = from.stations.slice(0, PER_SIDE).map((s) => s.code);
  const toCodes = to.stations.slice(0, PER_SIDE).map((s) => s.code).filter((c) => !fromCodes.includes(c));
  if (!toCodes.length) throw new ApiError("INVALID_STATION", "From and To are the same place.");

  const pairs = fromCodes.flatMap((f) => toCodes.map((t) => [f, t] as const));
  const results = await Promise.allSettled(pairs.map(([f, t]) => pair(f, t, date, pairs.length === 1)));

  // Most important stations first; a train seen from two pairs is kept once
  const seen = new Set<string>();
  const all: (TrainBetween & { datedFor?: string })[] = [];
  let source = irctc.railSource;
  let outage = 0;
  for (const r of results) {
    if (r.status === "rejected") {
      const code = (r.reason as ApiError)?.code;
      if (code !== "NO_RESULTS" && code !== "INVALID_STATION") outage++;
      continue;
    }
    source = r.value.source;
    for (const t of r.value.data) {
      if (seen.has(t.trainNumber)) continue;
      seen.add(t.trainNumber);
      all.push({ ...t, datedFor: r.value.datedFor });
    }
  }
  if (!all.length) {
    if (outage === results.length) throw new ApiError("UNAVAILABLE", "Train information is unavailable right now. Please try again shortly.");
    throw new ApiError("NO_RESULTS", `No trains run from ${from.label} to ${to.label}.`);
  }

  const on = (d: string) => all.filter((t) => (t.datedFor ? t.datedFor === d : leavesOn(t, d)));
  const strip = ({ datedFor: _d, ...t }: TrainBetween & { datedFor?: string }): TrainBetween => t;
  const trains = on(date).map(strip).sort((a, b) => a.departure.localeCompare(b.departure));

  const data: TrainsBetweenResult = { from: place(from, fromCodes.length), to: place(to, toCodes.length), trains };
  if (!trains.length) {
    for (let k = 1; k <= LOOKAHEAD_DAYS; k++) {
      const n = on(addDays(date, k)).length;
      if (n) {
        data.nextDate = addDays(date, k);
        data.nextCount = n;
        break;
      }
    }
  }
  return { data, meta: { fetchedAt: Date.now(), cached: true, source, live: false } };
});
