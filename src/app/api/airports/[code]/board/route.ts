import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { flightSource, getAirportBoard } from "@/lib/server/providers/aviationstack";
import { airportWithZone } from "@/lib/server/providers/ourairports";
import { normalizeAirportCode } from "@/lib/validation";

export const GET = handle({ group: "airport-board", limit: 20 }, async (url) => {
  const code = normalizeAirportCode(decodeURIComponent(url.pathname.split("/").at(-2) ?? ""));
  if (!code) throw new ApiError("INVALID_AIRPORT", "Enter a valid airport code.");
  const tz = (await airportWithZone(code).catch(() => undefined))?.timeZone ?? "UTC";
  // Each board costs two provider requests, so cache for 20 minutes
  const { value, fetchedAt, cached: hit } = await cached(`board:${code}`, 20 * 60_000, () => getAirportBoard(code, tz));
  return { data: value, meta: { fetchedAt, cached: hit, source: flightSource, live: true } };
});
