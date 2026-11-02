import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getLiveStatus, trainSource } from "@/lib/server/providers/railradar";
import { dayDiff, isValidDate, normalizeTrainNumber } from "@/lib/validation";
import { todayIST } from "@/lib/dates";

export const GET = handle({ group: "train-live", limit: 30 }, async (url) => {
  const train = normalizeTrainNumber(url.searchParams.get("train") ?? "");
  if (!train) throw new ApiError("INVALID_TRAIN", "Enter a valid 5-digit train number, for example 12951.");
  const date = url.searchParams.get("date") ?? todayIST();
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid journey start date.");
  const daysAgo = dayDiff(date, todayIST());
  if (daysAgo < 0) throw new ApiError("INVALID_INPUT", "Running status is only available once the train has started its journey.");
  if (daysAgo > 4) throw new ApiError("INVALID_INPUT", "Running status is available for journeys started in the last 5 days.");

  // Positions update every few minutes
  const { value, fetchedAt, cached: hit } = await cached(`live:${train}:${date}`, 5 * 60_000, () => getLiveStatus(train, date));
  return {
    data: value,
    meta: { fetchedAt, cached: hit, source: trainSource, live: true, providerUpdatedAt: value.lastUpdated },
  };
});
