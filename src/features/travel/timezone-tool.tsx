"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WeatherSuggestion } from "@/lib/types";
import { getJson } from "@/lib/client/use-api";
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
  // Zone names come from the browser itself
  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);
  const [query, setQuery] = useState("");
  const session = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));
  const [zone, setZone] = useState<string>();
  const [now, setNow] = useState<Date | null>(null);
  // The visitor's own zone, read from the browser once mounted
  const [home, setHome] = useState<string>();

  useEffect(() => {
    setNow(new Date());
    setHome(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Places from the live geocoder (each carries its zone), plus matching zone names
  const suggest = async (q: string): Promise<Suggestion[]> => {
    const s = q.toLowerCase().replace(/\s+/g, "_");
    const places = q.trim().length >= 2 ? ((await getJson<WeatherSuggestion[]>(`/api/weather/places?${new URLSearchParams({ q: q.trim(), session: session.current })}`)) ?? []) : [];
    // Google suggestions carry a place ID; the zone is looked up when one is picked
    const cityHits = places.map((p) => ({
      value: p.place?.timeZone ?? (p.placeId ? `pid:${p.placeId}` : ""),
      primary: p.name,
      secondary: p.secondary || p.place?.timeZone,
      badge: p.place?.countryCode,
    })).filter((x) => x.value);
    const zoneHits = zones.filter((z) => z.toLowerCase().includes(s)).slice(0, 8).map((z) => ({ value: z, primary: z.split("/").pop()!.replace(/_/g, " "), secondary: z }));
    const seen = new Set<string>();
    return [...cityHits, ...zoneHits].filter((x) => (seen.has(x.primary + x.value) ? false : (seen.add(x.primary + x.value), true))).slice(0, 8);
  };

  const dest = now && zone ? zoneParts(zone, now) : null;
  const mine = now && home ? zoneParts(home, now) : null;
  const diff = dest && mine ? offsetMinutes(dest.offset) - offsetMinutes(mine.offset) : 0;

  return (
    <div className="space-y-4">
      <Autocomplete id="tz-q" label="Destination city or time zone" value={query} onChange={setQuery} suggest={suggest} onSelect={async (s) => {
        if (!s.value.startsWith("pid:")) return setZone(s.value);
        setTimeout(() => setQuery(s.primary));
        const r = await getJson<{ timeZone: string }>(`/api/geo/zone?pid=${encodeURIComponent(s.value.slice(4))}`);
        if (r?.timeZone) setZone(r.timeZone);
        session.current = crypto.randomUUID();
      }} placeholder="Search a city or time zone" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="label">Destination{zone ? ` · ${zone}` : ""}</p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-ink">{dest?.time ?? (zone ? "…" : "—")}</p>
          <p className="text-sm text-slate-600">{dest?.offset ?? "Search above to compare"}</p>
        </Card>
        <Card className="p-5">
          <p className="label">Your time{home ? ` · ${home}` : ""}</p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-ink">{mine?.time ?? "…"}</p>
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
