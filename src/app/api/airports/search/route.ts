import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { airportSource, searchAirports } from "@/lib/server/providers/ourairports";
import { sanitizeQuery } from "@/lib/validation";

export const GET = handle({ group: "airport-suggest", limit: 120, cacheControl: "public, max-age=86400" }, async (url) => {
  const q = sanitizeQuery(url.searchParams.get("q") ?? "", 60);
  if (q.length < 2) throw new ApiError("INVALID_INPUT", "Type at least 2 characters.");
  const data = await searchAirports(q, 8);
  return { data, meta: { fetchedAt: Date.now(), cached: true, source: airportSource, live: false } };
});
