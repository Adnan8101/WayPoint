import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getStationTimetable, railSource } from "@/lib/server/providers/irctcdev";
import { todayIST } from "@/lib/dates";
import { isValidDate, normalizeStationCode } from "@/lib/validation";

export const GET = handle({ group: "station-timetable", limit: 20 }, async (url) => {
  const code = normalizeStationCode(decodeURIComponent(url.pathname.split("/").at(-2) ?? ""));
  if (!code) throw new ApiError("INVALID_STATION", "Enter a valid station code.");
  const date = url.searchParams.get("date") || todayIST();
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid date.");
  const { value, fetchedAt, cached: hit } = await cached(`stt:${code}:${date}`, 24 * 60 * 60_000, () => getStationTimetable(code, date));
  return { data: value, meta: { fetchedAt, cached: hit, source: railSource, live: false } };
});
