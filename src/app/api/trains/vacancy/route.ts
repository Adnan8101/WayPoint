import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { getChartVacancy, railSource } from "@/lib/server/providers/irctcdev";
import { todayIST } from "@/lib/dates";
import { isValidDate, normalizeStationCode, normalizeTrainNumber } from "@/lib/validation";

const CLASSES = ["ALL", "1A", "2A", "3A", "3E", "SL"];

/** Chart times arrive as IST wall-clock "YYYY-MM-DD HH:mm:ss" */
const chartIso = (v?: string) => (v && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v) ? new Date(`${v.replace(" ", "T")}+05:30`).toISOString() : undefined);

export const GET = handle({ group: "train-vacancy", limit: 20 }, async (url) => {
  const p = url.searchParams;
  const train = normalizeTrainNumber(p.get("train") ?? "");
  if (!train) throw new ApiError("INVALID_TRAIN", "Enter a valid 5-digit train number.");
  const boarding = normalizeStationCode(p.get("boarding") ?? "");
  if (!boarding) throw new ApiError("INVALID_STATION", "Choose the station where you board.");
  const date = p.get("date") || todayIST();
  if (!isValidDate(date)) throw new ApiError("INVALID_INPUT", "Enter a valid boarding date.");
  const cls = (p.get("class") ?? "ALL").toUpperCase();
  if (!CLASSES.includes(cls)) throw new ApiError("INVALID_INPUT", `Choose a class: ${CLASSES.join(", ")}.`);

  // Berths are released as the train moves; keep this nearly live
  const { value, fetchedAt, cached: hit } = await cached(`vacancy:${train}:${boarding}:${date}:${cls}`, 60_000, () => getChartVacancy(train, boarding, date, cls));
  return { data: value, meta: { fetchedAt, cached: hit, source: railSource, live: true, providerUpdatedAt: chartIso(value.chartTime) } };
});
