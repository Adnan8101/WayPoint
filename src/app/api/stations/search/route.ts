import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { railSource, searchStations } from "@/lib/server/providers/irctcdev";
import { sanitizeQuery } from "@/lib/validation";

export const GET = handle({ group: "station-suggest", limit: 60, cacheControl: "public, max-age=86400" }, async (url) => {
  const q = sanitizeQuery(url.searchParams.get("q") ?? "", 40);
  if (q.length < 2) throw new ApiError("INVALID_INPUT", "Type at least 2 characters.");
  const { value, fetchedAt, cached: hit } = await cached(`ssearch:${q.toLowerCase()}`, 7 * 24 * 60 * 60_000, () => searchStations(q));
  return { data: value, meta: { fetchedAt, cached: hit, source: railSource, live: false } };
});
