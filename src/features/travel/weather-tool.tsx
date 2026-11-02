"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { AirQuality, ApiMeta, Place, WeatherReport, WeatherSuggestion } from "@/lib/types";
import { getJson, useApi } from "@/lib/client/use-api";
import { cx, fmtDate } from "@/lib/format";
import { ApiResult } from "@/components/api-result";
import { Autocomplete, type Suggestion } from "@/components/autocomplete";
import { Freshness, ResultSkeleton } from "@/components/result-states";
import { Button } from "@/components/ui";
import { LocalClock } from "@/components/local-clock";
import { WeatherIcon } from "@/components/weather-icon";
import { SearchIcon } from "@/components/icons";

// WMO weather interpretation codes (the provider adapter maps into these)
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

/** Places this device has looked up, newest first */
const RECENT_KEY = "waypoint:weather:recent";
const RECENT_MAX = 6;

type Query = { kind: "place"; place: Place } | { kind: "pid"; placeId: string; name: string } | { kind: "city"; city: string };

const newSession = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function readRecent(): Place[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((p) => p && typeof p.name === "string" && Number.isFinite(p.lat) && Number.isFinite(p.lon)) : [];
  } catch {
    return [];
  }
}

/** The searcher's own time zone, so same-named places nearer them rank first */
const userTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

function offsetLabel(sec: number) {
  const sign = sec >= 0 ? "+" : "−";
  const a = Math.abs(sec);
  return `UTC${sign}${String(Math.floor(a / 3600)).padStart(2, "0")}:${String(Math.floor((a % 3600) / 60)).padStart(2, "0")}`;
}

const placeLabel = (p: Place) => [p.name, p.region && p.region !== p.name ? p.region : undefined].filter(Boolean).join(", ");

function toUrl(q: Query): string {
  if (q.kind === "city") return `/api/weather?${new URLSearchParams({ city: q.city, utz: userTz() })}`;
  if (q.kind === "pid") return `/api/weather?${new URLSearchParams({ pid: q.placeId, name: q.name })}`;
  const p = q.place;
  const s = new URLSearchParams({ lat: String(p.lat), lon: String(p.lon), name: p.name });
  if (p.district) s.set("district", p.district);
  if (p.region) s.set("region", p.region);
  if (p.country) s.set("country", p.country);
  if (p.timeZone) s.set("tz", p.timeZone);
  return `/api/weather?${s}`;
}

export function WeatherTool() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<Query | null>(null);
  const [error, setError] = useState<string>();
  // Suggestions are shown as labels; keep what's behind each one to look it up exactly
  const known = useRef(new Map<string, WeatherSuggestion>());
  // One Google autocomplete session per search, renewed after each pick
  const session = useRef(newSession());
  const req = useMemo(() => (query ? { url: toUrl(query) } : null), [query]);
  const { state, refresh } = useApi<WeatherReport>(req);

  const [recent, setRecent] = useState<Place[]>([]);

  // A place passed in the link (e.g. from Ask) wins; otherwise reopen the last place looked up on this device
  useEffect(() => {
    const list = readRecent();
    setRecent(list);
    const wanted = new URLSearchParams(window.location.search).get("wx")?.trim();
    if (wanted && wanted.length >= 2) {
      setQuery({ kind: "city", city: wanted.slice(0, 60) });
      setInput(wanted.slice(0, 60));
    } else if (list[0]) {
      setQuery({ kind: "place", place: list[0] });
      setInput(placeLabel(list[0]));
    }
  }, []);

  // Remember each place that returned weather
  useEffect(() => {
    if (state.status !== "success") return;
    const p = state.data.location;
    const next = [p, ...readRecent().filter((r) => !(Math.abs(r.lat - p.lat) < 0.01 && Math.abs(r.lon - p.lon) < 0.01))].slice(0, RECENT_MAX);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  const forget = () => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* storage unavailable */
    }
  };

  const suggest = useCallback(async (q: string): Promise<Suggestion[]> => {
    const list = (await getJson<WeatherSuggestion[]>(`/api/weather/places?${new URLSearchParams({ q, utz: userTz(), session: session.current })}`)) ?? [];
    return list.map((sug) => {
      const label = sug.secondary ? `${sug.name}, ${sug.secondary}` : sug.name;
      known.current.set(label, sug);
      return { value: label, primary: sug.name, secondary: sug.secondary || undefined, badge: sug.place?.countryCode };
    });
  }, []);

  const fromSuggestion = (sug: WeatherSuggestion): Query =>
    sug.place ? { kind: "place", place: sug.place } : { kind: "pid", placeId: sug.placeId!, name: sug.name };

  const run = (q: Query) => {
    setError(undefined);
    session.current = newSession();
    if (query && toUrl(query) === toUrl(q)) refresh();
    else setQuery(q);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (text.length < 2) return setError("Enter a city, town or area.");
    const sug = known.current.get(text);
    run(sug ? fromSuggestion(sug) : { kind: "city", city: text });
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} noValidate className="grid items-start gap-3 sm:grid-cols-[1fr_auto]">
        <Autocomplete
          id="wx-city"
          label="City or area"
          value={input}
          onChange={setInput}
          suggest={suggest}
          minChars={2}
          onSelect={(s) => {
            const sug = known.current.get(s.value);
            if (sug) run(fromSuggestion(sug));
          }}
          placeholder="Search any city, town or area"
          hint="Pick a suggestion for the exact area"
          error={error}
        />
        <Button type="submit" loading={state.status === "loading"} className="h-12 sm:mt-[26px]"><SearchIcon width={16} height={16} /> Get weather</Button>
      </form>
      {recent.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label mr-1">Recent</span>
          {recent.map((p) => (
            <button
              key={`${p.lat},${p.lon}`}
              type="button"
              onClick={() => { setInput(placeLabel(p)); run({ kind: "place", place: p }); }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 transition-all hover:-translate-y-px hover:border-ink hover:text-ink"
            >
              {p.name}
            </button>
          ))}
          <button type="button" onClick={forget} className="ml-1 font-mono text-[11px] font-medium uppercase tracking-wider text-slate-400 hover:text-red-600">
            Clear
          </button>
        </div>
      )}

      <ApiResult state={state} onRetry={refresh} skeleton={<ResultSkeleton rows={4} />}>
        {(w, meta, refreshing) => <Report w={w} meta={meta} refreshing={refreshing} refresh={refresh} />}
      </ApiResult>
    </div>
  );
}

function Report({ w, meta, refreshing, refresh }: { w: WeatherReport; meta: ApiMeta; refreshing: boolean; refresh: () => void }) {
  const c = w.current;
  const label = c.description ? c.description[0].toUpperCase() + c.description.slice(1) : describe(c.code);
  const lo = Math.min(...w.daily.map((d) => d.minC));
  const hi = Math.max(...w.daily.map((d) => d.maxC));
  const tiles: [string, string, React.ReactNode?][] = [
    ["Feels like", c.apparentC !== undefined ? `${Math.round(c.apparentC)}°` : "—"],
    ["Humidity", `${Math.round(c.humidity)}%`],
    [
      "Wind",
      `${Math.round(c.windKmh)} km/h`,
      c.windDirDeg !== undefined ? (
        <svg width="14" height="14" viewBox="0 0 24 24" aria-label={`from ${Math.round(c.windDirDeg)}°`} style={{ transform: `rotate(${c.windDirDeg + 180}deg)` }}>
          <path d="M12 3l5 14-5-3-5 3z" fill="currentColor" />
        </svg>
      ) : undefined,
    ],
    ["Gusts", c.gustKmh !== undefined ? `${Math.round(c.gustKmh)} km/h` : "—"],
    ["Visibility", c.visibilityKm !== undefined ? `${c.visibilityKm >= 10 ? "10+" : c.visibilityKm.toFixed(1)} km` : "—"],
    ["Pressure", c.pressureHpa !== undefined ? `${c.pressureHpa} hPa` : "—"],
    ["Sunrise", c.sunrise ?? "—"],
    ["Sunset", c.sunset ?? "—"],
    ...(c.uvIndex !== undefined ? [["UV index", `${c.uvIndex}${c.uvIndex >= 8 ? " · very high" : c.uvIndex >= 6 ? " · high" : c.uvIndex >= 3 ? " · moderate" : " · low"}`] as [string, string]] : []),
    ...(c.precipProb !== undefined ? [["Rain chance", `${c.precipProb}%`] as [string, string]] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="grain relative overflow-hidden rounded-[24px] bg-ink p-6 text-white sm:p-8">
        <div className="glow-signal absolute inset-0" aria-hidden />
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <p className="label !text-white/45">{[w.location.district, w.location.region, w.location.country].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ")}</p>
            <h3 className="font-display mt-2 text-[44px] font-bold sm:text-[56px]">{w.location.name}</h3>
            <p className="mt-3 text-[14px] text-white/60">
              <span className="font-mono font-semibold text-signal"><LocalClock timeZone={w.location.timeZone} offsetSeconds={w.utcOffsetSeconds} withDate /></span> local time · {offsetLabel(w.utcOffsetSeconds)}
            </p>
          </div>
          <div className="flex items-center gap-4 md:justify-end">
            <WeatherIcon code={c.code} isDay={c.isDay} size={96} className="text-white/90 animate-float" label={label} />
            <div className="md:text-right">
              <p className="font-display text-[80px] font-bold leading-none sm:text-[104px]">{Math.round(c.temperatureC)}<span className="text-signal">°</span></p>
              <p className="mt-1 text-[15px] text-white/65">{label}</p>
            </div>
          </div>
        </div>
        <dl className="relative mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/[0.08] sm:grid-cols-4">
          {tiles.map(([k, v, extra]) => (
            <div key={k} className="bg-ink/85 p-4">
              <dt className="label !text-white/40">{k}</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-mono text-lg font-semibold text-white">{v}{extra && <span className="text-signal">{extra}</span>}</dd>
            </div>
          ))}
        </dl>
      </div>

      {w.hourly.length > 0 && (
        <div>
          <p className="label mb-3">Next 24 hours</p>
          <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {w.hourly.map((h, i) => (
              <li key={h.time} className="animate-fade-up flex w-[88px] shrink-0 flex-col items-center rounded-2xl border border-slate-200/80 bg-white py-3.5 shadow-[var(--shadow-card)]" style={{ animationDelay: `${i * 40}ms` }}>
                <p className="font-mono text-[11px] font-semibold text-slate-500">{h.time.slice(11, 16)}</p>
                <WeatherIcon code={h.code} isDay={h.isDay} size={40} className="my-1.5 text-slate-300" />
                <p className="font-mono text-[16px] font-bold text-ink">{Math.round(h.tempC)}°</p>
                <p className={cx("mt-0.5 font-mono text-[11px]", (h.precipProb ?? 0) >= 30 ? "font-semibold text-sky-700" : "text-slate-400")}>{h.precipProb !== undefined ? `${h.precipProb}%` : " "}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="label mb-3">{w.daily.length}-day forecast</p>
        <ul className="grid gap-2">
          {w.daily.map((d, i) => {
            const left = hi > lo ? ((d.minC - lo) / (hi - lo)) * 100 : 0;
            const width = hi > lo ? ((d.maxC - d.minC) / (hi - lo)) * 100 : 100;
            return (
              <li
                key={d.date}
                className={cx(
                  "animate-fade-up grid grid-cols-[84px_44px_1fr] items-center gap-3 rounded-2xl border px-4 py-3 sm:grid-cols-[120px_48px_160px_1fr_60px] sm:gap-4",
                  i === 0 ? "border-ink bg-ink text-white" : "border-slate-200/80 bg-white shadow-[var(--shadow-card)]",
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <p className={cx("font-mono text-[12px] font-semibold uppercase tracking-wider", i === 0 ? "text-signal" : "text-slate-500")}>{i === 0 ? "Today" : fmtDate(d.date, { weekday: "short", day: "numeric" })}</p>
                <WeatherIcon code={d.code} size={40} className={i === 0 ? "text-white/85" : "text-slate-300"} />
                <p className={cx("hidden text-[13.5px] sm:block", i === 0 ? "text-white/70" : "text-slate-600")}>{describe(d.code)}</p>
                <div className="flex items-center gap-3">
                  <span className={cx("w-9 text-right font-mono text-[14px]", i === 0 ? "text-white/50" : "text-slate-400")}>{Math.round(d.minC)}°</span>
                  <span className={cx("relative h-1.5 flex-1 rounded-full", i === 0 ? "bg-white/10" : "bg-slate-100")}>
                    <span className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400 via-signal to-orange-500" style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }} />
                  </span>
                  <span className={cx("w-9 font-mono text-[14px] font-bold", i === 0 ? "text-white" : "text-ink")}>{Math.round(d.maxC)}°</span>
                </div>
                <p className={cx("hidden text-right font-mono text-[12px] sm:block", (d.precipProb ?? 0) >= 30 ? (i === 0 ? "text-sky-300" : "font-semibold text-sky-700") : i === 0 ? "text-white/40" : "text-slate-400")}>
                  {d.precipProb !== undefined ? `${d.precipProb}% rain` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
      <AirQualityPanel lat={w.location.lat} lon={w.location.lon} />
      <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={60 * 60_000} />
    </div>
  );
}

/** Current air quality from Google, using the country's own index where available */
function AirQualityPanel({ lat, lon }: { lat: number; lon: number }) {
  const req = useMemo(() => ({ url: `/api/weather/air?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}` }), [lat, lon]);
  const { state } = useApi<AirQuality>(req);
  if (state.status !== "success") return null;
  const a = state.data;
  const main = a.pollutants.filter((p) => ["pm25", "pm10", "o3", "no2"].includes(p.code));
  return (
    <div className="animate-fade-up grid gap-4 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-card)] sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
      <div className="flex items-center gap-4">
        <span className="grid size-20 place-items-center rounded-full text-ink ring-4 ring-white" style={{ background: a.color, boxShadow: `0 10px 24px -10px ${a.color}` }}>
          <span className="font-display text-[28px] font-bold leading-none">{Math.round(a.aqi)}</span>
        </span>
        <div>
          <p className="label">{a.indexName}</p>
          <p className="font-display mt-1 text-[20px] font-bold text-ink">{a.category}</p>
          {a.dominant && <p className="text-[12.5px] text-slate-500">Main pollutant: {a.dominant.toUpperCase()}</p>}
        </div>
      </div>
      <div className="space-y-3">
        {main.length > 0 && (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {main.map((p) => (
              <div key={p.code} className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="label !text-[10px]">{p.name}</dt>
                <dd className="font-mono text-[14px] font-semibold text-ink">{Math.round(p.value)} <span className="text-[11px] font-normal text-slate-400">{p.units}</span></dd>
              </div>
            ))}
          </dl>
        )}
        {a.advice && <p className="text-[13.5px] leading-relaxed text-slate-600">{a.advice}</p>}
      </div>
    </div>
  );
}
