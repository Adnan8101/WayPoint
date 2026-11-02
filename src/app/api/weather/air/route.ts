import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { airSource, getAirQuality } from "@/lib/server/google/maps";

export const GET = handle({ group: "air-quality", limit: 30 }, async (url) => {
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new ApiError("INVALID_INPUT", "That location isn't valid.");
  // Readings update hourly
  const { value, fetchedAt, cached: hit } = await cached(`aq:${lat.toFixed(2)},${lon.toFixed(2)}`, 30 * 60_000, () => getAirQuality(lat, lon));
  return { data: value, meta: { fetchedAt, cached: hit, source: airSource, live: true, providerUpdatedAt: value.at } };
});
