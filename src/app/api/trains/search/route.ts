import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { withFallback } from "@/lib/server/fallback";
import * as irctc from "@/lib/server/providers/irctcdev";
import * as railradar from "@/lib/server/providers/railradar";
import { sanitizeQuery } from "@/lib/validation";

export const GET = handle({ group: "train-suggest", limit: 60, cacheControl: "public, max-age=3600" }, async (url) => {
  const q = sanitizeQuery(url.searchParams.get("q") ?? "", 40);
  if (q.length < 2) throw new ApiError("INVALID_INPUT", "Type at least 2 characters.");
  const backup = { source: railradar.trainSource, run: () => railradar.searchTrains(q), enabled: Boolean(process.env.RAILRADAR_API_KEY) };
  const { value, fetchedAt, cached: hit } = await cached(`tsearch:${q.toLowerCase()}`, 24 * 60 * 60_000, () =>
    // irctc.dev searches by name or a full number; partial numbers need the backup's prefix search
    /^\d{2,4}$/.test(q) && backup.enabled
      ? withFallback(backup)
      : withFallback({ source: irctc.railSource, run: () => irctc.searchTrains(q) }, backup),
  );
  return { data: value.data, meta: { fetchedAt, cached: hit, source: value.source, live: false } };
});
