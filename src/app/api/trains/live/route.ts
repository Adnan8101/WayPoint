import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { withFallback } from "@/lib/server/fallback";
import * as irctc from "@/lib/server/providers/irctcdev";
import * as railradar from "@/lib/server/providers/railradar";
import { dayDiff, isValidDate, normalizeTrainNumber } from "@/lib/validation";
import { todayIST } from "@/lib/dates";

export const GET = handle({ group: "train-live", limit: 30 }, async (url) => {
  const train = normalizeTrainNumber(url.searchParams.get("train") ?? "");
  if (!train) throw new ApiError("INVALID_TRAIN", "Enter a valid 5-digit train number.");
  const date = url.searchParams.get("date") ?? todayIST();
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid journey start date.");
  const daysAgo = dayDiff(date, todayIST());
  if (daysAgo < 0) throw new ApiError("INVALID_INPUT", "Running status is only available once the train has started its journey.");
  if (daysAgo > 4) throw new ApiError("INVALID_INPUT", "Running status is available for journeys started in the last 5 days.");

  // Positions update every few minutes
  const { value, fetchedAt, cached: hit } = await cached(`live:${train}:${date}`, 5 * 60_000, () =>
    withFallback(
      { source: irctc.railSource, run: () => irctc.getLiveStatus(train, date) },
      { source: railradar.trainSource, run: () => railradar.getLiveStatus(train, date), enabled: Boolean(process.env.RAILRADAR_API_KEY) },
    ),
  );
  return {
    data: value.data,
    meta: { fetchedAt, cached: hit, source: value.source, live: true, providerUpdatedAt: value.data.lastUpdated },
  };
});
