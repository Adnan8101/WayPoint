import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { computeRoute, googleSource, type Waypoint } from "@/lib/server/google/places";
import { PLACE_ID_RE, parseLatLng } from "@/lib/server/google/params";
import { sanitizeQuery } from "@/lib/validation";
import type { TravelMode } from "@/lib/places-types";

const MODES: TravelMode[] = ["DRIVE", "TWO_WHEELER", "TRANSIT", "WALK"];

/** `x=lat,lng`, `xPlace=<place id>` or `xAddress=<text>` → a Routes API waypoint */
function waypointFrom(p: URLSearchParams, side: "from" | "to"): Waypoint | undefined {
  const at = parseLatLng(p.get(side));
  if (at) return { latLng: at };
  const place = p.get(`${side}Place`);
  if (place && PLACE_ID_RE.test(place)) return { placeId: place };
  const address = sanitizeQuery(p.get(`${side}Address`) ?? "", 120);
  if (address.length >= 3) return { address };
  return undefined;
}

// Travel time between two points; used for "get there" and leave-by times
export const GET = handle({ group: "directions", limit: 40 }, async (url) => {
  const p = url.searchParams;
  const from = waypointFrom(p, "from");
  const to = waypointFrom(p, "to");
  if (!from || !to) throw new ApiError("INVALID_INPUT", "Choose where you're starting from and where you're going.");
  const mode = (p.get("mode") ?? "DRIVE").toUpperCase() as TravelMode;
  if (!MODES.includes(mode)) throw new ApiError("INVALID_INPUT", "Unknown travel mode.");
  const arriveBy = p.get("arriveBy") ?? undefined;
  if (arriveBy && Number.isNaN(Date.parse(arriveBy))) throw new ApiError("INVALID_INPUT", "Invalid arrival time.");

  // Traffic changes quickly, so only absorb repeat clicks
  const key = `route:${JSON.stringify(from)}:${JSON.stringify(to)}:${mode}:${arriveBy ?? ""}`;
  const { value, fetchedAt, cached: hit } = await cached(key, 3 * 60_000, () => computeRoute(from, to, mode, arriveBy));
  return { data: value, meta: { fetchedAt, cached: hit, source: googleSource, live: true } };
});
