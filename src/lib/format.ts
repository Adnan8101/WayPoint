import type { TimeValue } from "./types";

/** Format an ISO timestamp (with offset) as wall-clock time in its own zone, or pass through "HH:mm". */
export function fmtTime(v: string | TimeValue | undefined, timeZone?: string): string {
  const s = typeof v === "string" ? v : v?.value;
  if (!s) return "—";
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  // Keep the airport's local wall-clock time from the offset in the string when no zone is given
  const m = s.match(/T(\d{2}):(\d{2})/);
  if (!timeZone && m && /[+-]\d{2}:?\d{2}$/.test(s)) return `${m[1]}:${m[2]}`;
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(d);
}

export function fmtDate(v: string | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!v) return "—";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v + "T12:00:00Z" : v;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: /^\d{4}-\d{2}-\d{2}$/.test(v) ? "UTC" : undefined }).format(d);
}

/** Day + date of an ISO timestamp in its own offset, e.g. "Fri 30 Oct" */
export function fmtDayOf(v: string | undefined): string {
  if (!v) return "";
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? fmtDate(m[1], { weekday: "short", day: "numeric", month: "short" }) : "";
}

export function fmtDuration(minutes: number | undefined): string {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function fmtDelay(minutes: number | undefined): { text: string; tone: "ok" | "warn" | "bad" | "none" } {
  if (minutes === undefined || !Number.isFinite(minutes)) return { text: "—", tone: "none" };
  if (minutes <= 0) return { text: minutes < -1 ? `${-minutes} min early` : "On time", tone: "ok" };
  if (minutes < 30) return { text: `${minutes} min late`, tone: "warn" };
  return { text: `${fmtDuration(minutes)} late`, tone: "bad" };
}

export function fmtRelative(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "unknown";
  const diff = Math.round((now - Date.parse(iso)) / 1000);
  if (!Number.isFinite(diff)) return "unknown";
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return fmtDate(iso);
}

export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
