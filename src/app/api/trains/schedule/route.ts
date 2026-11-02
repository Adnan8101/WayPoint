import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { withFallback } from "@/lib/server/fallback";
import * as irctc from "@/lib/server/providers/irctcdev";
import * as railradar from "@/lib/server/providers/railradar";
import { normalizeTrainNumber } from "@/lib/validation";

export const GET = handle({ group: "train-schedule", limit: 30 }, async (url) => {
  const train = normalizeTrainNumber(url.searchParams.get("train") ?? "");
  if (!train) throw new ApiError("INVALID_TRAIN", "Enter a valid 5-digit train number.");

  // Timetables rarely change: cache for 7 days
  const { value, fetchedAt, cached: hit } = await cached(`schedule:${train}`, 7 * 24 * 60 * 60_000, async () => {
    // Coordinates come from the provider; stops without them are left off the map
    const r = await withFallback(
      { source: irctc.railSource, run: () => irctc.getSchedule(train) },
      { source: railradar.trainSource, run: () => railradar.getSchedule(train), enabled: Boolean(process.env.RAILRADAR_API_KEY) },
    );
    return r;
  });
  return { data: value.data, meta: { fetchedAt, cached: hit, source: value.source, live: false } };
});
