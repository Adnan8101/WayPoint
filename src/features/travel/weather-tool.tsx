"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { WeatherReport } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { fmtDate } from "@/lib/format";
import { ApiResult } from "@/components/api-result";
import { Freshness, ResultSkeleton } from "@/components/result-states";
import { Button, Field } from "@/components/ui";
import { LocalClock } from "@/components/local-clock";
import { SearchIcon } from "@/components/icons";

// WMO weather interpretation codes (used by Open-Meteo)
const WMO: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Freezing fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Showers", 81: "Showers", 82: "Violent showers", 85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Thunderstorm, heavy hail",
};
const describe = (c: number) => WMO[c] ?? "Conditions unavailable";

function offsetLabel(sec: number) {
  const sign = sec >= 0 ? "+" : "−";
  const a = Math.abs(sec);
  return `UTC${sign}${String(Math.floor(a / 3600)).padStart(2, "0")}:${String(Math.floor((a % 3600) / 60)).padStart(2, "0")}`;
}

export function WeatherTool() {
  const [input, setInput] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string>();
  const req = useMemo(() => (city ? { url: `/api/weather?city=${encodeURIComponent(city)}` } : null), [city]);
  const { state, refresh } = useApi<WeatherReport>(req);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim().length < 2) return setError("Enter a city name.");
    setError(undefined);
    if (input.trim() === city) refresh();
    else setCity(input.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} noValidate className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
        <Field id="wx-city" label="City" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Delhi, London, Singapore" error={error} maxLength={60} />
        <Button type="submit" loading={state.status === "loading"} className="h-12"><SearchIcon width={16} height={16} /> Get weather</Button>
      </form>
      <ApiResult state={state} onRetry={refresh} skeleton={<ResultSkeleton rows={3} />}>
        {(w, meta, refreshing) => {
          const label = describe(w.current.code);
          return (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[20px] bg-ink p-6 text-white sm:p-8">
                <div className="route-pattern absolute inset-0" aria-hidden />
                <div className="relative grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-end">
                  <div>
                    <p className="text-[13px] text-slate-400">{[w.location.region, w.location.country].filter(Boolean).join(", ")}</p>
                    <h3 className="font-display mt-1 text-4xl font-semibold sm:text-5xl">{w.location.name}</h3>
                    <p className="mt-3 text-[14px] text-slate-300">
                      <span className="font-mono text-mint"><LocalClock timeZone={w.location.timeZone} withDate /></span> local time · {offsetLabel(w.utcOffsetSeconds)}{w.timeZoneAbbr ? ` (${w.timeZoneAbbr})` : ""}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="font-display text-7xl font-semibold sm:text-8xl">{Math.round(w.current.temperatureC)}°</p>
                    <p className="text-[15px] text-slate-300">{label}{w.current.apparentC !== undefined ? ` · feels like ${Math.round(w.current.apparentC)}°` : ""}</p>
                  </div>
                </div>
                <dl className="relative mt-8 grid grid-cols-3 gap-3">
                  {[
                    ["Humidity", `${Math.round(w.current.humidity)}%`],
                    ["Wind", `${Math.round(w.current.windKmh)} km/h`],
                    ["Observed", w.current.time.slice(11, 16) || "--:--"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <dt className="text-[12.5px] text-slate-400">{k}</dt>
                      <dd className="mt-0.5 font-mono text-lg text-white">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <p className="mb-3 text-[15px] font-semibold text-ink">Next 7 days</p>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {w.daily.map((d, i) => (
                    <li key={d.date} className={`rounded-2xl border p-3.5 ${i === 0 ? "border-brand-200 bg-brand-50/60" : "border-slate-200 bg-white"}`}>
                      <p className="text-[12.5px] font-medium text-slate-500">{i === 0 ? "Today" : fmtDate(d.date, { weekday: "short", day: "numeric" })}</p>
                      <p className="mt-2 font-mono text-[17px] font-medium text-ink">{Math.round(d.maxC)}°<span className="text-slate-400"> {Math.round(d.minC)}°</span></p>
                      <p className="mt-1 text-[12.5px] leading-snug text-slate-500">{describe(d.code)}</p>
                      {d.precipProb !== undefined && d.precipProb !== null && <p className="mt-1.5 text-[12px] font-medium text-sky-700">{d.precipProb}% rain</p>}
                    </li>
                  ))}
                </ul>
              </div>
              <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={60 * 60_000} />
            </div>
          );
        }}
      </ApiResult>
    </div>
  );
}
