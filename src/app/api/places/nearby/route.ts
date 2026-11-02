import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { googleSource, searchNearby } from "@/lib/server/google/places";
import { parseLatLng } from "@/lib/server/google/params";
import { NEARBY_CATEGORIES, type NearbyCategory } from "@/lib/places-types";

export const GET = handle({ group: "places-nearby", limit: 60 }, async (url) => {
  const at = parseLatLng(url.searchParams.get("at"));
  if (!at) throw new ApiError("INVALID_INPUT", "A valid location is required.");
  const category = (url.searchParams.get("category") ?? "attractions") as NearbyCategory;
  if (!(category in NEARBY_CATEGORIES)) throw new ApiError("INVALID_INPUT", "Unknown nearby category.");
  const radius = Math.min(50_000, Math.max(500, Number(url.searchParams.get("radius") ?? 5000) || 5000));

  const key = `pnearby:${at.lat.toFixed(3)},${at.lng.toFixed(3)}:${category}:${radius}`;
  const { value, fetchedAt, cached: hit } = await cached(key, 60 * 60_000, () => searchNearby(at, category, radius));
  return { data: value, meta: { fetchedAt, cached: hit, source: googleSource, live: false } };
});
