import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { withFallback } from "@/lib/server/fallback";
import * as google from "@/lib/server/google/maps";
import { PLACE_ID_RE } from "@/lib/server/google/params";
import { findPlaces } from "@/lib/server/providers/geocode";
import * as owm from "@/lib/server/providers/openweather";
import { TZ_RE, sanitizeQuery } from "@/lib/validation";
import type { Place } from "@/lib/types";

/**
 * Three ways in, most exact first: `pid` (a Google place picked from suggestions),
 * `lat`+`lon` (coordinates already known), or `city` free text.
 */
export const GET = handle({ group: "weather", limit: 30 }, async (url) => {
  const p = url.searchParams;
  const text = (k: string) => sanitizeQuery(p.get(k) ?? "", 60) || undefined;
  let place: Place | undefined;

  const pid = p.get("pid");
  if (pid) {
    if (!PLACE_ID_RE.test(pid)) throw new ApiError("INVALID_INPUT", "That place isn't valid.");
    place = (await cached(`gpid:${pid}`, 30 * 24 * 60 * 60_000, () => google.geocodePlaceId(pid))).value;
    if (!place) throw new ApiError("NO_RESULTS", "We couldn't locate that place.");
    // Keep the name the person picked; Geocoding may name a smaller area
    place = { ...place, name: text("name") ?? place.name };
  } else if (p.has("lat") && p.has("lon")) {
    const lat = Number(p.get("lat"));
    const lon = Number(p.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new ApiError("INVALID_INPUT", "That location isn't valid.");
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
    if (q.length < 2) throw new ApiError("INVALID_INPUT", "Enter a city, town or area.");
    const utz = p.get("utz") ?? "";
    const userTz = TZ_RE.test(utz) ? utz : undefined;
    const found = await cached(`geo1:${q.toLowerCase()}:${userTz ?? ""}`, 7 * 24 * 60 * 60_000, async () =>
      (await google.geocodeAddress(q).catch(() => undefined)) ?? (await findPlaces(q, 1, userTz))[0],
    );
    place = found.value;
    if (!place) throw new ApiError("NO_RESULTS", `We couldn't find "${q}". Try the nearest town or city, or pick from the suggestions.`);
  }

  const located = place;
  const { value, fetchedAt, cached: hit } = await cached(`weather:${located.lat.toFixed(2)},${located.lon.toFixed(2)}`, 15 * 60_000, () =>
    withFallback(
      { source: google.weatherSource, run: () => google.getWeather(located) },
      { source: owm.weatherSource, run: () => owm.getWeather(located), enabled: Boolean(process.env.OPENWEATHER_API_KEY) },
    ),
  );
  // Cached by coordinates, so re-apply this request's labels (keeping the provider's time zone)
  return {
    data: { ...value.data, location: { ...located, timeZone: located.timeZone ?? value.data.location.timeZone } },
    meta: { fetchedAt, cached: hit, source: value.source, live: true },
  };
});
