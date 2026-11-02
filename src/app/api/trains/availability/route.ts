import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { railSource } from "@/lib/server/providers/irctcdev";
import { allClasses, availabilityNext, journeyStations } from "@/lib/server/seats";
import { todayIST } from "@/lib/dates";
import { dayDiff, isValidDate, normalizeTrainNumber, sanitizeQuery } from "@/lib/validation";
import { parseClass, parseQuota } from "../params";

/**
 * Seat availability for one train. `from`/`to` may be codes or place names
 * (resolved to the stops this train makes). `class=ANY` checks every class.
 * If the train doesn't run on the date, the next run is used and flagged.
 */
export const GET = handle({ group: "train-availability", limit: 20 }, async (url) => {
  const p = url.searchParams;
  const train = normalizeTrainNumber(p.get("train") ?? "");
  if (!train) throw new ApiError("INVALID_TRAIN", "Enter a valid 5-digit train number.");
  const fromText = sanitizeQuery(p.get("from") ?? "", 60);
  const toText = sanitizeQuery(p.get("to") ?? "", 60);
  if (fromText.length < 2 || toText.length < 2) throw new ApiError("INVALID_STATION", "Choose where you board and where you get off.");
  const date = p.get("date") ?? "";
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid journey date.");
  const ahead = dayDiff(todayIST(), date);
  if (ahead < 0 || ahead > 120) throw new ApiError("INVALID_INPUT", "Seat availability covers journeys from today up to 120 days ahead.");
  const quota = parseQuota(p.get("quota"));
  const { from, to } = await journeyStations(train, fromText, toText);

  const wantsAll = (p.get("class") ?? "").toUpperCase() === "ANY";
  const data = wantsAll ? await allClasses(train, from, to, date, quota) : await availabilityNext(train, from, to, date, parseClass(p.get("class"), "3A"), quota);
  return { data, meta: { fetchedAt: Date.now(), cached: false, source: railSource, live: true } };
});
