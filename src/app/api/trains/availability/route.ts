import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getAvailability, railSource } from "@/lib/server/providers/irctcdev";
import { todayIST } from "@/lib/dates";
import { dayDiff, isValidDate, normalizeStationCode, normalizeTrainNumber } from "@/lib/validation";
import { parseClass, parseQuota } from "../params";

export const GET = handle({ group: "train-availability", limit: 20 }, async (url) => {
  const p = url.searchParams;
  const train = normalizeTrainNumber(p.get("train") ?? "");
  if (!train) throw new ApiError("INVALID_TRAIN", "Enter a valid 5-digit train number.");
  const from = normalizeStationCode(p.get("from") ?? "");
  const to = normalizeStationCode(p.get("to") ?? "");
  if (!from || !to || from === to) throw new ApiError("INVALID_STATION", "Choose two different stations on the train's route.");
  const date = p.get("date") ?? "";
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid journey date.");
  const ahead = dayDiff(todayIST(), date);
  if (ahead < 0 || ahead > 120) throw new ApiError("INVALID_INPUT", "Seat availability covers journeys from today up to 120 days ahead.");
  const cls = parseClass(p.get("class"), "3A");
  const quota = parseQuota(p.get("quota"));

  // Seats move fast; a short cache only absorbs repeat clicks
  const { value, fetchedAt, cached: hit } = await cached(`avail:${train}:${from}:${to}:${date}:${cls}:${quota}`, 2 * 60_000, () =>
    getAvailability(train, from, to, date, cls, quota),
  );
  return { data: value, meta: { fetchedAt, cached: hit, source: railSource, live: true } };
});
