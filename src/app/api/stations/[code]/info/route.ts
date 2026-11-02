import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getStation, railSource } from "@/lib/server/providers/irctcdev";
import { normalizeStationCode } from "@/lib/validation";

export const GET = handle({ group: "station-info", limit: 120, cacheControl: "public, max-age=86400" }, async (url) => {
  const code = normalizeStationCode(decodeURIComponent(url.pathname.split("/").at(-2) ?? ""));
  if (!code) throw new ApiError("INVALID_STATION", "Enter a valid station code.");
  const { value, fetchedAt, cached: hit } = await cached(`station:${code}`, 30 * 24 * 60 * 60_000, () => getStation(code));
  return { data: value, meta: { fetchedAt, cached: hit, source: railSource, live: false } };
});
