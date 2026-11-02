import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { withFallback } from "@/lib/server/fallback";
import * as irctc from "@/lib/server/providers/irctcdev";
import * as railradar from "@/lib/server/providers/railradar";
import { normalizeStationCode } from "@/lib/validation";

export const GET = handle({ group: "station-board", limit: 20 }, async (url) => {
  const code = normalizeStationCode(decodeURIComponent(url.pathname.split("/").at(-2) ?? ""));
  if (!code) throw new ApiError("INVALID_STATION", "Enter a valid station code.");
  const hours = Number(url.searchParams.get("hours") ?? 4);
  if (![2, 4, 8].includes(hours)) throw new ApiError("INVALID_INPUT", "Choose a window of 2, 4 or 8 hours.");
  const { value, fetchedAt, cached: hit } = await cached(`sboard:${code}:${hours}`, 5 * 60_000, () =>
    withFallback(
      { source: irctc.railSource, run: () => irctc.getStationBoard(code, hours) },
      { source: railradar.trainSource, run: () => railradar.getStationBoard(code, hours), enabled: Boolean(process.env.RAILRADAR_API_KEY) },
    ),
  );
  return { data: value.data, meta: { fetchedAt, cached: hit, source: value.source, live: true } };
});
