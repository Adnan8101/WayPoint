"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { Flight } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { normalizeFlightNumber } from "@/lib/validation";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import { FlightStatusForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton, Skeleton, TimeLegend } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, ShareButton, TimeTag } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import { greatCircle, type MapPoint } from "@/components/route-map";
import { AlertIcon } from "@/components/icons";
import { FlightHeader, FlightTimeline } from "./flight-parts";

const RouteMap = dynamic(() => import("@/components/route-map"), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });

export function FlightTrackerView() {
  const params = useSearchParams();
  const raw = params.get("flight") ?? "";
  const date = params.get("date") ?? "";
  const flight = normalizeFlightNumber(raw);
  const req = useMemo(() => (raw ? { url: `/api/flights/status?number=${encodeURIComponent(raw)}&date=${encodeURIComponent(date)}` } : null), [raw, date]);
  const { state, refresh } = useApi<Flight[]>(req);

  useEffect(() => {
    if (state.status === "success" && flight) addRecent({ kind: "tracker", label: `Track ${flight}`, href: `/flight-tracker?flight=${flight}&date=${date}` });
  }, [state.status, flight, date]);

  return (
    <>
      <SearchPanel>
        <FlightStatusForm target="/flight-tracker" key={`${raw}-${date}`} initial={{ number: raw, date: date || undefined }} />
      </SearchPanel>
      <Section>
        <ApiResult
          state={state}
          onRetry={refresh}
          skeleton={<ResultSkeleton rows={6} />}
          idle={
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <EmptyState art="tracker" title="Track a flight on the map">Enter a flight number to see its route, progress and, when the provider reports it, the aircraft&apos;s live position.</EmptyState>
              <RecentList kinds={["tracker", "flight"]} />
            </div>
          }
        >
          {(data, meta, refreshing) => {
            // Prefer the leg that is currently airborne, else the first one
            const f = data.find((x) => x.status === "In Air" || x.status === "Departed") ?? data[0];
            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[22px] font-semibold tracking-tight text-ink">Tracking {f.number} · {fmtDate(date)}</h2>
                  <ShareButton title={`Track flight ${f.number}`} />
                </div>
                <Freshness meta={{ ...meta, providerUpdatedAt: f.position?.reportedAt ?? meta.providerUpdatedAt }} onRefresh={refresh} refreshing={refreshing} staleAfterMs={5 * 60_000} providerLabel="Position reported" />
                <Card className="p-5 sm:p-6">
                  <FlightHeader flight={f} />
                  <div className="mt-6"><FlightTimeline flight={f} /></div>
                </Card>
                <TrackerMap flight={f} />
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Departure · {f.departure.airport.iata}</p>
                    <div className="mt-2 space-y-1">
                      <div><TimeTag t={f.departure.scheduled} /></div>
                      {(f.departure.actual ?? f.departure.estimated) && <div><TimeTag t={f.departure.actual ?? f.departure.estimated} /></div>}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Arrival · {f.arrival.airport.iata}</p>
                    <div className="mt-2 space-y-1">
                      <div><TimeTag t={f.arrival.scheduled} /></div>
                      {(f.arrival.actual ?? f.arrival.estimated) && <div><TimeTag t={f.arrival.actual ?? f.arrival.estimated} /></div>}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Aircraft</p>
                    {f.aircraft || f.position ? (
                      <dl className="mt-2 space-y-1 text-sm">
                        {f.aircraft?.model && <div><dt className="inline text-slate-500">Type: </dt><dd className="inline font-medium">{f.aircraft.model}</dd></div>}
                        {f.aircraft?.registration && <div><dt className="inline text-slate-500">Registration: </dt><dd className="inline font-medium">{f.aircraft.registration}</dd></div>}
                        {f.position?.altitudeFt !== undefined && <div><dt className="inline text-slate-500">Altitude: </dt><dd className="inline font-medium">{Math.round(f.position.altitudeFt).toLocaleString("en-IN")} ft</dd></div>}
                        {f.position?.groundSpeedKt !== undefined && <div><dt className="inline text-slate-500">Ground speed: </dt><dd className="inline font-medium">{Math.round(f.position.groundSpeedKt)} kt</dd></div>}
                      </dl>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Aircraft details not reported for this flight.</p>
                    )}
                  </Card>
                </div>
                <TimeLegend />
              </div>
            );
          }}
        </ApiResult>
      </Section>
    </>
  );
}

function TrackerMap({ flight }: { flight: Flight }) {
  const dep = flight.departure.airport;
  const arr = flight.arrival.airport;
  const { points, path, passed } = useMemo(() => {
    const pts: MapPoint[] = [];
    let path: [number, number][] = [];
    let passed: [number, number][] | undefined;
    if (dep.lat !== undefined && dep.lon !== undefined) pts.push({ lat: dep.lat, lon: dep.lon, label: dep.iata ?? dep.name, kind: "origin" });
    if (arr.lat !== undefined && arr.lon !== undefined) pts.push({ lat: arr.lat, lon: arr.lon, label: arr.iata ?? arr.name, kind: "destination" });
    if (pts.length === 2) path = greatCircle([pts[0].lat, pts[0].lon], [pts[1].lat, pts[1].lon]);
    if (flight.position) {
      pts.push({ lat: flight.position.lat, lon: flight.position.lon, label: `${flight.number} (reported position)`, kind: "aircraft" });
      if (dep.lat !== undefined && dep.lon !== undefined) passed = greatCircle([dep.lat, dep.lon], [flight.position.lat, flight.position.lon], 32);
    }
    return { points: pts, path, passed };
  }, [flight, dep, arr]);

  if (points.length < 2 && !flight.position) {
    return <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">Map unavailable: the provider did not return airport coordinates for this flight.</p>;
  }
  const airborne = flight.status === "In Air" || flight.status === "Departed";
  return (
    <div className="space-y-2">
      <RouteMap points={points} path={path} passedPath={passed} heightClass="h-96" headingDeg={flight.position?.trackDeg} />
      {flight.position ? (
        <p className="text-xs text-slate-500">
          Aircraft position reported {fmtRelative(flight.position.reportedAt)}{flight.position.reportedAt ? ` (${fmtDateTime(flight.position.reportedAt)})` : ""}. The route line is the great-circle path, not the actual flight path.
        </p>
      ) : (
        <p className="flex items-start gap-2 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" />
          {airborne
            ? "Live aircraft position is not available for this flight right now. We show the planned route and the latest reported status instead of guessing the position."
            : "The aircraft position is shown only while the flight is airborne and reported by the provider. The line shows the planned great-circle route."}
        </p>
      )}
    </div>
  );
}
