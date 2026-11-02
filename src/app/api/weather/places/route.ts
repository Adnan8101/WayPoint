import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { findPlaces } from "@/lib/server/providers/geocode";
import { TZ_RE, sanitizeQuery } from "@/lib/validation";

// Suggestions for the weather search box. Gazetteer data barely changes, so cache hard.
export const GET = handle({ group: "weather-places", limit: 120, cacheControl: "public, max-age=86400" }, async (url) => {
  const q = sanitizeQuery(url.searchParams.get("q") ?? "", 60);
  if (q.length < 2) throw new ApiError("INVALID_INPUT", "Type at least 2 characters.");
  // The searcher's own time zone breaks ties between same-named places
  const utz = url.searchParams.get("utz") ?? "";
  const userTz = TZ_RE.test(utz) ? utz : undefined;
  const { value, fetchedAt, cached: hit } = await cached(`geo6:${q.toLowerCase()}:${userTz ?? ""}`, 7 * 24 * 60 * 60_000, () => findPlaces(q, 6, userTz));
  return { data: value, meta: { fetchedAt, cached: hit, source: "Open-Meteo geocoding", live: false } };
});
