"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaceSuggestion, RouteResult, TravelMode } from "@/lib/places-types";
import { getJson } from "@/lib/client/use-api";
import { decodePolyline } from "@/lib/client/google-maps";
import { cx, fmtDuration } from "@/lib/format";
import { Autocomplete, type Suggestion } from "@/components/autocomplete";
import { Card } from "@/components/ui";
import { Skeleton } from "@/components/result-states";
import type { MapPoint } from "@/components/route-map";
import { Scene } from "@/components/illustrations";

const RouteMap = dynamic(() => import("@/components/route-map"), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> });

/** Where the journey starts: the browser's position, or a place the person picked */
type Origin = { kind: "here"; lat: number; lng: number; label: string } | { kind: "place"; placeId: string; label: string };

export interface Destination {
  label: string;
  lat?: number;
  lon?: number;
  /** Used when coordinates aren't known, e.g. "Howrah Jn railway station" */
  address?: string;
}

const MODES: { mode: TravelMode; label: string; icon: string }[] = [
  { mode: "DRIVE", label: "Car", icon: "M5 16h14M6 16l1.5-5h9L18 16M7 19.5v-1.5M17 19.5v-1.5M8 13.5h.01M16 13.5h.01" },
  { mode: "TWO_WHEELER", label: "Two-wheeler", icon: "M5.5 17.5a2.5 2.5 0 1 0 0-.01M18.5 17.5a2.5 2.5 0 1 0 0-.01M8 17h6l2-5h-4l-2-3H8M16 12l2.5 5.5" },
  { mode: "TRANSIT", label: "Public transport", icon: "M7 4h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM5 11h14M8 20l1.5-3M16 20l-1.5-3M8.5 14h.01M15.5 14h.01" },
  { mode: "WALK", label: "Walk", icon: "M13 4.5a1.5 1.5 0 1 0 0-.01M10 21l2-6 2.5 2.5V21M9 11.5l2-3 3 1.5 2 3M11 8.5 9 15" },
];

const ORIGIN_KEY = "waypoint:origin";
const newSession = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const timeFmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

function relative(ms: number): string {
  const m = Math.round(Math.abs(ms) / 60_000);
  const t = m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  return ms >= 0 ? `in ${t}` : `${t} ago`;
}

/**
 * Travel time to a station or airport by each mode, and, given a departure time,
 * when to leave. Times come from Google's Routes API with live traffic.
 */
export function GetThere({ destination, departAt, buffers = [15, 30, 60], defaultBuffer = 30, title = "Get there" }: {
  destination: Destination;
  /** ISO time the train or flight leaves */
  departAt?: string;
  buffers?: number[];
  defaultBuffer?: number;
  title?: string;
}) {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [input, setInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string>();
  const [mode, setMode] = useState<TravelMode>("DRIVE");
  const [buffer, setBuffer] = useState(defaultBuffer);
  const [routes, setRoutes] = useState<Partial<Record<TravelMode, RouteResult | "none" | "loading">>>({});
  const [now, setNow] = useState(() => Date.now());
  const session = useRef(newSession());
  const known = useRef(new Map<string, string>());

  // Remember the last starting point on this device
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORIGIN_KEY) ?? "null") as Origin | null;
      if (saved && (saved.kind === "here" || saved.kind === "place")) {
        setOrigin(saved);
        setInput(saved.label);
      }
    } catch {
      /* storage unavailable */
    }
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const pick = (o: Origin) => {
    setOrigin(o);
    setInput(o.label);
    session.current = newSession();
    try {
      localStorage.setItem(ORIGIN_KEY, JSON.stringify(o));
    } catch {
      /* storage unavailable */
    }
  };

  const useHere = () => {
    if (!navigator.geolocation) return setLocError("Your browser can't share its location.");
    setLocating(true);
    setLocError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        pick({ kind: "here", lat: pos.coords.latitude, lng: pos.coords.longitude, label: "My location" });
      },
      () => {
        setLocating(false);
        setLocError("Location permission was denied. Type where you're starting from instead.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 120_000 },
    );
  };

  const suggest = async (q: string): Promise<Suggestion[]> => {
    const list = (await getJson<PlaceSuggestion[]>(`/api/places/autocomplete?${new URLSearchParams({ q, session: session.current })}`)) ?? [];
    return list.map((s) => {
      const label = s.secondary ? `${s.main}, ${s.secondary}` : s.main;
      known.current.set(label, s.placeId);
      return { value: label, primary: s.main, secondary: s.secondary };
    });
  };

  const to = useMemo(() => {
    const p = new URLSearchParams();
    if (destination.lat !== undefined && destination.lon !== undefined) p.set("to", `${destination.lat},${destination.lon}`);
    else if (destination.address) p.set("toAddress", destination.address);
    return p.toString();
  }, [destination.lat, destination.lon, destination.address]);

  // Ask for every mode at once so the comparison is instant
  useEffect(() => {
    if (!origin || !to) return;
    const from = origin.kind === "here" ? `from=${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}` : `fromPlace=${encodeURIComponent(origin.placeId)}`;
    setRoutes(Object.fromEntries(MODES.map((m) => [m.mode, "loading"])));
    let live = true;
    for (const m of MODES) {
      const arrive = departAt && m.mode === "TRANSIT" ? `&arriveBy=${encodeURIComponent(new Date(Date.parse(departAt) - buffer * 60_000).toISOString())}` : "";
      getJson<RouteResult>(`/api/directions?${from}&${to}&mode=${m.mode}${arrive}`).then((r) => {
        if (live) setRoutes((cur) => ({ ...cur, [m.mode]: r ?? "none" }));
      });
    }
    return () => {
      live = false;
    };
  }, [origin, to, departAt, buffer]);

  const chosen = routes[mode];
  const route = chosen && chosen !== "loading" && chosen !== "none" ? chosen : undefined;
  const path = useMemo(() => (route ? decodePolyline(route.polyline) : []), [route]);
  const points = useMemo<MapPoint[]>(() => {
    if (!path.length) return destination.lat !== undefined && destination.lon !== undefined ? [{ lat: destination.lat, lon: destination.lon, label: destination.label, kind: "destination" }] : [];
    return [
      { lat: path[0][0], lon: path[0][1], label: origin?.label ?? "Start", kind: "origin" },
      { lat: path.at(-1)![0], lon: path.at(-1)![1], label: destination.label, kind: "destination" },
    ];
  }, [path, destination, origin]);

  const departMs = departAt ? Date.parse(departAt) : NaN;
  const leaveMs = route && Number.isFinite(departMs) ? departMs - route.durationSeconds * 1000 - buffer * 60_000 : undefined;
  const late = leaveMs !== undefined && leaveMs < now;

  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="label">Door to {destination.label}</p>
            <h3 className="font-display mt-2 text-[26px] font-bold text-ink">{title}</h3>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-2">
              <Autocomplete
                id={`gt-from-${destination.label.replace(/\W+/g, "-")}`}
                label="Starting from"
                value={input}
                onChange={setInput}
                suggest={suggest}
                minChars={3}
                onSelect={(s) => {
                  const id = known.current.get(s.value);
                  if (id) pick({ kind: "place", placeId: id, label: s.value });
                }}
                placeholder="Home, office, a hotel…"
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={useHere}
                disabled={locating}
                className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-semibold text-ink shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-ink disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className={locating ? "animate-spin" : undefined}>
                  <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                {locating ? "Locating…" : "Use my location"}
              </button>
            </div>
            {locError && <p className="text-[13px] font-medium text-red-600">{locError}</p>}
          </div>

          {origin && (
            <ul className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Travel mode">
              {MODES.map((m) => {
                const r = routes[m.mode];
                const ok = r && r !== "loading" && r !== "none";
                return (
                  <li key={m.mode}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={mode === m.mode}
                      disabled={r === "none"}
                      onClick={() => setMode(m.mode)}
                      className={cx(
                        "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                        mode === m.mode ? "border-ink bg-ink text-white shadow-[0_8px_20px_-10px_rgb(11_13_16/0.7)]" : "border-slate-200 bg-white hover:border-ink",
                        r === "none" && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={mode === m.mode ? "text-signal" : "text-slate-500"}>
                        <path d={m.icon} />
                      </svg>
                      <span className="min-w-0">
                        <span className={cx("block text-[12px]", mode === m.mode ? "text-white/60" : "text-slate-500")}>{m.label}</span>
                        <span className="block font-mono text-[15px] font-bold">
                          {r === "loading" ? "…" : ok ? fmtDuration(Math.round((r as RouteResult).durationSeconds / 60)) : "No route"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {origin && route && Number.isFinite(departMs) && leaveMs !== undefined && (
            <div className={cx("rounded-2xl p-4", late ? "bg-red-50 ring-1 ring-inset ring-red-200" : "bg-signal-soft ring-1 ring-inset ring-amber-200")}>
              <p className="label">{late ? "You're cutting it close" : "Leave by"}</p>
              <p className="font-display mt-1 text-[36px] font-bold leading-none text-ink">{timeFmt(new Date(leaveMs))}</p>
              <p className={cx("mt-1.5 text-[13.5px]", late ? "font-semibold text-red-700" : "text-slate-600")}>
                {relative(leaveMs - now)} · departs {timeFmt(new Date(departMs))} · {route.distanceText ?? `${(route.distanceMeters / 1000).toFixed(1)} km`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[12.5px] text-slate-500">Arrive early by</span>
                {buffers.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBuffer(b)}
                    className={cx("rounded-full px-2.5 py-1 font-mono text-[12px] font-semibold transition-colors", buffer === b ? "bg-ink text-signal" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-ink")}
                  >
                    {b >= 60 ? `${b / 60}h` : `${b}m`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {origin && route && !departAt && (
            <p className="text-[14px] text-slate-600">
              About <strong className="font-semibold text-ink">{fmtDuration(Math.round(route.durationSeconds / 60))}</strong> right now, {route.distanceText ?? `${(route.distanceMeters / 1000).toFixed(1)} km`}.
            </p>
          )}
          {!origin && <p className="text-[13.5px] text-slate-500">Travel times include live traffic. Your starting point stays on this device.</p>}
        </div>
        <div className="border-t border-slate-200/80 lg:border-l lg:border-t-0">
          {points.length ? (
            <RouteMap points={points} path={path} heightClass="h-72 lg:h-full lg:min-h-[22rem]" />
          ) : (
            <div className="dot-field grid h-72 place-items-center p-8 lg:h-full lg:min-h-[22rem]">
              <Scene kind="route" theme="light" className="w-full max-w-[300px]" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
