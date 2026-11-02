import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { airportSource, airportWithZone } from "@/lib/server/providers/ourairports";
import { normalizeAirportCode } from "@/lib/validation";

export const GET = handle({ group: "airport-info", limit: 120, cacheControl: "public, max-age=86400" }, async (url) => {
  const code = normalizeAirportCode(decodeURIComponent(url.pathname.split("/").at(-2) ?? ""));
  if (!code) throw new ApiError("INVALID_AIRPORT", "Enter a valid IATA or ICAO airport code.");
  const data = await airportWithZone(code);
  if (!data) throw new ApiError("INVALID_AIRPORT", `We don't recognise airport code ${code}.`);
  return { data, meta: { fetchedAt: Date.now(), cached: true, source: airportSource, live: false } };
});
