"use client";

import { useEffect, useMemo, useState } from "react";
import { AIRPORTS } from "@/lib/data/airports";
import { Autocomplete, type Suggestion } from "@/components/autocomplete";
import { Card } from "@/components/ui";

function zoneParts(timeZone: string, at: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "longOffset" });
  const parts = fmt.formatToParts(at);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value.replace("GMT", "UTC") ?? "UTC";
  const time = parts.filter((p) => p.type !== "timeZoneName").map((p) => p.value).join("").replace(/,\s*$/, "").trim();
  return { time, offset: offset === "UTC" ? "UTC+00:00" : offset };
}

function offsetMinutes(offset: string) {
  const m = offset.match(/([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

export function TimezoneTool() {
  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("timeZone");
    } catch {
      return [...new Set(AIRPORTS.map((a) => a.timeZone))];
    }
  }, []);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("Europe/London");
  const [now, setNow] = useState<Date | null>(null);
  const [home, setHome] = useState("Asia/Kolkata");

  useEffect(() => {
    setNow(new Date());
    setHome(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  const suggest = (q: string): Suggestion[] => {
    const s = q.toLowerCase().replace(/\s+/g, "_");
    const cityHits = AIRPORTS.filter((a) => a.city.toLowerCase().startsWith(q.toLowerCase())).map((a) => ({ value: a.timeZone, primary: a.city, secondary: a.timeZone, badge: a.iata }));
    const zoneHits = zones.filter((z) => z.toLowerCase().includes(s)).slice(0, 8).map((z) => ({ value: z, primary: z.split("/").pop()!.replace(/_/g, " "), secondary: z }));
    const seen = new Set<string>();
    return [...cityHits, ...zoneHits].filter((x) => (seen.has(x.primary + x.value) ? false : (seen.add(x.primary + x.value), true))).slice(0, 8);
  };

  const dest = now ? zoneParts(zone, now) : null;
  const mine = now ? zoneParts(home, now) : null;
  const diff = dest && mine ? offsetMinutes(dest.offset) - offsetMinutes(mine.offset) : 0;

  return (
    <div className="space-y-4">
      <Autocomplete id="tz-q" label="Destination city or time zone" value={query} onChange={setQuery} suggest={suggest} onSelect={(s) => setZone(s.value)} placeholder="e.g. Dubai, New York, Asia/Tokyo" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destination · {zone}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{dest?.time ?? "…"}</p>
          <p className="text-sm text-slate-600">{dest?.offset}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your time · {home}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{mine?.time ?? "…"}</p>
          <p className="text-sm text-slate-600">{mine?.offset}</p>
        </Card>
      </div>
      {dest && (
        <p className="text-sm text-slate-700">
          {diff === 0 ? "Your destination is in the same time zone as you." : `Your destination is ${Math.floor(Math.abs(diff) / 60)}h${Math.abs(diff) % 60 ? ` ${Math.abs(diff) % 60}m` : ""} ${diff > 0 ? "ahead of" : "behind"} you.`}
        </p>
      )}
    </div>
  );
}
