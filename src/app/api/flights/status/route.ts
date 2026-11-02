import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { flightSource, flightsOnDate, getFlightsByNumber } from "@/lib/server/providers/aviationstack";
import { dayDiff, isValidDate, normalizeFlightNumber } from "@/lib/validation";
import { todayIn } from "@/lib/dates";

export const GET = handle({ group: "flights", limit: 40 }, async (url) => {
  const number = normalizeFlightNumber(url.searchParams.get("number") ?? "");
  if (!number) throw new ApiError("INVALID_FLIGHT", "Enter a valid flight number.");
  const date = url.searchParams.get("date") ?? todayIn("UTC");
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid travel date.");
  const diff = dayDiff(todayIn("UTC"), date);
  // The live source only covers flights operating around today
  if (diff < -1 || diff > 1) throw new ApiError("INVALID_INPUT", "Flight status is available for yesterday, today and tomorrow.");

  // One provider response covers every recent day, so cache per flight number and filter by date here
  const { value: all, fetchedAt, cached: hit } = await cached(`flight:${number}`, 5 * 60_000, () => getFlightsByNumber(number));
  const value = flightsOnDate(all, number, date);
  const live = value.some((f) => ["Boarding", "Departed", "In Air", "Delayed", "Landed", "Diverted"].includes(f.status));
  return {
    data: value,
    meta: { fetchedAt, cached: hit, source: flightSource, live, providerUpdatedAt: value.find((f) => f.lastUpdated)?.lastUpdated },
  };
});
