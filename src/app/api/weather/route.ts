import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { findPlaces } from "@/lib/server/providers/geocode";
import { getWeather, weatherSource } from "@/lib/server/providers/openweather";
import { TZ_RE, sanitizeQuery } from "@/lib/validation";
import type { Place } from "@/lib/types";

/**
 * Two ways in: `lat`+`lon` (+ display fields) for a place picked from
 * suggestions, which is exact; or `city` free text, resolved to the best match.
 */
export const GET = handle({ group: "weather", limit: 30 }, async (url) => {
  const p = url.searchParams;
  let place: Place;
  if (p.has("lat") && p.has("lon")) {
    const lat = Number(p.get("lat"));
    const lon = Number(p.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new ApiError("INVALID_INPUT", "That location isn't valid.");
    const text = (k: string) => sanitizeQuery(p.get(k) ?? "", 60) || undefined;
    const tz = p.get("tz") ?? "";
    place = {
      name: text("name") ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      district: text("district"),
      region: text("region"),
      country: text("country"),
      lat: Math.round(lat * 1e4) / 1e4,
      lon: Math.round(lon * 1e4) / 1e4,
      timeZone: TZ_RE.test(tz) ? tz : undefined,
    };
  } else {
    const q = sanitizeQuery(p.get("city") ?? "", 60);
    if (q.length < 2) throw new ApiError("INVALID_INPUT", "Enter a city or area name.");
    const utz = p.get("utz") ?? "";
    const userTz = TZ_RE.test(utz) ? utz : undefined;
    const places = await cached(`geo:${q.toLowerCase()}:${userTz ?? ""}`, 7 * 24 * 60 * 60_000, () => findPlaces(q, 1, userTz));
    if (!places.value.length) throw new ApiError("NO_RESULTS", `We couldn't find "${q}". Try the nearest town or city, or pick from the suggestions.`);
    place = places.value[0];
  }

  const { value, fetchedAt, cached: hit } = await cached(`weather:${place.lat.toFixed(2)},${place.lon.toFixed(2)}`, 15 * 60_000, () => getWeather(place));
  // Cached by coordinates, so re-apply this request's labels
  return { data: { ...value, location: place }, meta: { fetchedAt, cached: hit, source: weatherSource, live: true } };
});
