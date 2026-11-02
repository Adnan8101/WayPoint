import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getFare, railSource } from "@/lib/server/providers/irctcdev";
import { normalizeStationCode, normalizeTrainNumber } from "@/lib/validation";
import { parseQuota } from "../params";

export const GET = handle({ group: "train-fare", limit: 20 }, async (url) => {
  const p = url.searchParams;
  const train = normalizeTrainNumber(p.get("train") ?? "");
  if (!train) throw new ApiError("INVALID_TRAIN", "Enter a valid 5-digit train number.");
  const from = normalizeStationCode(p.get("from") ?? "");
  const to = normalizeStationCode(p.get("to") ?? "");
  if (!from || !to || from === to) throw new ApiError("INVALID_STATION", "Choose two different stations on the train's route.");
  const quota = parseQuota(p.get("quota"));
  if (quota !== "GN" && quota !== "TQ") throw new ApiError("INVALID_INPUT", "Fares are available for General and Tatkal quotas.");

  // Fare tables change rarely, but dynamic-fare trains move: half a day is a fair balance
  const { value, fetchedAt, cached: hit } = await cached(`fare:${train}:${from}:${to}:${quota}`, 12 * 60 * 60_000, () => getFare(train, from, to, quota));
  return { data: value, meta: { fetchedAt, cached: hit, source: railSource, live: false } };
});
