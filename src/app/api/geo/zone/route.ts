import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { geocodePlaceId, timeZoneAt } from "@/lib/server/google/maps";
import { PLACE_ID_RE } from "@/lib/server/google/params";

/** IANA time zone for a Google place ID or a lat/lon */
export const GET = handle({ group: "geo-zone", limit: 60, cacheControl: "public, max-age=86400" }, async (url) => {
  const pid = url.searchParams.get("pid");
  let lat = Number(url.searchParams.get("lat"));
  let lon = Number(url.searchParams.get("lon"));
  if (pid) {
    if (!PLACE_ID_RE.test(pid)) throw new ApiError("INVALID_INPUT", "That place isn't valid.");
    const p = (await cached(`gpid:${pid}`, 30 * 24 * 60 * 60_000, () => geocodePlaceId(pid))).value;
    if (!p) throw new ApiError("NO_RESULTS", "We couldn't locate that place.");
    lat = p.lat;
    lon = p.lon;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new ApiError("INVALID_INPUT", "A place or location is required.");
  const { value, fetchedAt, cached: hit } = await cached(`gtz:${lat.toFixed(2)},${lon.toFixed(2)}`, 30 * 24 * 60 * 60_000, () => timeZoneAt(lat, lon));
  return { data: { timeZone: value }, meta: { fetchedAt, cached: hit, source: "Google Time Zone", live: false } };
});
