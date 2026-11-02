import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getStationBoard, trainSource } from "@/lib/server/providers/railradar";
import { normalizeStationCode } from "@/lib/validation";

export const GET = handle({ group: "station-board", limit: 20 }, async (url) => {
  const code = normalizeStationCode(decodeURIComponent(url.pathname.split("/").at(-2) ?? ""));
  if (!code) throw new ApiError("INVALID_STATION", "Enter a valid station code, for example NDLS.");
  const hours = Number(url.searchParams.get("hours") ?? 4);
  if (![2, 4, 8].includes(hours)) throw new ApiError("INVALID_INPUT", "Choose a window of 2, 4 or 8 hours.");
  const { value, fetchedAt, cached: hit } = await cached(`sboard:${code}:${hours}`, 15 * 60_000, () => getStationBoard(code, hours));
  return { data: value, meta: { fetchedAt, cached: hit, source: trainSource, live: true } };
});
