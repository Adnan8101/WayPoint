import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { flightSource, searchFlights } from "@/lib/server/providers/aviationstack";
import { dayDiff, isValidDate, normalizeAirportCode } from "@/lib/validation";
import { todayIn } from "@/lib/dates";

export const GET = handle({ group: "flight-search", limit: 15 }, async (url) => {
  const from = normalizeAirportCode(url.searchParams.get("from") ?? "");
  const to = normalizeAirportCode(url.searchParams.get("to") ?? "");
  if (!from || !to) throw new ApiError("INVALID_AIRPORT", "Choose valid departure and arrival airports (IATA codes such as DEL or BOM).");
  if (from === to) throw new ApiError("INVALID_AIRPORT", "Departure and arrival airports must be different.");
  const date = url.searchParams.get("date") ?? "";
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid departure date.");
  const diff = dayDiff(todayIn("UTC"), date);
  if (diff < -1 || diff > 1) throw new ApiError("INVALID_INPUT", "Flight search covers flights operating yesterday, today and tomorrow.");

  const { value, fetchedAt, cached: hit } = await cached(`fsearch:${from}:${to}:${date}`, 30 * 60_000, () => searchFlights(from, to, date));
  return { data: value, meta: { fetchedAt, cached: hit, source: flightSource, live: false } };
});
