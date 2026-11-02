"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RunningStation, TrainRunningStatus } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { todayIST } from "@/lib/dates";
import { cx, fmtDate, fmtDelay } from "@/lib/format";
import { TrainStatusForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton, TimeLegend } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, ShareButton, TimeTag } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import { POPULAR_TRAINS } from "@/lib/data/stations";
import { ProgressBar, TrainTitle } from "./train-parts";

export function TrainStatusView() {
  const params = useSearchParams();
  const train = params.get("train") ?? "";
  const date = params.get("date") ?? (train ? todayIST() : "");
  const req = useMemo(() => (train ? { url: `/api/trains/live?train=${encodeURIComponent(train)}&date=${encodeURIComponent(date)}` } : null), [train, date]);
  const { state, refresh } = useApi<TrainRunningStatus>(req);

  useEffect(() => {
    if (state.status === "success") {
      addRecent({ kind: "train", label: `${state.data.trainNumber} ${state.data.trainName}`.trim(), href: `/train-status?train=${train}&date=${date}` });
    }
  }, [state, train, date]);

  return (
    <>
      <SearchPanel>
        <TrainStatusForm key={`${train}-${date}`} initial={{ train, date: date || undefined }} />
      </SearchPanel>
      <Section>
        <ApiResult
          state={state}
          onRetry={refresh}
          skeleton={<ResultSkeleton rows={8} />}
          idle={
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <EmptyState title="Where is my train?">Enter a train number or name and the date the train started its journey to see its live location and delays.</EmptyState>
                <Card className="p-5">
                  <h2 className="font-semibold text-slate-900">Popular trains</h2>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {POPULAR_TRAINS.map((t) => (
                      <li key={t.number}>
                        <Link href={`/train-status?train=${t.number}&date=${todayIST()}`} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-50">
                          <span className="font-mono font-semibold text-brand-700">{t.number}</span> <span className="truncate text-slate-700">{t.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
              <RecentList kinds={["train"]} />
            </div>
          }
        >
          {(d, meta, refreshing) => <RunningResult d={d} meta={meta} refreshing={refreshing} refresh={refresh} />}
        </ApiResult>
      </Section>
    </>
  );
}

function RunningResult({ d, meta, refreshing, refresh }: { d: TrainRunningStatus; meta: import("@/lib/types").ApiMeta; refreshing: boolean; refresh: () => void }) {
  const delay = fmtDelay(d.delayMinutes);
  const [onlyStops, setOnlyStops] = useState(true);
  const currentRef = useRef<HTMLTableRowElement>(null);
  const stations = onlyStops ? d.stations.filter((s) => s.isStop || s.state === "current") : d.stations;
  const passedCount = d.stations.filter((s) => s.state === "passed").length;
  const progress = d.progress ?? (d.stations.length ? passedCount / Math.max(1, d.stations.length - 1) : undefined);
  const finished = d.stations.length > 0 && d.stations.every((s) => s.state === "passed");

  return (
    <div className="space-y-6">
      <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={20 * 60_000} providerLabel="Train position reported" />
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <TrainTitle
            number={d.trainNumber}
            name={d.trainName}
            sub={<>{d.source.name ?? d.source.code} ({d.source.code}) → {d.destination.name ?? d.destination.code} ({d.destination.code}){d.trainType ? ` · ${d.trainType}` : ""} · Started {fmtDate(d.journeyDate)}</>}
          />
          <ShareButton title={`${d.trainNumber} running status`} />
        </div>

        <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/70 p-5">
          <p className="label">Right now</p>
          <p className="mt-1 text-[22px] font-semibold tracking-tight text-ink">{d.currentLocation ?? d.statusMessage ?? (finished ? "Reached destination" : "Location not reported")}</p>
          {d.statusMessage && d.currentLocation && <p className="text-sm text-slate-600">{d.statusMessage}</p>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Delay" value={delay.text} tone={delay.tone} />
          <Stat label="Last reported station" value={d.lastReportedStation ? `${d.lastReportedStation.name} (${d.lastReportedStation.code})` : "—"} />
          <Stat label="Next station" value={d.nextStation ? `${d.nextStation.name} (${d.nextStation.code})` : finished ? "—" : "Not reported"} />
          <div className=" rounded-xl bg-slate-50 p-3.5">
            <p className="text-xs text-slate-500">Expected at next station</p>
            <div className="mt-1 space-y-0.5 text-sm">
              {d.nextStation?.eta ? <div>Arr <TimeTag t={d.nextStation.eta} /></div> : null}
              {d.nextStation?.etd ? <div>Dep <TimeTag t={d.nextStation.etd} /></div> : null}
              {!d.nextStation?.eta && !d.nextStation?.etd && <span className="text-slate-400">—</span>}
            </div>
          </div>
        </div>

        {progress !== undefined && (
          <div className="mt-5">
            <ProgressBar value={progress} label={d.coveredDistanceKm !== undefined && d.totalDistanceKm ? `${Math.round(d.coveredDistanceKm)} of ${Math.round(d.totalDistanceKm)} km covered` : "Journey progress"} />
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-ink">Station-wise running status</h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={onlyStops} onChange={(e) => setOnlyStops(e.target.checked)} className="size-4 accent-brand-600" /> Stops only
            </label>
            <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              Jump to current
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50/80 text-left text-[12.5px] font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Station</th>
                <th className="px-4 py-3">Sched. arr</th>
                <th className="px-4 py-3">Actual / exp. arr</th>
                <th className="px-4 py-3">Sched. dep</th>
                <th className="px-4 py-3">Actual / exp. dep</th>
                <th className="px-4 py-3">Delay</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s, i) => <StationRow key={`${s.code}-${i}`} s={s} rowRef={s.state === "current" ? currentRef : undefined} />)}
            </tbody>
          </table>
        </div>
      </Card>
      <TimeLegend />
    </div>
  );
}

function StationRow({ s, rowRef }: { s: RunningStation; rowRef?: React.Ref<HTMLTableRowElement> }) {
  const delay = fmtDelay(s.delayMinutes);
  return (
    <tr ref={rowRef} className={cx("border-b border-slate-100", s.state === "current" && "bg-amber-50", s.state === "passed" && "text-slate-500")}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className={cx("size-3 shrink-0 rounded-full border-2", s.state === "passed" && "border-brand-600 bg-brand-600", s.state === "current" && "border-amber-500 bg-amber-400 ring-4 ring-amber-100", s.state === "upcoming" && "border-slate-200 bg-white")} aria-hidden />
          <div>
            <p className={cx("font-medium", s.state === "upcoming" ? "text-slate-900" : s.state === "current" ? "text-slate-900" : "")}>{s.name}</p>
            <p className="text-xs text-slate-500">{s.code}{s.platform ? ` · PF ${s.platform}` : ""}{s.distanceKm !== undefined ? ` · ${Math.round(s.distanceKm)} km` : ""}{s.day ? ` · Day ${s.day}` : ""}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 tabular-nums">{s.scheduledArrival ?? "—"}</td>
      <td className="px-4 py-2.5"><TimeTag t={s.actualArrival} /></td>
      <td className="px-4 py-2.5 tabular-nums">{s.scheduledDeparture ?? "—"}</td>
      <td className="px-4 py-2.5"><TimeTag t={s.actualDeparture} /></td>
      <td className={cx("px-4 py-2.5 font-medium", delay.tone === "ok" && "text-emerald-700", delay.tone === "warn" && "text-amber-700", delay.tone === "bad" && "text-red-700")}>{delay.text}</td>
      <td className="px-4 py-2.5 text-xs font-semibold uppercase">
        {s.state === "passed" ? <span className="text-slate-500">Passed</span> : s.state === "current" ? <span className="text-amber-700">Current</span> : <span className="text-brand-700">Upcoming</span>}
      </td>
    </tr>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "none" }) {
  return (
    <div className=" rounded-xl bg-slate-50 p-3.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cx("mt-1 text-sm font-semibold", tone === "ok" && "text-emerald-700", tone === "warn" && "text-amber-700", tone === "bad" && "text-red-700", !tone && "text-slate-900")}>{value}</p>
    </div>
  );
}
