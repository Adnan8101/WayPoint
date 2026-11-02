import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { withFallback } from "@/lib/server/fallback";
import { autocomplete, googleSource } from "@/lib/server/google/places";
import { findPlaces } from "@/lib/server/providers/geocode";
import { TZ_RE, sanitizeQuery } from "@/lib/validation";
import type { WeatherSuggestion } from "@/lib/types";

// Suggestions for the weather search: Google Places (regions) first, Open-Meteo if Google is down.
export const GET = handle({ group: "weather-places", limit: 120, cacheControl: "no-store" }, async (url) => {
  const q = sanitizeQuery(url.searchParams.get("q") ?? "", 60);
  if (q.length < 2) throw new ApiError("INVALID_INPUT", "Type at least 2 characters.");
  const session = url.searchParams.get("session") ?? "";
  const utz = url.searchParams.get("utz") ?? "";
  const userTz = TZ_RE.test(utz) ? utz : undefined;

  const { data, source } = await withFallback<WeatherSuggestion[]>(
    {
      source: googleSource,
      run: async () => {
        if (!/^[A-Za-z0-9-]{8,64}$/.test(session)) throw new ApiError("UNAVAILABLE", "No search session.");
        const list = await autocomplete(q, session, ["(regions)"]);
        return list.map((s) => ({ placeId: s.placeId, name: s.main, secondary: s.secondary }));
      },
    },
    {
      source: "Open-Meteo geocoding",
      enabled: true,
      run: async () =>
        (await cached(`geo6:${q.toLowerCase()}:${userTz ?? ""}`, 7 * 24 * 60 * 60_000, () => findPlaces(q, 6, userTz))).value.map((p) => ({
          name: p.name,
          secondary: [p.district, p.region, p.country].filter(Boolean).join(", "),
          place: p,
        })),
    },
  );
  return { data, meta: { fetchedAt: Date.now(), cached: false, source, live: false } };
});
