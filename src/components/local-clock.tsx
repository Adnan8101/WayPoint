"use client";

import { useEffect, useState } from "react";

/**
 * Current wall-clock time in a time zone, at a fixed UTC offset when only that is
 * known, or in the viewer's own zone when neither is given.
 * Renders nothing until mounted to avoid hydration mismatch.
 */
export function LocalClock({ timeZone, offsetSeconds, withDate, withZone }: { timeZone?: string; offsetSeconds?: number; withDate?: boolean; withZone?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="text-slate-400">…</span>;
  const useOffset = !timeZone && offsetSeconds !== undefined;
  const at = useOffset ? new Date(now.getTime() + offsetSeconds * 1000) : now;
  const zone = useOffset ? "UTC" : timeZone;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    ...(withDate ? { weekday: "short", day: "numeric", month: "short" } : {}),
  }).format(at);
  const label = withZone && !useOffset
    ? new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "short" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value
    : undefined;
  return (
    <span className="tabular-nums">
      {time}
      {label && <span className="ml-1.5 opacity-60">{label}</span>}
    </span>
  );
}
