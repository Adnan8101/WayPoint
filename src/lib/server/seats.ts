import "server-only";
import type { AllClassesAvailability, ClassAvailability, SeatAvailability } from "@/lib/types";
import { ApiError } from "./errors";
import { cached } from "./cache";
import { getAvailability, getFare } from "./providers/irctcdev";
import { stationOnTrain, trainStops } from "./providers/station-resolver";
import { addDays, weekdayOf } from "@/lib/dates";

const LOOKAHEAD_DAYS = 14;
/** Classes checked when someone asks for "any class" */
const MAX_CLASSES = 6;

/** Station codes for a journey on a train; place names resolve to the stop that train makes */
export async function journeyStations(train: string, fromText: string, toText: string) {
  const [from, to] = await Promise.all([stationOnTrain(train, fromText), stationOnTrain(train, toText)]);
  if (!from) throw new ApiError("INVALID_STATION", `We couldn't find a station for "${fromText}" on train ${train}.`);
  if (!to) throw new ApiError("INVALID_STATION", `We couldn't find a station for "${toText}" on train ${train}.`);
  if (from === to) throw new ApiError("INVALID_STATION", "From and To are the same station.");
  return { from, to };
}

/**
 * First date on or after `date` that the train leaves `from`, using its
 * timetable: running days are counted at the origin, so shift by the stop's day.
 */
export async function nextRunFrom(train: string, from: string, date: string): Promise<string | undefined> {
  const sched = await trainStops(train).catch(() => undefined);
  if (!sched) return undefined;
  if (!sched.runDays.length) return date;
  const stop = sched.stops.find((s) => s.code === from);
  const offset = Math.max(0, (stop?.day ?? 1) - 1);
  for (let k = 0; k <= LOOKAHEAD_DAYS; k++) {
    const d = addDays(date, k);
    if (sched.runDays.includes(weekdayOf(addDays(d, -offset)))) return d;
  }
  return undefined;
}

/**
 * Availability for one class. If the train doesn't run on the date asked for,
 * move to its next run and say so in `requestedDate`.
 */
export async function availabilityNext(train: string, from: string, to: string, date: string, cls: string, quota: string): Promise<SeatAvailability> {
  const load = (d: string) => cached(`avail:${train}:${from}:${to}:${d}:${cls}:${quota}`, 2 * 60_000, () => getAvailability(train, from, to, d, cls, quota)).then((r) => r.value);
  try {
    return await load(date);
  } catch (err) {
    if ((err as ApiError)?.code !== "NO_RESULTS") throw err;
    const next = await nextRunFrom(train, from, date);
    if (!next || next === date) throw err;
    return { ...(await load(next)), requestedDate: date };
  }
}

/** Every class on the train: fare and availability side by side */
export async function allClasses(train: string, from: string, to: string, date: string, quota: string): Promise<AllClassesAvailability> {
  const fareQuota = quota === "TQ" ? "TQ" : "GN";
  const fare = (await cached(`fare:${train}:${from}:${to}:${fareQuota}`, 12 * 60 * 60_000, () => getFare(train, from, to, fareQuota))).value;
  // Use the next run once, so every class is checked for the same journey
  const runDate = (await nextRunFrom(train, from, date)) ?? date;
  const classes: ClassAvailability[] = await Promise.all(
    fare.fares.slice(0, MAX_CLASSES).map(async (f) => {
      try {
        const a = await availabilityNext(train, from, to, runDate, f.travelClass, quota);
        return { travelClass: f.travelClass, className: f.className, fare: f.total, days: a.days };
      } catch (err) {
        return { travelClass: f.travelClass, className: f.className, fare: f.total, days: [], error: (err as Error).message };
      }
    }),
  );
  return {
    trainNumber: fare.trainNumber,
    trainName: fare.trainName,
    from,
    to,
    quota,
    requestedDate: runDate !== date ? date : undefined,
    classes,
  };
}
