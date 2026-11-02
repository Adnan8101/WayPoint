import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { leavesOn, placeTrains } from "@/lib/server/planner";
import type { PlanDirect } from "@/lib/types";
import { planInput } from "../params";

/** Every direct train between two places, flagged by whether it leaves on the date */
export const GET = handle({ group: "planner", limit: 30 }, async (url) => {
  const { from, to, date } = await planInput(url);
  const trains = await placeTrains(from, to);
  if (!trains.length) throw new ApiError("NO_RESULTS", `No direct trains run from ${from.label} to ${to.label}.`);
  const side = (p: typeof from) => ({ label: p.label, city: p.city && p.stations.length > 1, stations: p.stations.slice(0, 4).map((s) => ({ code: s.code, name: s.name })) });
  const data: PlanDirect = {
    from: side(from),
    to: side(to),
    trains: trains.map((t) => ({ ...t, onDate: leavesOn(t, date) })).sort((a, b) => Number(b.onDate) - Number(a.onDate) || a.departure.localeCompare(b.departure)),
  };
  return { data, meta: { fetchedAt: Date.now(), cached: true, source: "irctc.dev", live: false } };
});
