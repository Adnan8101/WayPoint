import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getTrainsBetween, trainSource } from "@/lib/server/providers/railradar";
import { isValidDate, normalizeStationCode } from "@/lib/validation";

export const GET = handle({ group: "train-between", limit: 20 }, async (url) => {
  const from = normalizeStationCode(url.searchParams.get("from") ?? "");
  const to = normalizeStationCode(url.searchParams.get("to") ?? "");
  if (!from || !to) throw new ApiError("INVALID_STATION", "Choose valid From and To stations (station codes such as NDLS or CSMT).");
  if (from === to) throw new ApiError("INVALID_STATION", "From and To stations must be different.");
  const date = url.searchParams.get("date") ?? "";
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid journey date.");

  // Timetable data changes rarely: cache for a day
  const { value, fetchedAt, cached: hit } = await cached(`between:${from}:${to}:${date}`, 24 * 60 * 60_000, () =>
    getTrainsBetween(from, to, date),
  );
  return { data: value, meta: { fetchedAt, cached: hit, source: trainSource, live: false } };
});
