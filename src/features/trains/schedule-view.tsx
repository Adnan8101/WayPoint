"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ApiMeta, ScheduleStop, TrainSchedule } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { cx, fmtDuration } from "@/lib/format";
import { TrainNumberForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton, Skeleton } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, ShareButton, Tabs } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import type { MapPoint } from "@/components/route-map";
import { RunDays, TrainTitle } from "./train-parts";

const RouteMap = dynamic(() => import("@/components/route-map"), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });

export function ScheduleView() {
  const params = useSearchParams();
  const train = params.get("train") ?? "";
  const [tab, setTab] = useState<"timetable" | "route">(params.get("view") === "route" ? "route" : "timetable");
  const req = useMemo(() => (train ? { url: `/api/trains/schedule?train=${encodeURIComponent(train)}` } : null), [train]);
  const { state, refresh } = useApi<TrainSchedule>(req);

  useEffect(() => {
    if (state.status === "success") addRecent({ kind: "schedule", label: `${state.data.trainNumber} ${state.data.trainName}`.trim(), href: `/train-schedule?train=${train}` });
  }, [state, train]);

  return (
    <>
      <SearchPanel>
        <TrainNumberForm key={train} target="/train-schedule" initial={train} cta="View schedule" />
      </SearchPanel>
      <Section>
        <ApiResult
          state={state}
          onRetry={refresh}
          skeleton={<ResultSkeleton rows={8} />}
          idle={
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <EmptyState title="Timetable and route">
                Search by train number or name to see every stop with timings, distances and a route map.
              </EmptyState>
              <RecentList kinds={["schedule"]} />
            </div>
          }
        >
          {(s, meta, refreshing) => (
            <div className="space-y-6">
              <Summary s={s} meta={meta} refreshing={refreshing} refresh={refresh} />
              <Tabs label="Schedule view" value={tab} onChange={setTab} tabs={[{ value: "timetable", label: "Timetable" }, { value: "route", label: "Route & map" }]} />
              {tab === "timetable" ? <Timetable s={s} /> : <RouteOverview s={s} />}
            </div>
          )}
        </ApiResult>
      </Section>
    </>
  );
}

function Summary({ s, meta, refreshing, refresh }: { s: TrainSchedule; meta: ApiMeta; refreshing: boolean; refresh: () => void }) {
  const stops = s.stops.filter((x) => x.isStop).length;
  return (
    <>
      <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} />
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <TrainTitle number={s.trainNumber} name={s.trainName} sub={s.trainType} />
          <ShareButton title={`${s.trainNumber} schedule`} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Box label="Source" value={`${s.source.name ?? ""} (${s.source.code})`} />
          <Box label="Destination" value={`${s.destination.name ?? ""} (${s.destination.code})`} />
          <Box label="Total duration" value={fmtDuration(s.totalDurationMinutes)} />
          <Box label="Total distance" value={s.totalDistanceKm !== undefined ? `${Math.round(s.totalDistanceKm)} km` : "—"} />
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4"><p className="label !text-[10px]">Runs on</p><div className="mt-1"><RunDays days={s.runDays} /></div></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{stops} scheduled stops · All times are scheduled timetable times (IST). <Link className="font-medium text-ink underline decoration-signal decoration-2 underline-offset-4 transition-colors hover:decoration-ink" href={`/train-status?train=${s.trainNumber}`}>Check live running status →</Link></p>
      </Card>
    </>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4"><p className="label !text-[10px]">{label}</p><p className="mt-1 truncate text-sm font-semibold text-ink" title={value}>{value}</p></div>;
}

function Timetable({ s }: { s: TrainSchedule }) {
  const [onlyStops, setOnlyStops] = useState(true);
  const rows = onlyStops ? s.stops.filter((x) => x.isStop) : s.stops;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="font-display text-[22px] font-bold text-ink">Station-wise timetable</h3>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={onlyStops} onChange={(e) => setOnlyStops(e.target.checked)} /> Stops only</label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50/80 text-left text-[12.5px] font-medium text-slate-500">
            <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Station</th><th className="px-4 py-3">Arrival</th><th className="px-4 py-3">Departure</th><th className="px-4 py-3">Halt</th><th className="px-4 py-3">Day</th><th className="px-4 py-3 text-right">Distance</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((x) => (
              <tr key={x.seq} className={cx(!x.isStop && "text-slate-400")}>
                <td className="px-4 py-2.5 tabular-nums text-slate-500">{x.seq}</td>
                <td className="px-4 py-2.5"><Link href={`/railway-stations/${x.code}`} className="font-medium text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4">{x.name}</Link> <span className="font-mono text-xs text-slate-500">{x.code}</span>{x.platform && <span className="ml-1 text-xs text-slate-400">PF {x.platform}</span>}</td>
                <td className="px-4 py-2.5 tabular-nums">{x.arrival ?? <span className="text-slate-400">Starts</span>}</td>
                <td className="px-4 py-2.5 tabular-nums">{x.departure ?? <span className="text-slate-400">Ends</span>}</td>
                <td className="px-4 py-2.5 tabular-nums">{x.arrival && x.departure && x.haltMinutes !== undefined ? `${x.haltMinutes} min` : "—"}</td>
                <td className="px-4 py-2.5">{x.day ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{x.distanceKm !== undefined ? `${Math.round(x.distanceKm)} km` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function bearingLabel(a: ScheduleStop, b: ScheduleStop): string | null {
  if (a.lat === undefined || a.lon === undefined || b.lat === undefined || b.lon === undefined) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return ["North", "North-east", "East", "South-east", "South", "South-west", "West", "North-west"][Math.round(deg / 45) % 8] + "bound";
}

function RouteOverview({ s }: { s: TrainSchedule }) {
  const stops = s.stops.filter((x) => x.isStop);
  const withCoords = stops.filter((x) => x.lat !== undefined && x.lon !== undefined);
  // Only draw a map when the route endpoints and a reasonable share of stops have known positions
  const mapReliable = withCoords.length >= 2 && withCoords.length / stops.length >= 0.5 && withCoords[0] === stops[0] && withCoords.at(-1) === stops.at(-1);
  const points = useMemo<MapPoint[]>(
    () => withCoords.map((x, i) => ({ lat: x.lat!, lon: x.lon!, label: `${x.name} (${x.code})`, kind: i === 0 ? "origin" : i === withCoords.length - 1 ? "destination" : "stop" })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s],
  );
  const path = useMemo(() => points.map((p) => [p.lat, p.lon] as [number, number]), [points]);
  const direction = bearingLabel(stops[0], stops[stops.length - 1]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card className="p-5">
        <h3 className="font-display text-[22px] font-bold text-ink">Route: {stops[0]?.code} → {stops.at(-1)?.code}</h3>
        <p className="text-sm text-slate-600">{stops.length} stops · {s.totalDistanceKm !== undefined ? `${Math.round(s.totalDistanceKm)} km` : "distance not reported"}{direction ? ` · ${direction} overall` : ""}</p>
        <ol className="relative mt-5">
          {stops.map((x, i) => {
            const prev = stops[i - 1];
            const leg = prev && x.distanceKm !== undefined && prev.distanceKm !== undefined ? x.distanceKm - prev.distanceKm : undefined;
            const end = i === 0 || i === stops.length - 1;
            return (
              <li key={x.seq} className="relative pb-5 pl-8 last:pb-0">
                {i < stops.length - 1 && <span className="absolute left-[7px] top-4 h-full w-0.5 bg-brand-200" aria-hidden />}
                <span className={cx("absolute left-0 top-1 size-4 rounded-full border-2", end ? "border-ink bg-ink" : "border-ink bg-white")} aria-hidden />
                {leg !== undefined && <span className="absolute -top-3 left-6 text-[10px] text-slate-400">+{Math.round(leg)} km</span>}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink">{x.name} <span className="font-mono text-xs text-slate-500">{x.code}</span></p>
                  <p className="text-xs tabular-nums text-slate-600">
                    {x.arrival ?? "—"} → {x.departure ?? "—"}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {x.distanceKm !== undefined ? `${Math.round(x.distanceKm)} km from source` : ""}
                  {x.arrival && x.departure && x.haltMinutes ? ` · halt ${x.haltMinutes} min` : ""}
                  {x.day ? ` · day ${x.day}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      </Card>
      <div className="space-y-2 lg:sticky lg:top-20 lg:self-start">
        {mapReliable ? (
          <>
            <RouteMap points={points} path={path} heightClass="h-[28rem]" />
            <p className="text-xs text-slate-500">
              Stations are joined by straight lines between known station positions. This is an approximation, not the exact track.
              {withCoords.length < stops.length ? ` ${stops.length - withCoords.length} stops without known coordinates are omitted from the map.` : ""}
            </p>
          </>
        ) : (
          <div className="rounded-[20px] border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
            A map isn&apos;t shown because reliable coordinates aren&apos;t available for enough stations on this route. The full station list is on the left.
          </div>
        )}
      </div>
    </div>
  );
}
