import "server-only";
import type { PnrPassenger, PnrStatus } from "@/lib/types";
import { findStation } from "@/lib/data/stations";
import { ApiError } from "../errors";
import { fetchJson } from "../http";
import { arr, get, num, str } from "../pick";

// PNR status via irctc.dev (https://irctc.dev/pnr-status-api).
// Used for PNR only: RailRadar's free plan does not include PNR.

export const pnrSource = "irctc.dev";

const CODES = ["CNF", "RAC", "GNWL", "RLWL", "PQWL", "TQWL", "RSWL", "WL", "CAN"] as const;
type Code = PnrPassenger["currentStatusCode"];

function statusCode(s: string): Code {
  const up = s.toUpperCase();
  for (const c of CODES) if (new RegExp(`(^|[^A-Z])${c}([^A-Z]|$)`).test(up)) return c;
  if (/CONFIRM/.test(up)) return "CNF";
  if (/CANCEL/.test(up)) return "CAN";
  return "OTHER";
}

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** "Nov 23, 2026 10:05:00 AM" → "2026-11-23" (no time-zone conversion) */
function isoDate(v: string | undefined): string {
  if (!v) return "";
  const m = v.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${MONTHS[m[1].toLowerCase()]}-${m[2].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v;
}

export async function getPnrStatus(pnr: string): Promise<PnrStatus> {
  const key = process.env.IRCTC_DEV_API_KEY;
  if (!key) throw new ApiError("NOT_CONFIGURED", "PNR status is not available right now (PNR data provider not configured).");
  const base = process.env.IRCTC_DEV_BASE_URL || "https://api.irctc.dev";
  const notFound = new ApiError("INVALID_PNR", "This PNR was not found. It may be invalid, or the journey may be completed and the PNR flushed.");

  const raw = await fetchJson(`${base}/api/v1/pnr/${pnr}`, {
    headers: { "x-api-key": key },
    timeoutMs: 15_000,
    onStatus: (status) => {
      if (status === 400 || status === 404) throw notFound;
      if (status === 503) throw new ApiError("UNAVAILABLE", "Indian Railways' PNR system is under maintenance. Please try again shortly.");
    },
  });
  if (get(raw, "success") === false) {
    if (/not\s*found|invalid|flushed/i.test(`${str(raw, "error") ?? ""} ${str(raw, "code") ?? ""}`)) throw notFound;
    throw new ApiError("UNAVAILABLE", "The PNR service could not return this information right now.");
  }
  const d = get(raw, "data");
  if (!d) throw notFound;

  // The provider returns the current status only (no separate booking status).
  const passengers: PnrPassenger[] = arr(get(d, "passengers")).map((p, i) => {
    const current = str(p, "raw", "status") ?? "Unknown";
    return {
      number: num(p, "number") ?? i + 1,
      bookingStatus: "",
      bookingStatusCode: "OTHER",
      currentStatus: current,
      currentStatusCode: statusCode(str(p, "status") ?? current),
      coach: str(p, "coach"),
      berth: str(p, "seat"),
      berthType: str(p, "berth"),
    };
  });

  const fromCode = str(d, "from.code") ?? "";
  const toCode = str(d, "to.code") ?? "";
  const chart = str(d, "chartStatus") ?? "";
  return {
    pnr,
    trainNumber: str(d, "trainNumber") ?? "",
    trainName: str(d, "trainName") ?? "",
    journeyDate: isoDate(str(d, "journeyDate", "from.time")),
    boarding: { code: fromCode, name: findStation(fromCode)?.name },
    destination: { code: toCode, name: findStation(toCode)?.name },
    from: { code: fromCode, name: findStation(fromCode)?.name },
    travelClass: str(d, "class") ?? "",
    quota: str(d, "quota") ?? "",
    chartPrepared: /prepared/i.test(chart) && !/not\s+prepared/i.test(chart),
    passengers,
  };
}
