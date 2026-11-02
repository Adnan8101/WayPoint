"use client";

import { useEffect, useState } from "react";

/** Current wall-clock time in a time zone; renders nothing until mounted to avoid hydration mismatch. */
export function LocalClock({ timeZone, withDate }: { timeZone: string; withDate?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="text-slate-400">…</span>;
  return (
    <span className="tabular-nums">
      {new Intl.DateTimeFormat("en-GB", {
        timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
        ...(withDate ? { weekday: "short", day: "numeric", month: "short" } : {}),
      }).format(now)}
    </span>
  );
}
