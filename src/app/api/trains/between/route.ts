import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { withFallback } from "@/lib/server/fallback";
import * as irctc from "@/lib/server/providers/irctcdev";
import * as railradar from "@/lib/server/providers/railradar";
import { resolveStations, type ResolvedPlace } from "@/lib/server/providers/station-resolver";
import { isValidDate, sanitizeQuery } from "@/lib/validation";
import type { TrainBetween, TrainsBetweenResult } from "@/lib/types";

/** Stations searched per side when a city has several */
const PER_SIDE = 4;
const DAY = 24 * 60 * 60_000;

const place = (p: ResolvedPlace, n: number) => ({ label: p.label, city: p.city && n > 1, stations: p.stations.slice(0, n).map((s) => ({ code: s.code, name: s.name })) });

/** One station pair, cached for a day; RailRadar backs up a single-pair search */
async function pair(from: string, to: string, date: string, backup: boolean) {
  return (
    await cached(`between:${from}:${to}:${date}`, DAY, () =>
      withFallback(
        { source: irctc.railSource, run: () => irctc.getTrainsBetween(from, to, date) },
        { source: railradar.trainSource, run: () => railradar.getTrainsBetween(from, to, date), enabled: backup && Boolean(process.env.RAILRADAR_API_KEY) },
      ),
    )
  ).value;
}

/**
 * `from` and `to` may be station codes or place names. A city expands to its
 * main stations and every pair is searched, so "Mumbai" → "Delhi" finds trains
 * from CSMT, Mumbai Central, LTT and Bandra Terminus to every Delhi terminal.
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
  const single = pairs.length === 1;
  const results = await Promise.allSettled(pairs.map(([f, t]) => pair(f, t, date, single)));

  // Most important stations first; a train seen from two pairs is kept once
  const seen = new Set<string>();
  const trains: TrainBetween[] = [];
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
      trains.push(t);
    }
  }
  if (!trains.length) {
    if (outage === results.length) throw new ApiError("UNAVAILABLE", "Train information is unavailable right now. Please try again shortly.");
    throw new ApiError("NO_RESULTS", `No trains were found from ${from.label} to ${to.label} on ${date}.`);
  }
  trains.sort((a, b) => a.departure.localeCompare(b.departure));

  const data: TrainsBetweenResult = { from: place(from, fromCodes.length), to: place(to, toCodes.length), trains };
  return { data, meta: { fetchedAt: Date.now(), cached: true, source, live: false } };
});
