import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getFare, railSource } from "@/lib/server/providers/irctcdev";
import { normalizeTrainNumber, sanitizeQuery } from "@/lib/validation";
import { journeyStations } from "@/lib/server/seats";
import { parseQuota } from "../params";

export const GET = handle({ group: "train-fare", limit: 20 }, async (url) => {
  const p = url.searchParams;
  const train = normalizeTrainNumber(p.get("train") ?? "");
  if (!train) throw new ApiError("INVALID_TRAIN", "Enter a valid 5-digit train number.");
  const fromText = sanitizeQuery(p.get("from") ?? "", 60);
  const toText = sanitizeQuery(p.get("to") ?? "", 60);
  if (fromText.length < 2 || toText.length < 2) throw new ApiError("INVALID_STATION", "Choose where you board and where you get off.");
  const quota = parseQuota(p.get("quota"));
  if (quota !== "GN" && quota !== "TQ") throw new ApiError("INVALID_INPUT", "Fares are available for General and Tatkal quotas.");
  // Place names resolve to the stops this train makes
  const { from, to } = await journeyStations(train, fromText, toText);

  // Fare tables change rarely, but dynamic-fare trains move: half a day is a fair balance
  const { value, fetchedAt, cached: hit } = await cached(`fare:${train}:${from}:${to}:${quota}`, 12 * 60 * 60_000, () => getFare(train, from, to, quota));
  return { data: value, meta: { fetchedAt, cached: hit, source: railSource, live: false } };
});
