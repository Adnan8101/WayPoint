import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getSchedule, trainSource } from "@/lib/server/providers/railradar";
import { findStation } from "@/lib/data/stations";
import { normalizeTrainNumber } from "@/lib/validation";

export const GET = handle({ group: "train-schedule", limit: 30 }, async (url) => {
  const train = normalizeTrainNumber(url.searchParams.get("train") ?? "");
  if (!train) throw new ApiError("INVALID_TRAIN", "Enter a valid 5-digit train number, for example 12951.");

  // Timetables rarely change: cache for 7 days
  const { value, fetchedAt, cached: hit } = await cached(`schedule:${train}`, 7 * 24 * 60 * 60_000, async () => {
    const s = await getSchedule(train);
    // Fill missing coordinates from our reference data, never invent them.
    for (const stop of s.stops) {
      if (stop.lat === undefined || stop.lon === undefined) {
        const ref = findStation(stop.code);
        if (ref) Object.assign(stop, { lat: ref.lat, lon: ref.lon });
      }
    }
    return s;
  });
  return { data: value, meta: { fetchedAt, cached: hit, source: trainSource, live: false } };
});
