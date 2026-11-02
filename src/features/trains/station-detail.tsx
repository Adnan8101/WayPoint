"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Station, StationBoard, StationBoardTrain, StationTimetable } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { todayIST } from "@/lib/dates";
import { cx, fmtDelay } from "@/lib/format";
import { Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton, Skeleton, TimeLegend } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, SelectField, ShareButton, Tabs, TimeTag, inputClass } from "@/components/ui";
import { LocalClock } from "@/components/local-clock";
import { DateField } from "@/components/date-field";

const RouteMap = dynamic(() => import("@/components/route-map"), { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> });

export function StationDetail({ code, station }: { code: string; station: Station | null }) {
  const [tab, setTab] = useState<"arrivals" | "departures">("departures");
  const [hours, setHours] = useState("4");
  const req = useMemo(() => ({ url: `/api/stations/${code}/board?hours=${hours}` }), [code, hours]);
  const { state, refresh } = useApi<StationBoard>(req);
  const hasSpot = station?.lat !== undefined && station?.lon !== undefined;
  const points = useMemo(() => (station && hasSpot ? [{ lat: station.lat!, lon: station.lon!, label: station.code, kind: "origin" as const }] : []), [station, hasSpot]);

  useEffect(() => {
    addRecent({ kind: "station", label: station ? `${station.code} · ${station.name}` : code, href: `/railway-stations/${code}` });
  }, [code, station]);

  return (
    <>
      <Section className="relative -mt-20">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-5">
            <h2 className="font-semibold">Station details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-slate-500">Station code</dt><dd className="font-mono font-semibold">{code}</dd></div>
              <div><dt className="text-slate-500">Local time (IST)</dt><dd className="font-medium"><LocalClock timeZone="Asia/Kolkata" /></dd></div>
              {station && (
                <>
                  <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{station.name}</dd></div>
                  <div><dt className="text-slate-500">State</dt><dd className="font-medium">{station.state ?? "—"}</dd></div>
                  {hasSpot && <div className="col-span-2"><dt className="text-slate-500">Approximate location</dt><dd className="font-medium tabular-nums">{station.lat!.toFixed(3)}, {station.lon!.toFixed(3)}</dd></div>}
                </>
              )}
              <div className="col-span-2"><dt className="text-slate-500">Platforms</dt><dd className="text-slate-700">Platform numbers appear on individual trains below when the provider reports them.</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <ShareButton title={`${station?.name ?? code} arrivals & departures`} />
              <Link href={`/trains-between-stations?from=${code}`} className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3.5 text-[13.5px] font-medium text-slate-700 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-ink hover:text-ink">Trains from {code}</Link>
            </div>
          </Card>
          {hasSpot ? <RouteMap points={points} path={[]} heightClass="h-56 lg:h-full min-h-56" /> : <div />}
        </div>
      </Section>
      <Section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-[26px] font-bold text-ink">Train information</h2>
          <div className="flex flex-wrap items-end gap-3">
            <SelectField id="st-hours" label="Window" value={hours} onChange={setHours} options={[{ value: "2", label: "Next 2 hours" }, { value: "4", label: "Next 4 hours" }, { value: "8", label: "Next 8 hours" }]} />
            <Tabs label="Station board" value={tab} onChange={setTab} tabs={[{ value: "departures", label: "Departures" }, { value: "arrivals", label: "Arrivals" }]} />
          </div>
        </div>
        <ApiResult state={state} onRetry={refresh} skeleton={<ResultSkeleton rows={8} />}>
          {(board, meta, refreshing) => (
            <div className="space-y-4">
              <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} />
              <Board trains={board[tab]} kind={tab} />
              <TimeLegend />
              <p className="text-[12.5px] text-slate-500">A dashed platform number is provisional and may still change.</p>
            </div>
          )}
        </ApiResult>
      </Section>
      <Timetable code={code} />
    </>
  );
}

const PAGE = 40;

/** Every train calling here on a given day, from the published timetable */
function Timetable({ code }: { code: string }) {
  const [date, setDate] = useState(todayIST());
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const req = useMemo(() => ({ url: `/api/stations/${code}/timetable?date=${date}` }), [code, date]);
  const { state, refresh } = useApi<StationTimetable>(req);

  return (
    <Section className="mt-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Published timetable</p>
          <h2 className="font-display mt-2 text-[28px] font-bold text-ink">Every train today</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <DateField id="tt-date" label="Day" value={date} onChange={(v) => { setDate(v); setLimit(PAGE); }} min={todayIST()} max={todayIST(6)} className="w-64" />
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] font-medium uppercase leading-5 tracking-[0.1em] text-slate-500">Filter</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number, name or station" className={cx(inputClass(), "w-60")} />
          </label>
        </div>
      </div>
      <ApiResult state={state} onRetry={refresh} skeleton={<ResultSkeleton rows={8} />}>
        {(tt) => {
          const s = q.trim().toLowerCase();
          const rows = tt.trains.filter((t) => !s || `${t.trainNumber} ${t.trainName} ${t.from} ${t.to}`.toLowerCase().includes(s));
          if (!rows.length) return <EmptyState title="No trains match">Try a different train number, name or station code.</EmptyState>;
          return (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50/80 text-left text-[12.5px] font-medium text-slate-500">
                    <tr><th className="px-4 py-3">Arr</th><th className="px-4 py-3">Dep</th><th className="px-4 py-3">Train</th><th className="px-4 py-3">From → To</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Runs on</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, limit).map((t, i) => (
                      <tr key={`${t.trainNumber}-${i}`} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600">{t.arrival ?? <span className="text-slate-300">Starts</span>}</td>
                        <td className="px-4 py-2.5 font-mono font-semibold tabular-nums text-ink">{t.departure ?? <span className="font-normal text-slate-300">Ends</span>}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/train-status?train=${t.trainNumber}`} className="font-mono font-semibold text-ink hover:underline">{t.trainNumber}</Link>
                          <div className="max-w-[16rem] truncate text-xs text-slate-500">{t.trainName}</div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{t.from} → {t.to}</td>
                        <td className="px-4 py-2.5 text-xs capitalize text-slate-500">{t.trainType?.toLowerCase() ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{t.runDays.length === 7 ? "Daily" : t.runDays.map((d) => d.slice(0, 2)).join(" ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-[13px] text-slate-500">
                <span>{Math.min(limit, rows.length)} of {rows.length} trains</span>
                {rows.length > limit && (
                  <button type="button" onClick={() => setLimit(limit + PAGE * 2)} className="rounded-full bg-ink px-4 py-2 font-semibold text-white transition-colors hover:bg-signal hover:text-ink">Show more</button>
                )}
              </div>
            </div>
          );
        }}
      </ApiResult>
    </Section>
  );
}

function Board({ trains, kind }: { trains: StationBoardTrain[]; kind: "arrivals" | "departures" }) {
  if (!trains.length) return <EmptyState title={`No ${kind} reported in this window`} />;
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-slate-50/80 text-left text-[12.5px] font-medium text-slate-500">
          <tr><th className="px-4 py-3">Train</th><th className="px-4 py-3">From → To</th><th className="px-4 py-3">Scheduled</th><th className="px-4 py-3">Expected</th><th className="px-4 py-3">Delay</th><th className="px-4 py-3">Platform</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {trains.map((t, i) => {
            const delay = fmtDelay(t.delayMinutes);
            const sched = kind === "arrivals" ? t.scheduledArrival : t.scheduledDeparture ?? t.scheduledArrival;
            const exp = kind === "arrivals" ? t.expectedArrival : t.expectedDeparture ?? t.expectedArrival;
            return (
              <tr key={`${t.trainNumber}-${i}`}>
                <td className="px-4 py-2.5">
                  <Link href={`/train-status?train=${t.trainNumber}`} className="font-mono font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 transition-colors hover:decoration-ink">{t.trainNumber}</Link>
                  <div className="max-w-[14rem] truncate text-xs text-slate-600">{t.trainName}</div>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{t.source ?? "—"} → {t.destination ?? "—"}</td>
                <td className="px-4 py-2.5">{sched ? <TimeTag t={{ value: sched, kind: "scheduled" }} /> : "—"}</td>
                <td className="px-4 py-2.5"><TimeTag t={exp} /></td>
                <td className={cx("px-4 py-2.5 font-medium", delay.tone === "ok" && "text-brand-700", delay.tone === "warn" && "text-amber-700", delay.tone === "bad" && "text-red-700")}>{delay.text}</td>
                <td className="px-4 py-2.5">
                  {t.platform ? (
                    <span
                      title={t.platformProvisional ? "Provisional: may change" : "Platform"}
                      className={cx("inline-grid min-w-8 place-items-center rounded-lg px-2 py-1 font-mono text-[13px] font-bold", t.platformProvisional ? "border border-dashed border-amber-400 text-amber-800" : "bg-ink text-signal")}
                    >
                      {t.platform}
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
