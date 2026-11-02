import { ApiError } from "@/lib/server/errors";
import { resolveStations } from "@/lib/server/providers/station-resolver";
import { isValidDate, sanitizeQuery } from "@/lib/validation";

/** From, to (stations or places) and date shared by the planner endpoints */
export async function planInput(url: URL) {
  const fromText = sanitizeQuery(url.searchParams.get("from") ?? "", 60);
  const toText = sanitizeQuery(url.searchParams.get("to") ?? "", 60);
  if (fromText.length < 2 || toText.length < 2) throw new ApiError("INVALID_STATION", "Choose where you're travelling from and to: a station, or a city.");
  const date = url.searchParams.get("date") ?? "";
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid travel date.");
  const [from, to] = await Promise.all([resolveStations(fromText), resolveStations(toText)]);
  if (!from) throw new ApiError("INVALID_STATION", `We couldn't find a railway station for "${fromText}".`);
  if (!to) throw new ApiError("INVALID_STATION", `We couldn't find a railway station for "${toText}".`);
  return { from, to, date };
}
