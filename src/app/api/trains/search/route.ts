import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { searchTrains, trainSource } from "@/lib/server/providers/railradar";
import { sanitizeQuery } from "@/lib/validation";

export const GET = handle({ group: "train-suggest", limit: 60, cacheControl: "public, max-age=3600" }, async (url) => {
  const q = sanitizeQuery(url.searchParams.get("q") ?? "", 40);
  if (q.length < 2) throw new ApiError("INVALID_INPUT", "Type at least 2 characters.");
  const { value, fetchedAt, cached: hit } = await cached(`tsearch:${q.toLowerCase()}`, 24 * 60 * 60_000, () => searchTrains(q));
  return { data: value, meta: { fetchedAt, cached: hit, source: trainSource, live: false } };
});
