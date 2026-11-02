"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ApiMeta, TrainBetween } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { todayIST } from "@/lib/dates";
import { cx, fmtDate, fmtDuration } from "@/lib/format";
import { TrainsBetweenForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, CopyButton, SelectField, ShareButton } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import { RunDays } from "./train-parts";

export function BetweenView() {
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const date = params.get("date") ?? (from && to ? todayIST() : "");
  const req = useMemo(
    () => (from && to && date ? { url: `/api/trains/between?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}` } : null),
    [from, to, date],
  );
  const { state, refresh } = useApi<TrainBetween[]>(req);

  useEffect(() => {
    if (state.status === "success") addRecent({ kind: "between", label: `${from} → ${to} · ${fmtDate(date, { day: "numeric", month: "short" })}`, href: `/trains-between-stations?from=${from}&to=${to}&date=${date}` });
  }, [state.status, from, to, date]);

  return (
    <>
      <SearchPanel>
        <TrainsBetweenForm key={`${from}-${to}-${date}`} initial={{ from, to, date: date || undefined }} />
      </SearchPanel>
      <Section>
        <ApiResult
          state={state}
          onRetry={refresh}
          skeleton={<ResultSkeleton rows={6} />}
          idle={
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <EmptyState art="between" title="Find trains between any two stations">Search by station name or code. Results show timings, duration, running days and available classes.</EmptyState>
              <RecentList kinds={["between"]} />
            </div>
          }
        >
          {(data, meta, refreshing) => <Results data={data} meta={meta} refreshing={refreshing} refresh={refresh} from={from} to={to} date={date} />}
        </ApiResult>
      </Section>
    </>
  );
}

const SLOTS = [
  { value: "all", label: "Any time" },
  { value: "0", label: "00:00 – 06:00" },
  { value: "6", label: "06:00 – 12:00" },
  { value: "12", label: "12:00 – 18:00" },
  { value: "18", label: "18:00 – 24:00" },
];
const inSlot = (t: string, slot: string) => slot === "all" || (t && Math.floor(Number(t.slice(0, 2)) / 6) * 6 === Number(slot));

function Results({ data, meta, refreshing, refresh, from, to, date }: { data: TrainBetween[]; meta: ApiMeta; refreshing: boolean; refresh: () => void; from: string; to: string; date: string }) {
  const [dep, setDep] = useState("all");
  const [arr, setArr] = useState("all");
  const [type, setType] = useState("all");
  const [cls, setCls] = useState("all");
  const [maxDur, setMaxDur] = useState("all");
  const [sort, setSort] = useState<"dep" | "arr" | "dur">("dep");

  const types = useMemo(() => [...new Set(data.map((t) => t.trainType).filter(Boolean) as string[])].sort(), [data]);
  const classes = useMemo(() => [...new Set(data.flatMap((t) => t.classes))].sort(), [data]);
  const rows = useMemo(
    () =>
      data
        .filter((t) => inSlot(t.departure, dep) && inSlot(t.arrival, arr))
        .filter((t) => type === "all" || t.trainType === type)
        .filter((t) => cls === "all" || t.classes.includes(cls))
        .filter((t) => maxDur === "all" || (t.durationMinutes ?? Infinity) <= Number(maxDur) * 60)
        .sort((a, b) => (sort === "dur" ? (a.durationMinutes ?? 1e9) - (b.durationMinutes ?? 1e9) : (sort === "dep" ? a.departure : a.arrival).localeCompare(sort === "dep" ? b.departure : b.arrival))),
    [data, dep, arr, type, cls, maxDur, sort],
  );
  const reset = () => { setDep("all"); setArr("all"); setType("all"); setCls("all"); setMaxDur("all"); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[30px] font-bold text-ink">{data[0]?.from.name ?? from} <span className="text-signal">→</span> {data[0]?.to.name ?? to}</h2>
          <p className="text-sm text-slate-600">{rows.length} of {data.length} trains · {fmtDate(date, { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <ShareButton title={`Trains from ${from} to ${to}`} />
      </div>
      <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Filters" className="space-y-3 rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between"><h3 className="font-display text-[22px] font-bold text-ink">Filters</h3><button type="button" onClick={reset} className="text-xs font-medium text-brand-700">Reset</button></div>
          <SelectField id="f-sort" label="Sort by" value={sort} onChange={(v) => setSort(v as typeof sort)} options={[{ value: "dep", label: "Departure" }, { value: "arr", label: "Arrival" }, { value: "dur", label: "Duration" }]} />
          <SelectField id="f-dep" label="Departure time" value={dep} onChange={setDep} options={SLOTS} />
          <SelectField id="f-arr" label="Arrival time" value={arr} onChange={setArr} options={SLOTS} />
          <SelectField id="f-type" label="Train type" value={type} onChange={setType} options={[{ value: "all", label: "All types" }, ...types.map((t) => ({ value: t, label: t }))]} />
          <SelectField id="f-dur" label="Journey duration" value={maxDur} onChange={setMaxDur} options={[{ value: "all", label: "Any duration" }, ...[6, 12, 18, 24, 36].map((h) => ({ value: String(h), label: `Up to ${h} hours` }))]} />
          <SelectField id="f-cls" label="Travel class" value={cls} onChange={setCls} options={[{ value: "all", label: "All classes" }, ...classes.map((c) => ({ value: c, label: c }))]} />
        </aside>
        <div className="space-y-3">
          {rows.length === 0 && <EmptyState title="No trains match these filters"><button type="button" onClick={reset} className="font-medium text-brand-700 underline">Reset filters</button></EmptyState>}
          {rows.map((t) => (
            <Card key={t.trainNumber} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-xs font-bold text-white">{t.trainNumber}</span>
                    <CopyButton value={t.trainNumber} label="train number" />
                    <h3 className="truncate font-semibold text-ink">{t.trainName}</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{t.trainType ? `${t.trainType} · ` : ""}{t.source && t.destination ? `${t.source.code} → ${t.destination.code}` : ""}</p>
                </div>
                <RunDays days={t.runDays} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div><p className="font-mono text-xl font-bold tabular-nums text-ink">{t.departure || "—"}</p><p className="text-xs text-slate-500">{t.from.name ?? t.from.code} ({t.from.code})</p></div>
                <div className="flex-1 text-center text-xs text-slate-500">
                  <p>{fmtDuration(t.durationMinutes)}</p>
                  <div className="my-1 h-px bg-slate-300" />
                  <p>{t.intermediateStops !== undefined ? `${t.intermediateStops} stops` : " "}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-bold tabular-nums text-ink">
                    {t.arrival || "—"}
                    {t.arrivalDayOffset ? <sup className="ml-0.5 rounded bg-signal-soft px-1 font-mono text-[10px] font-bold text-amber-800">+{t.arrivalDayOffset}</sup> : null}
                  </p>
                  <p className="text-xs text-slate-500">{t.to.name ?? t.to.code} ({t.to.code})</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {t.estimatedFare ? <span className="rounded-full bg-ink px-2.5 py-1 font-mono text-[12px] font-bold text-signal" title="Indicative fare from the provider">from ₹{t.estimatedFare.toLocaleString("en-IN")}</span> : null}
                  {t.distanceKm ? <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[12px] text-slate-600">{t.distanceKm.toLocaleString("en-IN")} km</span> : null}
                  {t.classes.map((c) => <span key={c} className={cx("rounded-md border px-1.5 py-0.5 text-xs font-semibold", cls === c ? "border-ink bg-signal-soft text-ink" : "border-slate-200 text-slate-600")}>{c}</span>)}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                  <Link href={`/train-schedule?train=${t.trainNumber}`} className="text-slate-600 hover:text-ink hover:underline">Schedule</Link>
                  <Link href={`/train-status?train=${t.trainNumber}`} className="text-slate-600 hover:text-ink hover:underline">Live status</Link>
                  <Link
                    href={`/seat-availability?${new URLSearchParams({ train: t.trainNumber, from: t.from.code, to: t.to.code, date })}`}
                    className="rounded-full bg-ink px-3.5 py-1.5 text-white transition-colors hover:bg-signal hover:text-ink"
                  >
                    Seats & fare
                  </Link>
                </div>
              </div>
            </Card>
          ))}
          <p className="text-xs text-slate-500">Times are scheduled timetable times. Fares shown are indicative; open Seats & fare for availability and the exact fare by class.</p>
        </div>
      </div>
    </div>
  );
}
