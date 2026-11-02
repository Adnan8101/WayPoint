import "server-only";

// Defensive accessors for loosely-typed provider payloads. Providers vary field
// names between API versions, so adapters try several candidates.

type Obj = Record<string, unknown>;

export function obj(v: unknown): Obj | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : undefined;
}

export function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function get(o: unknown, path: string): unknown {
  let cur: unknown = o;
  for (const k of path.split(".")) {
    const c = obj(cur);
    if (!c) return undefined;
    cur = c[k];
  }
  return cur;
}

export function str(o: unknown, ...paths: string[]): string | undefined {
  for (const p of paths) {
    const v = get(o, p);
    if (typeof v === "string" && v.trim() !== "" && v.trim() !== "-" && v.trim() !== "--") return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

export function num(o: unknown, ...paths: string[]): number | undefined {
  for (const p of paths) {
    const v = get(o, p);
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

export function bool(o: unknown, ...paths: string[]): boolean | undefined {
  for (const p of paths) {
    const v = get(o, p);
    if (typeof v === "boolean") return v;
    if (v === "true" || v === "Y" || v === "Yes") return true;
    if (v === "false" || v === "N" || v === "No") return false;
  }
  return undefined;
}

/** Normalize "HH:MM", "H:MM:SS" or minutes-after-midnight into "HH:mm". */
export function hhmm(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    const m = Math.round(v) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }
  if (typeof v !== "string") return undefined;
  const m = v.trim().match(/(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
