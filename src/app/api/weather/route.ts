import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { geocode, getWeather, weatherSource } from "@/lib/server/providers/openmeteo";
import { sanitizeQuery } from "@/lib/validation";

export const GET = handle({ group: "weather", limit: 30 }, async (url) => {
  const q = sanitizeQuery(url.searchParams.get("city") ?? "", 60);
  if (q.length < 2) throw new ApiError("INVALID_INPUT", "Enter a city name.");
  const { value, fetchedAt, cached: hit } = await cached(`weather:${q.toLowerCase()}`, 15 * 60_000, async () => {
    const places = await geocode(q);
    if (!places.length) throw new ApiError("NO_RESULTS", `No city named "${q}" was found.`);
    return getWeather(places[0]);
  });
  return { data: value, meta: { fetchedAt, cached: hit, source: weatherSource, live: true } };
});
