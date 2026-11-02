import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { railSource } from "@/lib/server/providers/irctcdev";
import { allClasses, availabilityNext } from "@/lib/server/seats";
import { todayIST } from "@/lib/dates";
import { dayDiff, isValidDate, normalizeStationCode, normalizeTrainNumber } from "@/lib/validation";
import type { SeatCheck, SeatCheckResult } from "@/lib/types";
import { seatKey } from "@/lib/planner";
import { CLASSES, parseQuota } from "../../trains/params";

const MAX_CHECKS = 10;

/**
 * Seat availability for several trains in one request (the planner checks a
 * page of results at once). Each answer covers about two weeks from its date.
 */
export const POST = handle({ group: "planner-seats", limit: 40, cacheControl: "no-store" }, async (_url, req) => {
  const body = (await req.json().catch(() => ({}))) as { checks?: unknown; quota?: string };
  const quota = parseQuota(body.quota ?? "GN");
  const checks = (Array.isArray(body.checks) ? body.checks : []).slice(0, MAX_CHECKS) as SeatCheck[];
  if (!checks.length) throw new ApiError("INVALID_INPUT", "Nothing to check.");

  const data: SeatCheckResult[] = await Promise.all(
    checks.map(async (c): Promise<SeatCheckResult> => {
      const key = seatKey(c);
      const train = normalizeTrainNumber(String(c.train ?? ""));
      const from = normalizeStationCode(String(c.from ?? ""));
      const to = normalizeStationCode(String(c.to ?? ""));
      const cls = String(c.class ?? "").toUpperCase();
      const ahead = isValidDate(String(c.date)) ? dayDiff(todayIST(), c.date) : -1;
      if (!train || !from || !to || ahead < 0 || ahead > 120 || !(cls === "ANY" || CLASSES.includes(cls as never))) return { key, ok: false, error: "Invalid check." };
      try {
        const result = cls === "ANY" ? await allClasses(train, from, to, c.date, quota) : await availabilityNext(train, from, to, c.date, cls, quota);
        return { key, ok: true, data: result };
      } catch (err) {
        return { key, ok: false, error: (err as Error).message };
      }
    }),
  );
  return { data, meta: { fetchedAt: Date.now(), cached: false, source: railSource, live: true } };
});
