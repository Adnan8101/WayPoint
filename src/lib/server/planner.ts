import "server-only";
import type { PlanConnection, PlanLeg, TrainBetween } from "@/lib/types";
import { cached } from "./cache";
import { generateJson } from "./google/gemini";
import { getStation, getTrainsBetween } from "./providers/irctcdev";
import type { ResolvedPlace } from "./providers/station-resolver";
import { addDays, weekdayOf } from "@/lib/dates";
import { normalizeStationCode } from "@/lib/validation";

// Journey planning across one change of train. Interchange junctions are
// proposed by Gemini for the specific trip and each is confirmed against
// irctc.dev; connections are then built only from real timetables.

const DAY = 24 * 60 * 60_000;
const MONTH = 30 * DAY;
/** Shortest and longest sensible wait at the interchange */
const MIN_CHANGE = 60;
const MAX_CHANGE = 12 * 60;
const MAX_HUBS = 4;
const PER_HUB = 3;
const MAX_CONNECTIONS = 10;

/** Every train for a station pair, without a date (one cached answer serves any day) */
export async function routeTrains(from: string, to: string): Promise<TrainBetween[]> {
  try {
    return (await cached(`between:${from}:${to}`, DAY, async () => ({ data: await getTrainsBetween(from, to), source: "irctc.dev" }))).value.data;
  } catch {
    return [];
  }
}

/** Every train between two places (all their main stations), each kept once */
export async function placeTrains(from: ResolvedPlace, to: ResolvedPlace, perSide = 4): Promise<TrainBetween[]> {
  const f = from.stations.slice(0, perSide).map((s) => s.code);
  const t = to.stations.slice(0, perSide).map((s) => s.code).filter((c) => !f.includes(c));
  const lists = await Promise.all(f.flatMap((a) => t.map((b) => routeTrains(a, b))));
  const seen = new Set<string>();
  return lists.flat().filter((x) => (seen.has(x.trainNumber) ? false : (seen.add(x.trainNumber), true)));
}

export const leavesOn = (t: TrainBetween, date: string) => t.runDays.length === 0 || t.runDays.includes(weekdayOf(date));

// ---------- Interchange junctions ----------

const HUB_SYSTEM = [
  "You plan Indian Railways journeys that need one change of train.",
  "Given an origin and a destination, list up to 5 major junction stations where travellers commonly change trains on this trip:",
  "well connected to both ends and roughly on the way. Use only real IRCTC station codes you are sure of. Never include the origin or destination stations themselves.",
].join(" ");

const HUB_SCHEMA = {
  type: "OBJECT",
  properties: { hubs: { type: "ARRAY", items: { type: "OBJECT", properties: { code: { type: "STRING" }, name: { type: "STRING" } }, required: ["code", "name"] } } },
  required: ["hubs"],
};

/** Interchange stations for a trip, confirmed against irctc.dev (cached a month) */
export async function interchanges(from: ResolvedPlace, to: ResolvedPlace): Promise<{ code: string; name: string }[]> {
  const exclude = new Set([...from.stations, ...to.stations].map((s) => s.code));
  const key = `hubs:${from.stations[0]?.code}:${to.stations[0]?.code}`;
  return (
    await cached(key, MONTH, async () => {
      const ai = await generateJson<{ hubs: { code: string; name: string }[] }>(
        HUB_SYSTEM,
        [{ text: `From ${from.label} (${from.stations.map((s) => s.code).join(", ")}) to ${to.label} (${to.stations.map((s) => s.code).join(", ")}).` }],
        HUB_SCHEMA,
      ).catch(() => ({ hubs: [] }));
      const codes = [...new Set(ai.hubs.map((h) => normalizeStationCode(h.code)).filter((c): c is string => Boolean(c) && !exclude.has(c!)))];
      const checked = await Promise.all(
        codes.slice(0, MAX_HUBS + 2).map(async (c) => {
          const s = await cached(`station:${c}`, MONTH, () => getStation(c)).then((r) => r.value).catch(() => undefined);
          return s ? { code: s.code, name: s.name } : undefined;
        }),
      );
      return checked.filter((h): h is { code: string; name: string } => Boolean(h)).slice(0, MAX_HUBS);
    })
  ).value;
}

// ---------- Connections ----------

const leg = (t: TrainBetween, date: string): PlanLeg => ({
  trainNumber: t.trainNumber,
  trainName: t.trainName,
  from: t.from,
  to: t.to,
  date,
  departure: t.departure,
  arrival: t.arrival,
  arrivalDate: addDays(date, t.arrivalDayOffset ?? 0),
  durationMinutes: t.durationMinutes,
});

/**
 * One-change journeys leaving on `date`: first train to the junction, a wait of
 * 1–12 hours, then a second train on. Ranked by total time door to door.
 */
export async function connections(from: ResolvedPlace, to: ResolvedPlace, date: string): Promise<{ hubs: { code: string; name: string }[]; options: PlanConnection[] }> {
  const hubs = await interchanges(from, to);
  const ends = (p: ResolvedPlace) => p.stations.slice(0, 2);
  const perHub = await Promise.all(
    hubs.map(async (hub) => {
      const hubPlace: ResolvedPlace = { label: hub.name, city: false, stations: [hub] };
      const [first, second] = await Promise.all([
        placeTrains({ ...from, stations: ends(from) }, hubPlace, 2),
        placeTrains(hubPlace, { ...to, stations: ends(to) }, 2),
      ]);
      const out: PlanConnection[] = [];
      for (const a of first.filter((t) => leavesOn(t, date))) {
        const l1 = leg(a, date);
        const arrive = Date.parse(`${l1.arrivalDate}T${a.arrival}:00Z`);
        for (const b of second) {
          // The onward train may leave the same day or the next
          for (const d of [l1.arrivalDate, addDays(l1.arrivalDate, 1)]) {
            if (!leavesOn(b, d)) continue;
            const wait = (Date.parse(`${d}T${b.departure}:00Z`) - arrive) / 60_000;
            if (wait < MIN_CHANGE || wait > MAX_CHANGE) continue;
            const l2 = leg(b, d);
            const total = (Date.parse(`${l2.arrivalDate}T${b.arrival}:00Z`) - Date.parse(`${date}T${a.departure}:00Z`)) / 60_000;
            out.push({ via: hub, legs: [l1, l2], waitMinutes: Math.round(wait), totalMinutes: Math.round(total) });
          }
        }
      }
      return out.sort((x, y) => x.totalMinutes - y.totalMinutes).slice(0, PER_HUB);
    }),
  );
  const options = perHub.flat().sort((x, y) => x.totalMinutes - y.totalMinutes).slice(0, MAX_CONNECTIONS);
  return { hubs, options };
}

